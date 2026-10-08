import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-submaterias-materia',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './submaterias-materia.html',
  styleUrl: './submaterias-materia.scss'
})
export class SubmateriasMateria implements OnInit {
  materiaParent: string = '';
  semestre: number = 1;
  materiaId: number = 0;
  submaterias: any[] = [];
  matricula: any = null;
  loading = true;
  usuario: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.semestre = Number(this.route.snapshot.paramMap.get('semestre'));

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    // Cargar perfil del estudiante
    this.http.get<any>(`${environment.apiUrl}/usuarios/perfil-estudiante/${this.usuario.id}`, { headers }).subscribe({
      next: (matricula) => {
        this.matricula = matricula;
        this.cargarSubmaterias(headers);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarSubmaterias(headers: HttpHeaders) {
    // Obtener la materia padre para saber si es Práctica o Teoría
    this.http.get<any>(`${environment.apiUrl}/cursos/${this.matricula.cursoId}`, { headers }).subscribe({
      next: (curso) => {
        const materiaBase = curso.materias.find((m: any) => m.id === this.materiaId);
        this.materiaParent = materiaBase?.nombre || '';

        // Obtener submaterias
        const subs = curso.materias.filter((m: any) =>
          m.esSubmateria && m.materiaParent === this.materiaParent
        );

        // Calcular promedio por submateria
        this.submaterias = subs.map((sub: any) => {
          const notasSub = this.matricula.notasTarea?.filter((n: any) =>
            n.tarea?.materiaId === sub.id &&
            n.tarea?.semestre === this.semestre &&
            n.valor !== null
          ) || [];

          const promedio = notasSub.length > 0
            ? notasSub.reduce((a: number, b: any) => a + b.valor, 0) / notasSub.length
            : null;

          return {
            ...sub,
            tareas: notasSub,
            promedio: promedio !== null
              ? (promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1))
              : '-'
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  verTareasSubmateria(subId: number) {
    this.router.navigate(['/estudiante/materia', subId, this.semestre]);
  }

  getColor(promedio: string): string {
    if (promedio === '-') return '#aaa';
    const val = parseFloat(promedio);
    if (val >= 7) return '#2e7d32';
    if (val >= 5) return '#f57f17';
    return '#c62828';
  }

  volver() {
    this.router.navigate(['/estudiante']);
  }
}