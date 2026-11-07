import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { AsistenciaService } from '../../../services/asistencia';
import { CursoService } from '../../../services/curso';
import { Title } from '@angular/platform-browser';
import { DialogService } from '../../../services/dialog';
import { NotificacionService } from '../../../services/notificacion';

@Component({
  selector: 'app-registrar-asistencia',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, DatePipe],
  templateUrl: './registrar-asistencia.html',
  styleUrl: './registrar-asistencia.scss'
})
export class RegistrarAsistencia implements OnInit {
  private dialogService = inject(DialogService);
  private notificacion = inject(NotificacionService);

  materiaId = 0;
  materia: any = null;
  matriculas: any[] = [];
  asistencias: any[] = [];
  loading = true;
  guardando = false;
  fecha = new Date().toISOString().split('T')[0];
  editandoId: number | null = null; // null = nuevo registro; con valor = editando ese registro

  // presentes[matriculaId] = true/false
  presentes: { [key: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private asistenciaService: AsistenciaService,
    private cursoService: CursoService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Asistencia');
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.cargarDatos();
  }

  // Los estudiantes se piden por la materia, no a través de sus tareas: antes, una
  // materia sin tareas mostraba la lista vacía y no se podía pasar lista.
  cargarDatos() {
    this.cursoService.obtenerEstudiantesMateria(this.materiaId).subscribe({
      next: ({ materia, matriculas }) => {
        this.materia = materia;
        this.matriculas = matriculas || [];
        this.marcarTodos();
        this.cargarAsistencias();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar los estudiantes de la materia', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  cargarAsistencias() {
    this.asistenciaService.getAsistenciasPorMateria(this.materiaId).subscribe({
      next: (asistencias) => {
        this.asistencias = asistencias;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  marcarTodos() {
    this.matriculas.forEach(m => {
      this.presentes[m.id] = true;
    });
  }

  desmarcarTodos() {
    this.matriculas.forEach(m => {
      this.presentes[m.id] = false;
    });
  }

  togglePresente(matriculaId: number) {
    this.presentes[matriculaId] = !this.presentes[matriculaId];
    this.cdr.detectChanges();
  }

  get totalPresentes(): number {
    return Object.values(this.presentes).filter(v => v).length;
  }

  get totalAusentes(): number {
    return Object.values(this.presentes).filter(v => !v).length;
  }

  guardar() {
    if (!this.fecha) {
      this.snackBar.open('Selecciona una fecha', 'OK', { duration: 3000 });
      return;
    }
    if (this.matriculas.length === 0) {
      this.snackBar.open('Este curso no tiene estudiantes con matrícula activa', 'OK', { duration: 3000 });
      return;
    }
    this.guardando = true;
    // Al editar, un estudiante sin registro de ese día (p. ej. matriculado después)
    // queda fuera salvo que el docente lo marque; en un registro nuevo están todos.
    const detalles = this.matriculas
      .filter(m => !this.editandoId || this.presentes[m.id] !== undefined)
      .map(m => ({
        matriculaId: m.id,
        presente: this.presentes[m.id] ?? true
      }));

    // Modo edición: actualizar el registro existente
    if (this.editandoId) {
      this.asistenciaService.actualizarAsistencia(this.editandoId, {
        fecha: this.fecha,
        detalles
      }).subscribe({
        next: () => {
          this.guardando = false;
          this.snackBar.open('Asistencia actualizada exitosamente', 'OK', { duration: 3000 });
          this.cancelarEdicion();
          this.cargarAsistencias();
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardando = false;
          this.snackBar.open('Error al actualizar asistencia', 'OK', { duration: 3000 });
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Modo creación
    this.asistenciaService.crearAsistencia({
      fecha: this.fecha,
      materiaId: this.materiaId,
      detalles
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.snackBar.open('Asistencia registrada exitosamente', 'OK', { duration: 3000 });
        this.cargarAsistencias();
        this.marcarTodos();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.guardando = false;
        this.snackBar.open(e?.error?.error || 'Error al registrar asistencia', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // Carga un registro del historial en el panel para reeditarlo
  editarAsistencia(asistencia: any) {
    this.editandoId = asistencia.id;
    const f = new Date(asistencia.fecha);
    this.fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    // Solo el estado guardado: quien no tiene registro ese día (p. ej. matriculado
    // después) aparece "Sin registro" en lugar de marcarse presente sin querer.
    this.presentes = {};
    (asistencia.detalles || []).forEach((d: any) => {
      this.presentes[d.matriculaId] = d.presente;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.fecha = new Date().toISOString().split('T')[0];
    this.marcarTodos();
  }

  async eliminarAsistencia(id: number) {
    const ok = await this.dialogService.confirm({
      titulo: 'Eliminar asistencia',
      mensaje: '¿Eliminar este registro de asistencia?',
      peligro: true
    });
    if (!ok) return;
    this.asistenciaService.eliminarAsistencia(id).subscribe({
      next: () => {
        this.notificacion.exito('Registro de asistencia eliminado');
        this.cargarAsistencias();
      },
      error: () => this.notificacion.error('Error al eliminar el registro')
    });
  }

  contarPresentes(asistencia: any): number {
    return asistencia.detalles?.filter((d: any) => d.presente)?.length || 0;
  }

  contarAusentes(asistencia: any): number {
    return asistencia.detalles?.filter((d: any) => !d.presente)?.length || 0;
  }

  volver() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (usuario.rol === 'PROFESOR') {
      this.router.navigate(['/profesor']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}