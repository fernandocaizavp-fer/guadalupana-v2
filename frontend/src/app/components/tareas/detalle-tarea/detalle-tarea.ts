import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { TareaService } from '../../../services/tarea';
import { CursoService } from '../../../services/curso';
import { ConfiguracionService } from '../../../services/configuracion';

@Component({
  selector: 'app-detalle-tarea',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, DatePipe],
  templateUrl: './detalle-tarea.html',
  styleUrl: './detalle-tarea.scss'
})
export class DetalleTarea implements OnInit {
  materiaId = 0;
  tareaId = 0;
  tarea: any = null;
  estudiantes: any[] = [];
  notas: { [key: number]: { valor: string; observacion: string } } = {};
  loading = true;
  subiendo = false;
  notaMin = 0;
  notaMax = 10;

  // Guardado automático: estado del indicador y valores confirmados por estudiante.
  estado: 'idle' | 'guardando' | 'guardado' | 'error' = 'idle';
  private orig: { [id: number]: { valor: string; observacion: string } } = {};
  private fadeTimer: any;

  private readonly MAX_BYTES = 10 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tareaService: TareaService,
    private cursoService: CursoService,
    private configService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.tareaId = Number(this.route.snapshot.paramMap.get('tareaId'));
    this.configService.obtener().subscribe({
      next: (c) => { this.notaMin = c.notaMinima; this.notaMax = c.notaMaxima; }
    });
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.tareaService.getTareasPorMateria(this.materiaId).subscribe({
      next: (tareas) => {
        this.tarea = tareas.find((t: any) => t.id === this.tareaId) || null;
        const cursoId = this.tarea?.materia?.curso?.id || this.tarea?.materia?.cursoId;
        if (cursoId) {
          this.cargarEstudiantes(cursoId);
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private cargarEstudiantes(cursoId: number) {
    // Estudiantes del curso + entregas de la tarea (para mostrar y calificar juntos)
    this.cursoService.obtenerCurso(cursoId).subscribe({
      next: (curso) => {
        const matriculas = curso.matriculas || [];
        this.tareaService.getEntregasTarea(this.tareaId).subscribe({
          next: (entregas) => {
            const mapaEntregas = new Map<number, any>(entregas.map((e: any) => [e.matriculaId, e]));
            this.estudiantes = matriculas.map((m: any) => {
              const notaExistente = this.tarea.notas?.find((n: any) => n.matriculaId === m.id);
              const valor = notaExistente?.valor !== null && notaExistente?.valor !== undefined
                ? String(notaExistente.valor) : '';
              const observacion = notaExistente?.observacion || '';
              this.notas[m.id] = { valor, observacion };
              this.orig[m.id] = { valor, observacion }; // línea base para detectar cambios
              return { ...m, entrega: mapaEntregas.get(m.id) || null };
            });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => { this.loading = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // Guardado automático de la nota/observación de un estudiante (al salir del campo).
  guardarUno(matriculaId: number) {
    const n = this.notas[matriculaId];
    if (!n) return;
    const o = this.orig[matriculaId] || { valor: '', observacion: '' };
    const valorStr = (n.valor === null || n.valor === undefined) ? '' : String(n.valor);
    const obs = n.observacion || '';
    if (valorStr === o.valor && obs === o.observacion) return; // sin cambios: no guarda

    this.estado = 'guardando';
    this.cdr.detectChanges();
    this.tareaService.guardarNotas([{
      tareaId: this.tareaId,
      matriculaId,
      valor: valorStr,            // '' => el backend lo guarda como null (sin nota)
      observacion: obs || null
    }]).subscribe({
      next: () => {
        this.orig[matriculaId] = { valor: valorStr, observacion: obs };
        this.marcarGuardado();
      },
      error: (e) => {
        // Revierte al último valor confirmado y avisa.
        this.notas[matriculaId].valor = o.valor;
        this.notas[matriculaId].observacion = o.observacion;
        this.estado = 'error';
        this.snackBar.open(e?.error?.error || 'Error al guardar la nota', 'OK', { duration: 3500 });
        this.cdr.detectChanges();
      }
    });
  }

  private marcarGuardado() {
    this.estado = 'guardado';
    this.cdr.detectChanges();
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => { this.estado = 'idle'; this.cdr.detectChanges(); }, 2500);
  }

  // ---------- Documentos de la tarea ----------
  onArchivosSeleccionados(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const grande = files.find(f => f.size > this.MAX_BYTES);
    if (grande) {
      this.snackBar.open(`El archivo ${grande.name} supera el tamaño máximo de 10 MB`, 'OK', { duration: 4000 });
      input.value = '';
      return;
    }

    this.subiendo = true;
    this.tareaService.subirArchivosTarea(this.tareaId, files).subscribe({
      next: (res) => {
        this.tarea.archivos = [...(this.tarea.archivos || []), ...res.archivos];
        this.subiendo = false;
        input.value = '';
        this.snackBar.open('Archivos subidos', 'OK', { duration: 2500 });
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.subiendo = false;
        input.value = '';
        this.snackBar.open(e?.error?.error || 'Error al subir archivos', 'OK', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
  }

  eliminarArchivo(archivo: any) {
    if (!confirm(`¿Eliminar "${archivo.nombreOriginal}"?`)) return;
    this.tareaService.eliminarArchivoTarea(archivo.id).subscribe({
      next: () => {
        this.tarea.archivos = (this.tarea.archivos || []).filter((a: any) => a.id !== archivo.id);
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('Error al eliminar archivo', 'OK', { duration: 3000 })
    });
  }

  volver() {
    this.router.navigate(['/tareas', this.materiaId]);
  }
}
