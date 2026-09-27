import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { MatriculaService } from '../../../services/matricula';
import { calcularDisciplinaPonderada } from '../../../services/disciplina-util';
import { etiquetaAutorAnuncio } from '../../../services/anuncio-util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { VisorImagen } from '../../../shared/visor-imagen/visor-imagen';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-estudiante',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTableModule, MatDialogModule, DatePipe,
    VisorImagen],
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.scss'
})
export class DashboardEstudiante implements OnInit {
  usuario: any;
  matricula: any = null;
  loading = true;
  semestreSeleccionado = 1;
  materiasConTareas: any[] = [];
  anuncios: any[] = [];
  etiquetaAutor = etiquetaAutorAnuncio;

  imagenAmpliada: string | null = null;

  abrirImagen(url: string): void {
    if (url) this.imagenAmpliada = url;
  }

  urlImagen(imagen: string): string {
    if (!imagen) return '';
    return imagen.startsWith('http')
      ? imagen
      : `https://cf-guadalupana-production.up.railway.app${imagen}`;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private matriculaService: MatriculaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    this.http.get(`https://cf-guadalupana-production.up.railway.app/api/usuarios/perfil-estudiante/${this.usuario.id}`, { headers }).subscribe({
      next: (matricula: any) => {
        this.matricula = matricula;
        this.cargarNotasSemestre();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.http.get<any[]>('https://cf-guadalupana-production.up.railway.app/api/anuncios', { headers }).subscribe({
      next: (anuncios) => {
        this.anuncios = anuncios;
        this.cdr.detectChanges();
      }
    });
  }

cargarNotasSemestre() {
  if (!this.matricula?.cursoId) return;
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });

  this.http.get<any>(
    `https://cf-guadalupana-production.up.railway.app/api/tareas/curso/${this.matricula.cursoId}?semestre=${this.semestreSeleccionado}`,
    { headers }
  ).subscribe({
    next: (data) => {
      const todasMaterias = data.todasMaterias || data.materias || [];
      const materiasPrincipales = (data.materias || []).filter((m: any) =>
        !m.esSubmateria && m.nombre !== 'Disciplina'
      );

      const matriculaData = (data.matriculas || []).find(
        (m: any) => m.id === this.matricula.id
      );

      const notasTarea = matriculaData?.notasTarea || [];
      const notasDisciplina = matriculaData?.notasDisciplina || [];

      const materiasMapeadas = materiasPrincipales.map((materia: any) => {

        // Práctica y Teoría — promedio de submaterias
        if (materia.nombre === 'Práctica' || materia.nombre === 'Teoría') {
          const submaterias = todasMaterias.filter((m: any) =>
            m.esSubmateria && m.materiaParent === materia.nombre
          );

          const todasNotas: number[] = [];
          submaterias.forEach((sub: any) => {
            notasTarea
              .filter((n: any) => n.tarea?.materiaId === sub.id && n.valor !== null)
              .forEach((n: any) => todasNotas.push(n.valor));
          });

          const promedio = todasNotas.length > 0
            ? todasNotas.reduce((a: number, b: number) => a + b, 0) / todasNotas.length
            : null;

          return {
            ...materia,
            tareas: [],
            promedio: promedio !== null
              ? (promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1))
              : '-'
          };
        }

        // Materia normal — calcular desde notasTarea directamente
        const notasDeEstaMateria = notasTarea.filter((n: any) =>
          n.tarea?.materiaId === materia.id && n.valor !== null
        );

        const promedio = notasDeEstaMateria.length > 0
          ? notasDeEstaMateria.reduce((a: number, b: any) => a + b.valor, 0) / notasDeEstaMateria.length
          : null;

        const tareasConNota = notasDeEstaMateria.map((n: any) => ({
          ...n.tarea,
          miNota: n.valor,
          miObservacion: n.observacion || ''
        }));

        return {
          ...materia,
          tareas: tareasConNota,
          promedio: promedio !== null
            ? (promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1))
            : '-'
        };
      });

      // Disciplina — doble ponderación (submaterias → Práctica/Teoría, luego materias normales)
      const semActual = this.semestreSeleccionado;
      const notasDisc = notasDisciplina.filter(
        (n: any) => !n.semestre || n.semestre === semActual
      );
      const promedioDisciplina = calcularDisciplinaPonderada(notasDisc);

      const filaDisciplina = {
        id: -1,
        nombre: 'Disciplina',
        esSubmateria: false,
        tareas: [],
        esDisciplina: true,
        promedio: promedioDisciplina !== null
          ? (promedioDisciplina % 1 === 0 ? String(promedioDisciplina) : promedioDisciplina.toFixed(1))
          : '-'
      };

      this.materiasConTareas = [...materiasMapeadas, filaDisciplina];
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
    this.loading = true;
    this.cargarNotasSemestre();
  }

  irAMateria(materia: any) {
    if (materia.esDisciplina) return;
    if (materia.nombre === 'Práctica' || materia.nombre === 'Teoría') {
      this.router.navigate(['/estudiante/submaterias', materia.id, this.semestreSeleccionado]);
    } else {
      this.router.navigate(['/estudiante/materia', materia.id, this.semestreSeleccionado]);
    }
  }

  descargarCertificado() {
    if (!this.matricula) return;
    this.matriculaService.descargarCertificado(this.matricula.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_${this.matricula.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al descargar certificado', 'OK', { duration: 3000 })
    });
  }

  logout() {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Cerrar sesión',
        mensaje: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Cerrar sesión',
        cancelText: 'Cancelar',
        icon: 'logout'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}