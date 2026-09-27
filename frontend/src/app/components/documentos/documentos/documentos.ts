import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CursoService } from '../../../services/curso';
import { MatriculaService } from '../../../services/matricula';


@Component({
  selector: 'app-documentos',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule,
    MatInputModule, MatSelectModule],
  templateUrl: './documentos.html',
  styleUrl: './documentos.scss'
})
export class Documentos implements OnInit {
  cursos: any[] = [];
  matriculas: any[] = [];
  matriculasFiltradas: any[] = [];
  busqueda = '';
  cursoFiltro = '';
  loading = false;
  descargando: number | null = null;

  constructor(
    private router: Router,
    private cursoService: CursoService,
    private matriculaService: MatriculaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cargarTodosEstudiantes();
        this.cdr.detectChanges();
      }
    });
  }

  cargarTodosEstudiantes() {
    this.loading = true;
    const todasMatriculas: any[] = [];
    let completados = 0;

    if (this.cursos.length === 0) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.cursos.forEach(curso => {
      this.cursoService.obtenerCurso(curso.id).subscribe({
        next: (c) => {
          c.matriculas.forEach((m: any) => {
            todasMatriculas.push({ ...m, curso: c });
          });
          completados++;
          if (completados === this.cursos.length) {
            this.matriculas = todasMatriculas.sort((a, b) =>
              a.apellidos.localeCompare(b.apellidos)
            );
            this.matriculasFiltradas = [...this.matriculas];
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          completados++;
          if (completados === this.cursos.length) {
            this.loading = false;
            this.cdr.detectChanges();
          }
        }
      });
    });
  }

  filtrar() {
    this.matriculasFiltradas = this.matriculas.filter(m => {
      const coincideBusqueda = !this.busqueda ||
        `${m.apellidos} ${m.nombres}`.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        m.cedula?.includes(this.busqueda);
      const coincideCurso = !this.cursoFiltro || m.cursoId === Number(this.cursoFiltro);
      return coincideBusqueda && coincideCurso;
    });
    this.cdr.detectChanges();
  }

  descargarMatricula(matricula: any) {
    this.descargando = matricula.id;
    this.matriculaService.descargarMatricula(matricula.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matricula_${matricula.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargando = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.descargando = null;
        this.snackBar.open('Error al descargar matrícula', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  descargarCertificado(matricula: any) {
    this.descargando = matricula.id;
    this.matriculaService.descargarCertificado(matricula.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_${matricula.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargando = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.descargando = null;
        this.snackBar.open('Error al descargar certificado', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}