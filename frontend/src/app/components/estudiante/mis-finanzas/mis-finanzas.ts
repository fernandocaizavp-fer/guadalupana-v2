import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth';
import { LoadingService } from '../../../services/loading';
import {
  FinanzasService, Deuda, Comprobante, ResumenFinanzas, EstadoVisible,
  ETIQUETA_ESTADO, estadoVisible, dinero
} from '../../../services/finanzas';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const LIMITE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-mis-finanzas',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe],
  templateUrl: './mis-finanzas.html',
  styleUrl: './mis-finanzas.scss'
})
export class MisFinanzas implements OnInit {
  @ViewChild('modalComprobante') modalComprobante!: TemplateRef<unknown>;

  usuario: any;
  cargado = false;
  error = '';
  resumen: ResumenFinanzas = { saldoPendiente: 0, vencido: 0, pagado: 0, enRevision: 0 };
  deudas: Deuda[] = [];

  etiquetas = ETIQUETA_ESTADO;
  estado = estadoVisible;
  dinero = dinero;

  // Concepto para el que se está subiendo el comprobante.
  deudaSeleccionada: Deuda | null = null;
  archivoSeleccionado: File | null = null;
  errorArchivo = '';
  private dialogRef: MatDialogRef<unknown> | null = null;

  constructor(
    private authService: AuthService,
    private finanzasService: FinanzasService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loadingService.mostrar();
    this.finanzasService.estadoCuenta(this.usuario.id)
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: ({ deudas, ...resumen }) => {
          this.deudas = deudas;
          this.resumen = resumen;
          this.error = '';
          this.cargado = true;
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.error = e?.error?.error || 'No se pudo cargar tu estado de cuenta';
          this.cargado = true;
          this.cdr.detectChanges();
        }
      });
  }

  // Se puede subir comprobante si el concepto no está pagado ni tiene uno en revisión.
  puedeSubir(deuda: Deuda): boolean {
    const visible: EstadoVisible = estadoVisible(deuda);
    return visible === 'PENDIENTE' || visible === 'VENCIDO' || visible === 'RECHAZADO';
  }

  // Comprobante más reciente (la lista llega del más nuevo al más antiguo).
  ultimo(deuda: Deuda): Comprobante | null {
    return deuda.comprobantes[0] ?? null;
  }

  abrirModal(deuda: Deuda) {
    this.deudaSeleccionada = deuda;
    this.archivoSeleccionado = null;
    this.errorArchivo = '';
    this.dialogRef = this.dialog.open(this.modalComprobante, { width: '460px', maxWidth: '95vw' });
  }

  onArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorArchivo = '';
    this.archivoSeleccionado = null;
    if (!archivo) return;

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.errorArchivo = 'El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF.';
    } else if (archivo.size > LIMITE_BYTES) {
      this.errorArchivo = 'El archivo supera el tamaño máximo de 5 MB.';
    } else {
      this.archivoSeleccionado = archivo;
    }
  }

  enviarComprobante() {
    if (!this.deudaSeleccionada || !this.archivoSeleccionado) return;
    this.loadingService.mostrar();
    this.finanzasService.subirComprobante(this.deudaSeleccionada.id, this.archivoSeleccionado)
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: () => {
          this.dialogRef?.close();
          this.snackBar.open('Comprobante enviado. El centro lo revisará pronto.', 'OK', { duration: 4000 });
          this.cargar();
        },
        error: (e) => {
          this.errorArchivo = e?.error?.error || 'No se pudo enviar el comprobante';
          this.cdr.detectChanges();
        }
      });
  }

  volver() {
    this.router.navigate(['/estudiante']);
  }
}
