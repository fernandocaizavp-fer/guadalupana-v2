import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { TareaService } from '../../../services/tarea';
import { CursoService } from '../../../services/curso';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-matriz-notas',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule, DatePipe],
  templateUrl: './matriz-notas.html',
  styleUrl: './matriz-notas.scss'
})
export class MatrizNotas implements OnInit {
  materiaId = 0;
  materia: any = null;
  tareas: any[] = [];
  matriculas: any[] = [];
  loading = true;
  semestreSeleccionado = 1;

  // notaMap[matriculaId_tareaId] = valor de la nota (o null si no hay).
  private notaMap: { [key: string]: number | null } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tareaService: TareaService,
    private cursoService: CursoService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Matriz de notas');
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.cargarDatos();
  }

  clave(matriculaId: number, tareaId: number): string {
    return `${matriculaId}_${tareaId}`;
  }

  cargarDatos() {
    this.loading = true;
    this.tareaService.getTareasPorMateria(this.materiaId, this.semestreSeleccionado).subscribe({
      next: (tareas) => {
        this.tareas = tareas;
        if (tareas.length > 0) this.materia = tareas[0].materia;

        const cursoId = tareas[0]?.materia?.cursoId ?? this.materia?.cursoId;
        if (!cursoId) { this.loading = false; this.cdr.detectChanges(); return; }

        this.cursoService.obtenerCurso(cursoId).subscribe({
          next: (curso) => {
            this.materia = this.materia || (curso.materias || []).find((m: any) => m.id === this.materiaId);
            this.matriculas = [...(curso.matriculas || [])].sort(
              (a, b) => (a.matriculaNo || '').localeCompare(b.matriculaNo || '')
            );
            this.notaMap = {};
            for (const t of this.tareas) {
              for (const n of (t.notas || [])) {
                this.notaMap[this.clave(n.matriculaId, t.id)] =
                  n.valor !== null && n.valor !== undefined ? n.valor : null;
              }
            }
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => { this.loading = false; this.cdr.detectChanges(); }
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar la matriz', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  cambiarSemestre(semestre: number) {
    this.semestreSeleccionado = semestre;
    this.cargarDatos();
  }

  // Nota como texto para mostrar ('' = sin registrar).
  getNota(matriculaId: number, tareaId: number): string {
    const v = this.notaMap[this.clave(matriculaId, tareaId)];
    return v !== null && v !== undefined ? String(v) : '';
  }

  tieneNota(matriculaId: number, tareaId: number): boolean {
    return this.getNota(matriculaId, tareaId) !== '';
  }

  // Al hacer clic en una celda se abre la tarea (detalle) para ingresar/corregir la nota.
  irATarea(tareaId: number) {
    this.router.navigate(['/tareas', this.materiaId, 'detalle', tareaId]);
  }

  // Promedio de las notas registradas (referencia visual, no es la nota final oficial).
  promedioEstudiante(matriculaId: number): string {
    const nums = this.tareas
      .map((t) => this.notaMap[this.clave(matriculaId, t.id)])
      .filter((v): v is number => v !== null && v !== undefined);
    if (nums.length === 0) return '—';
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  }

  // Cuántas notas le faltan al estudiante (celdas sin registrar).
  faltantesEstudiante(matriculaId: number): number {
    return this.tareas.filter((t) => !this.tieneNota(matriculaId, t.id)).length;
  }

  volver() {
    this.router.navigate(['/tareas', this.materiaId]);
  }
}
