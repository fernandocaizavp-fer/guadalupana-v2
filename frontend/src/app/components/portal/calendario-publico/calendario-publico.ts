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
import { PortalService, EventoPublico, DatosEvento } from '../../../services/portal';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Eventos visibles para cualquier visitante (inicio de matrículas, ceremonias…).
// Las fechas son días completos: se guardan a medianoche UTC y se muestran en UTC.
@Component({
  selector: 'app-calendario-publico',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe],
  templateUrl: './calendario-publico.html',
  styleUrl: './calendario-publico.scss'
})
export class CalendarioPublico implements OnInit {
  eventos: EventoPublico[] = [];
  cargado = false;

  // Formulario: sirve para crear y, si `editando` tiene valor, para modificar.
  formularioAbierto = false;
  editando: EventoPublico | null = null;
  datos: DatosEvento = this.vacio();

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

  private vacio(): DatosEvento {
    return { titulo: '', fechaInicio: '', fechaFin: '', descripcion: '' };
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
    this.conCarga(this.portalService.listarCalendario()).subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.cargado = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargado = true;
        this.cdr.detectChanges();
        this.avisarError(e, 'Error al cargar el calendario');
      }
    });
  }

  // Un evento terminado ya no aparece en la página principal.
  finalizado(evento: EventoPublico): boolean {
    return evento.fechaFin.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }

  // Mes en español sin depender del idioma registrado en Angular.
  mesAnio(evento: EventoPublico): string {
    return MESES[Number(evento.fechaInicio.slice(5, 7)) - 1] + ' ' + evento.fechaInicio.slice(0, 4);
  }

  unSoloDia(evento: EventoPublico): boolean {
    return evento.fechaInicio.slice(0, 10) === evento.fechaFin.slice(0, 10);
  }

  nuevo() {
    this.editando = null;
    this.datos = this.vacio();
    this.formularioAbierto = true;
  }

  editar(evento: EventoPublico) {
    this.editando = evento;
    this.datos = {
      titulo: evento.titulo,
      fechaInicio: evento.fechaInicio.slice(0, 10),
      fechaFin: evento.fechaFin.slice(0, 10),
      descripcion: evento.descripcion || ''
    };
    this.formularioAbierto = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelar() {
    this.editando = null;
    this.datos = this.vacio();
    this.formularioAbierto = false;
  }

  get fechasInvertidas(): boolean {
    return !!this.datos.fechaInicio && !!this.datos.fechaFin && this.datos.fechaFin < this.datos.fechaInicio;
  }

  get valido(): boolean {
    return this.datos.titulo.trim().length > 0 && !!this.datos.fechaInicio && !this.fechasInvertidas;
  }

  guardar() {
    if (!this.valido) return;
    const datos: DatosEvento = {
      titulo: this.datos.titulo.trim(),
      fechaInicio: this.datos.fechaInicio,
      // Sin fecha de fin, el evento dura un solo día.
      fechaFin: this.datos.fechaFin || this.datos.fechaInicio,
      descripcion: this.datos.descripcion.trim()
    };
    const peticion: Observable<unknown> = this.editando
      ? this.portalService.actualizarEvento(this.editando.id, datos)
      : this.portalService.crearEvento(datos);
    const mensaje = this.editando ? 'Evento actualizado' : 'Evento agendado';

    this.conCarga(peticion).subscribe({
      next: () => {
        this.cancelar();
        this.snackBar.open(mensaje, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: (e) => this.avisarError(e, 'Error al guardar el evento')
    });
  }

  eliminar(evento: EventoPublico) {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Eliminar evento',
        mensaje: `¿Eliminar "${evento.titulo}" del calendario público?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        icon: 'delete'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // El indicador de carga de los DELETE lo pone el interceptor global.
      this.portalService.eliminarEvento(evento.id).subscribe({
        next: () => {
          this.eventos = this.eventos.filter((e) => e.id !== evento.id);
          if (this.editando?.id === evento.id) this.cancelar();
          this.cdr.detectChanges();
          this.snackBar.open('Evento eliminado', 'OK', { duration: 3000 });
        },
        error: (e) => this.avisarError(e, 'Error al eliminar el evento')
      });
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
