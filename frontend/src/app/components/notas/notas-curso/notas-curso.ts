import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CursoService } from '../../../services/curso';
import { TareaService } from '../../../services/tarea';
import { BotonCalendario, lugarFechaHoy } from '../../../shared/lugar-fecha/lugar-fecha';
import { Title } from '@angular/platform-browser';
import { NotificacionService } from '../../../services/notificacion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';

@Component({
  selector: 'app-notas-curso',
  imports: [Esqueleto, MatTooltipModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule,
    MatInputModule, FormsModule, BotonCalendario],
  templateUrl: './notas-curso.html',
  styleUrl: './notas-curso.scss'
})
export class NotasCurso implements OnInit {
  private notificacion = inject(NotificacionService);

  curso: any = null;
  materias: any[] = [];
  matriculas: any[] = [];
  loading = true;
  cursoId = 0;
  semestreSeleccionado = 1;
  lugarFecha = lugarFechaHoy();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private tareaService: TareaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Calificaciones');
    this.cursoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.cursoService.obtenerCurso(this.cursoId).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.cdr.detectChanges();
      }
    });

    this.tareaService.getNotasCursoSemestre(this.cursoId, this.semestreSeleccionado).subscribe({
      next: (data) => {
        this.materias = data.materias;
        this.matriculas = data.matriculas;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarSemestre(semestre: number) {
    this.semestreSeleccionado = semestre;
    this.cargarDatos();
  }

  getPromedioPorMateria(matricula: any, materiaId: number): string {
    const notas = matricula.notasTarea?.filter((n: any) =>
      n.tarea?.materiaId === materiaId && n.valor !== null
    ) || [];
    if (notas.length === 0) return '-';
    const suma = notas.reduce((a: number, b: any) => a + b.valor, 0);
    const promedio = suma / notas.length;
    return promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1);
  }

  getPromedioGeneral(matricula: any): string {
    const notas = matricula.notasTarea?.filter((n: any) => n.valor !== null) || [];
    if (notas.length === 0) return '-';
    const suma = notas.reduce((a: number, b: any) => a + b.valor, 0);
    const promedio = suma / notas.length;
    return promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1);
  }

  descargarAL14() {
    if (!this.lugarFecha) {
      this.notificacion.info('Ingresa el lugar y fecha primero');
      return;
    }
    this.tareaService.descargarAL14(this.cursoId, this.lugarFecha, this.semestreSeleccionado).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL14_${this.curso?.ramaArtesanal}_semestre${this.semestreSeleccionado}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => this.notificacion.error(err.error?.error || 'Error al descargar AL14')
    });
  }

  volver() {
    this.router.navigate(['/cursos', this.cursoId]);
  }
}