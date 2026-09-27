import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';
import { TareaService } from '../../../services/tarea';
import { CursoService } from '../../../services/curso';
import { NotaService } from '../../../services/nota';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-gestionar-tareas',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule, MatCheckboxModule, DatePipe],
  templateUrl: './gestionar-tareas.html',
  styleUrl: './gestionar-tareas.scss'
})
export class GestionarTareas implements OnInit {
  materiaId = 0;
  materia: any = null;
  tareas: any[] = [];
  loading = true;
  guardando = false;
  semestreSeleccionado = 1;
  editandoId: number | null = null; // null = creando; con valor = editando esa tarea
  mostrarAdjuntar = false; // El docente decide si adjunta documentos de apoyo

  nuevaTarea = {
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    semestre: 1
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tareaService: TareaService,
    private cursoService: CursoService,
    private snackBar: MatSnackBar,
    private notaService: NotaService,
    private cdr: ChangeDetectorRef
    
  ) {}

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.cargarTareas();
  }

  cargarTareas() {
    this.loading = true;
    this.tareaService.getTareasPorMateria(this.materiaId, this.semestreSeleccionado).subscribe({
      next: (tareas) => {
        this.tareas = tareas;
        if (tareas.length > 0) {
          this.materia = tareas[0].materia;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarAL14() {
    const lugarFecha = prompt('Ingresa el lugar y fecha (Ej: Riobamba, 20 de abril del 2026)');
    if (!lugarFecha) return;
    
    // Necesitamos el cursoId
    this.tareaService.getTareasPorMateria(this.materiaId).subscribe({
      next: (tareas) => {
        if (tareas.length === 0) {
          this.snackBar.open('No hay tareas para generar el reporte', 'OK', { duration: 3000 });
          return;
        }
        const cursoId = tareas[0].materia?.curso?.id;
        if (!cursoId) return;

        this.tareaService.descargarAL14(cursoId, lugarFecha, this.semestreSeleccionado).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AL14_semestre${this.semestreSeleccionado}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);
          },
          error: () => this.snackBar.open('Error al descargar AL14', 'OK', { duration: 3000 })
        });
      }
    });
  }

  cambiarSemestre(semestre: number) {
    this.semestreSeleccionado = semestre;
    this.cargarTareas();
  }

  guardarTarea() {
    if (!this.nuevaTarea.nombre || !this.nuevaTarea.fechaInicio) {
      this.snackBar.open('Nombre y fecha de inicio son obligatorios', 'OK', { duration: 3000 });
      return;
    }
    if (this.nuevaTarea.fechaFin && this.nuevaTarea.fechaFin < this.nuevaTarea.fechaInicio) {
      this.snackBar.open('La fecha límite no puede ser anterior a la de inicio', 'OK', { duration: 3500 });
      return;
    }
    this.guardando = true;

    // Modo edición: actualizar la tarea existente
    if (this.editandoId) {
      this.tareaService.actualizarTarea(this.editandoId, {
        nombre: this.nuevaTarea.nombre,
        descripcion: this.nuevaTarea.descripcion,
        fechaInicio: this.nuevaTarea.fechaInicio,
        fechaFin: this.nuevaTarea.fechaFin || null
      }).subscribe({
        next: () => {
          this.finalizarGuardado(this.editandoId!, 'Tarea actualizada exitosamente');
        },
        error: () => {
          this.guardando = false;
          this.snackBar.open('Error al actualizar tarea', 'OK', { duration: 3000 });
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Modo creación
    this.tareaService.crearTarea({
      ...this.nuevaTarea,
      semestre: this.semestreSeleccionado,
      materiaId: this.materiaId
    }).subscribe({
      next: (res: any) => {
        this.finalizarGuardado(res.tarea.id, 'Tarea creada exitosamente');
      },
      error: () => {
        this.guardando = false;
        this.snackBar.open('Error al crear tarea', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // Carga la tarea seleccionada en el formulario para editarla
  editarTarea(tarea: any) {
    this.editandoId = tarea.id;
    this.nuevaTarea = {
      nombre: tarea.nombre,
      descripcion: tarea.descripcion || '',
      fechaInicio: this.formatearFecha(tarea.fechaInicio || tarea.fecha),
      fechaFin: this.formatearFecha(tarea.fechaFin),
      semestre: tarea.semestre
    };
    this.mostrarAdjuntar = (tarea.archivos?.length || 0) > 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.nuevaTarea = { nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', semestre: 1 };
    this.archivosNuevos = [];
    this.mostrarAdjuntar = false;
  }

  // Convierte una fecha ISO a 'yyyy-MM-dd' para el input type="date"
  private formatearFecha(valor: string): string {
    if (!valor) return '';
    const f = new Date(valor);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  }

  irANotas(tareaId: number) {
    this.router.navigate(['/tareas', this.materiaId, 'notas', tareaId]);
  }

  irAMatriz() {
    this.router.navigate(['/tareas', this.materiaId, 'matriz']);
  }

  eliminarTarea(id: number) {
    if (confirm('¿Eliminar esta tarea y todas sus notas?')) {
      this.tareaService.eliminarTarea(id).subscribe({
        next: () => {
          this.snackBar.open('Tarea eliminada', 'OK', { duration: 3000 });
          this.cargarTareas();
        },
        error: () => this.snackBar.open('Error al eliminar', 'OK', { duration: 3000 })
      });
    }
  }

  calcularPromedioTarea(tarea: any): string {
    const notas = tarea.notas?.filter((n: any) => n.valor !== null) || [];
    if (notas.length === 0) return '-';
    const suma = notas.reduce((a: number, b: any) => a + b.valor, 0);
    return (suma / notas.length).toFixed(2);
  }

  // ---------- Archivos al crear/editar la tarea ----------
  private readonly MAX_BYTES = 10 * 1024 * 1024;
  archivosNuevos: File[] = [];

  onSeleccionArchivosForm(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const grande = files.find(f => f.size > this.MAX_BYTES);
    if (grande) {
      this.snackBar.open(`El archivo ${grande.name} supera el tamaño máximo de 10 MB`, 'OK', { duration: 4000 });
      input.value = '';
      return;
    }
    this.archivosNuevos = [...this.archivosNuevos, ...files];
    input.value = '';
  }

  quitarArchivoNuevo(i: number) {
    this.archivosNuevos.splice(i, 1);
  }

  // Sube los archivos pendientes a la tarea recién guardada y reinicia el formulario.
  private finalizarGuardado(tareaId: number, mensaje: string) {
    const terminar = () => {
      this.archivosNuevos = [];
      this.nuevaTarea = { nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', semestre: 1 };
      this.editandoId = null;
      this.mostrarAdjuntar = false;
      this.guardando = false;
      this.snackBar.open(mensaje, 'OK', { duration: 3000 });
      this.cargarTareas();
    };
    if (this.archivosNuevos.length === 0) { terminar(); return; }
    this.tareaService.subirArchivosTarea(tareaId, this.archivosNuevos).subscribe({
      next: () => terminar(),
      error: () => {
        this.guardando = false;
        this.snackBar.open('Tarea guardada, pero falló la subida de archivos', 'OK', { duration: 4000 });
        this.archivosNuevos = [];
        this.cargarTareas();
      }
    });
  }

  abrirTarea(tareaId: number) {
    this.router.navigate(['/tareas', this.materiaId, 'detalle', tareaId]);
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