import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoadingService } from '../../../services/loading';
import { PortalService, Prospecto, DatosProspecto, EstadoProspecto, ESPECIALIDADES } from '../../../services/portal';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

type Filtro = 'TODOS' | EstadoProspecto;

// Posibles matrículas: personas que dejaron sus datos en la landing. Aquí el
// administrador las revisa y marca a quién ya contactó.
@Component({
  selector: 'app-prospectos',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe],
  templateUrl: './prospectos.html',
  styleUrl: './prospectos.scss'
})
export class Prospectos implements OnInit {
  especialidades = ESPECIALIDADES;
  prospectos: Prospecto[] = [];
  cargado = false;
  filtro: Filtro = 'TODOS';

  // Alta manual (alguien que llamó o llegó en persona).
  formularioAbierto = false;
  nuevo: DatosProspecto = this.vacio();

  constructor(
    private portalService: PortalService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargar();
  }

  private vacio(): DatosProspecto {
    return { nombres: '', apellidos: '', telefono: '', especialidadInteres: '' };
  }

  // Ejecuta una petición con el indicador de carga global.
  private conCarga<T>(peticion: Observable<T>): Observable<T> {
    this.loadingService.mostrar();
    return peticion.pipe(finalize(() => this.loadingService.ocultar()));
  }

  private avisarError(e: any, porDefecto: string) {
    this.snackBar.open(e?.error?.error || porDefecto, 'OK', { duration: 4000 });
  }

  cargar() {
    this.conCarga(this.portalService.listarProspectos()).subscribe({
      next: (prospectos) => {
        this.prospectos = prospectos;
        this.cargado = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargado = true;
        this.cdr.detectChanges();
        this.avisarError(e, 'Error al cargar los prospectos');
      }
    });
  }

  get pendientes(): number {
    return this.prospectos.filter((p) => p.estado === 'PENDIENTE').length;
  }

  get visibles(): Prospecto[] {
    return this.filtro === 'TODOS' ? this.prospectos : this.prospectos.filter((p) => p.estado === this.filtro);
  }

  filtrar(filtro: Filtro) {
    this.filtro = filtro;
  }

  // Enlace de WhatsApp: un celular ecuatoriano 09XXXXXXXX pasa a 5939XXXXXXXX.
  whatsapp(p: Prospecto): string {
    let numero = p.telefono.replace(/\D/g, '');
    if (numero.startsWith('0')) numero = `593${numero.slice(1)}`;
    const mensaje = `Hola ${p.nombres}, te escribimos del Centro de Formación Artesanal Guadalupana ` +
      `por tu interés en ${p.especialidadInteres}.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  }

  cambiarEstado(p: Prospecto) {
    const estado: EstadoProspecto = p.estado === 'PENDIENTE' ? 'CONTACTADO' : 'PENDIENTE';
    this.conCarga(this.portalService.cambiarEstadoProspecto(p.id, estado)).subscribe({
      next: () => {
        p.estado = estado;
        this.cdr.detectChanges();
        this.snackBar.open(estado === 'CONTACTADO' ? 'Marcado como contactado' : 'Devuelto a pendiente', 'OK', { duration: 3000 });
      },
      error: (e) => this.avisarError(e, 'Error al actualizar el prospecto')
    });
  }

  eliminar(p: Prospecto) {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Eliminar prospecto',
        mensaje: `¿Eliminar los datos de ${p.nombres} ${p.apellidos}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        icon: 'delete'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // El indicador de carga de los DELETE lo pone el interceptor global.
      this.portalService.eliminarProspecto(p.id).subscribe({
        next: () => {
          this.prospectos = this.prospectos.filter((x) => x.id !== p.id);
          this.cdr.detectChanges();
          this.snackBar.open('Prospecto eliminado', 'OK', { duration: 3000 });
        },
        error: (e) => this.avisarError(e, 'Error al eliminar el prospecto')
      });
    });
  }

  alternarFormulario() {
    this.formularioAbierto = !this.formularioAbierto;
    this.nuevo = this.vacio();
  }

  get nuevoValido(): boolean {
    const n = this.nuevo;
    return n.nombres.trim().length >= 2 && n.apellidos.trim().length >= 2 &&
      n.telefono.trim().length >= 7 && !!n.especialidadInteres;
  }

  guardarNuevo() {
    if (!this.nuevoValido) return;
    this.conCarga(this.portalService.crearProspecto(this.nuevo)).subscribe({
      next: (prospecto) => {
        this.prospectos = [prospecto, ...this.prospectos];
        this.formularioAbierto = false;
        this.nuevo = this.vacio();
        this.cdr.detectChanges();
        this.snackBar.open('Prospecto registrado', 'OK', { duration: 3000 });
      },
      error: (e) => this.avisarError(e, 'Error al registrar el prospecto')
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
