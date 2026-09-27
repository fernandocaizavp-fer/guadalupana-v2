import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-notas-curso',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule,
    MatInputModule, FormsModule],
  templateUrl: './notas-curso.html',
  styleUrl: './notas-curso.scss'
})
export class NotasCurso implements OnInit {
  curso: any = null;
  materias: any[] = [];
  matriculas: any[] = [];
  loading = true;
  cursoId = 0;
  semestreSeleccionado = 1;
  lugarFecha = '';

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
      this.snackBar.open('Ingresa el lugar y fecha primero', 'OK', { duration: 3000 });
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
      error: () => this.snackBar.open('Error al descargar AL14', 'OK', { duration: 3000 })
    });
  }

  volver() {
    this.router.navigate(['/cursos', this.cursoId]);
  }
}