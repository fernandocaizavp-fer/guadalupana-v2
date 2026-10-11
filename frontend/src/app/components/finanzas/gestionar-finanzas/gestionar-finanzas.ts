import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CursoService } from '../../../services/curso';
import { LoadingService } from '../../../services/loading';
import {
  FinanzasService, ComprobantePendiente, EstudianteFinanzas, EstadoCuenta, Deuda, Comprobante,
  ETIQUETA_ESTADO, estadoVisible, dinero
} from '../../../services/finanzas';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';

@Component({
  selector: 'app-gestionar-finanzas',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe, FotoPerfil],
  templateUrl: './gestionar-finanzas.html',
  styleUrl: './gestionar-finanzas.scss'
})
export class GestionarFinanzas implements OnInit {
  @ViewChild('modalRechazo') modalRechazo!: TemplateRef<unknown>;

  etiquetas = ETIQUETA_ESTADO;
  estado = estadoVisible;
  dinero = dinero;

  // Bandeja: comprobantes en revisión de todos los cursos.
  pendientes: ComprobantePendiente[] = [];

  // Consulta por curso → estudiante.
  cursos: any[] = [];
  cursoId: number | null = null;
  estudiantes: EstudianteFinanzas[] = [];
  estudiantesCargados = false;
  seleccionado: EstudianteFinanzas | null = null;
  cuenta: EstadoCuenta | null = null;

  motivoRechazo = '';

  constructor(
    private finanzasService: FinanzasService,
    private cursoService: CursoService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarPendientes(true);
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('Error al cargar los cursos', 'OK', { duration: 3000 })
    });
  }

  // Ejecuta una petición con el indicador de carga global.
  private conCarga<T>(peticion: Observable<T>): Observable<T> {
    this.loadingService.mostrar();
    return peticion.pipe(finalize(() => this.loadingService.ocultar()));
  }

  private avisarError(e: any, porDefecto: string) {
    this.snackBar.open(e?.error?.error || porDefecto, 'OK', { duration: 4000 });
    this.cdr.detectChanges();
  }

  cargarPendientes(conIndicador = false) {
    const peticion = this.finanzasService.comprobantesPendientes();
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (pendientes) => {
        this.pendientes = pendientes;
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar los comprobantes por revisar')
    });
  }

  nombreCurso(c: ComprobantePendiente): string {
    return c.deuda.estudiante.matricula?.curso.ramaArtesanal || 'Sin curso';
  }

  onCurso() {
    this.seleccionado = null;
    this.cuenta = null;
    this.estudiantes = [];
    this.estudiantesCargados = false;
    if (this.cursoId === null) return;
    this.cargarEstudiantes(true);
  }

  private cargarEstudiantes(conIndicador = false) {
    if (this.cursoId === null) return;
    const peticion = this.finanzasService.estudiantesCurso(this.cursoId);
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (estudiantes) => {
        this.estudiantes = estudiantes;
        this.estudiantesCargados = true;
        // Mantiene abierto al estudiante seleccionado con sus totales al día.
        if (this.seleccionado) {
          this.seleccionado = estudiantes.find((e) => e.usuarioId === this.seleccionado!.usuarioId) || null;
        }
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar los estudiantes')
    });
  }

  abrirEstudiante(estudiante: EstudianteFinanzas) {
    if (this.seleccionado?.usuarioId === estudiante.usuarioId) {
      this.seleccionado = null;
      this.cuenta = null;
      return;
    }
    this.seleccionado = estudiante;
    this.cuenta = null;
    this.cargarCuenta(true);
  }

  private cargarCuenta(conIndicador = false) {
    if (!this.seleccionado) return;
    const peticion = this.finanzasService.estadoCuenta(this.seleccionado.usuarioId);
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (cuenta) => {
        this.cuenta = cuenta;
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar el estado de cuenta')
    });
  }

  // Tras cualquier cambio se refresca todo lo visible para no mostrar datos viejos.
  private refrescar() {
    this.cargarPendientes();
    this.cargarEstudiantes();
    this.cargarCuenta();
  }

  enRevision(deuda: Deuda): Comprobante | null {
    return deuda.comprobantes.find((c) => c.estado === 'EN_REVISION') || null;
  }

  // Último pago aprobado (para mostrar cómo se pagó un concepto ya cancelado).
  aprobado(deuda: Deuda): Comprobante | null {
    return deuda.comprobantes.find((c) => c.estado === 'APROBADO') || null;
  }

  aprobar(comprobanteId: number, concepto: string, estudiante: string) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        titulo: 'Aprobar comprobante',
        mensaje: `¿Confirmas que el comprobante de "${concepto}" de ${estudiante} es válido? El concepto quedará pagado.`,
        confirmText: 'Aprobar',
        cancelText: 'Cancelar',
        icon: 'check_circle'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.conCarga(this.finanzasService.aprobarComprobante(comprobanteId)).subscribe({
        next: () => {
          this.snackBar.open('Comprobante aprobado', 'OK', { duration: 3000 });
          this.refrescar();
        },
        error: (e) => {
          this.avisarError(e, 'Error al aprobar el comprobante');
          this.refrescar();
        }
      });
    });
  }

  rechazar(comprobanteId: number) {
    this.motivoRechazo = '';
    this.dialog.open(this.modalRechazo, { width: '440px', maxWidth: '95vw' })
      .afterClosed().subscribe((confirmado) => {
        if (!confirmado) return;
        this.conCarga(this.finanzasService.rechazarComprobante(comprobanteId, this.motivoRechazo.trim())).subscribe({
          next: () => {
            this.snackBar.open('Comprobante rechazado', 'OK', { duration: 3000 });
            this.refrescar();
          },
          error: (e) => {
            this.avisarError(e, 'Error al rechazar el comprobante');
            this.refrescar();
          }
        });
      });
  }

  pagoEfectivo(deuda: Deuda) {
    if (!this.seleccionado) return;
    const estudiante = `${this.seleccionado.apellidos} ${this.seleccionado.nombres}`;
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        titulo: 'Registrar pago en efectivo',
        mensaje: `¿Confirmas que ${estudiante} pagó ${dinero(deuda.saldo)} en efectivo por "${deuda.concepto}"? El concepto quedará pagado.`,
        confirmText: 'Registrar pago',
        cancelText: 'Cancelar',
        icon: 'payments'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.conCarga(this.finanzasService.registrarPagoEfectivo(deuda.id)).subscribe({
        next: () => {
          this.snackBar.open('Pago en efectivo registrado', 'OK', { duration: 3000 });
          this.refrescar();
        },
        error: (e) => {
          this.avisarError(e, 'Error al registrar el pago');
          this.refrescar();
        }
      });
    });
  }

  irAConceptos() {
    this.router.navigate(['/configuracion'], { fragment: 'finanzas' });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
