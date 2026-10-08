import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../services/auth';
import { ConfiguracionService } from '../../../services/configuracion';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ingresar-disciplina',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule, MatInputModule],
  templateUrl: './ingresar-disciplina.html',
  styleUrl: './ingresar-disciplina.scss'
})
export class IngresarDisciplina implements OnInit {
  materiaId: number = 0;
  materia: any = null;
  matriculas: any[] = [];
  notas: { [key: number]: string } = {};
  materiaGemelaId: number | null = null;
  semestreSeleccionado = 1;
  loading = true;
  guardando = false;
  notaMin = 0;
  notaMax = 10;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private configService: ConfiguracionService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.configService.obtener().subscribe({
      next: (c) => { this.notaMin = c.notaMinima; this.notaMax = c.notaMaxima; }
    });
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    this.http.get<any>(`${environment.apiUrl}/disciplina/estudiantes/${this.materiaId}`, { headers }).subscribe({
      next: (data) => {
        this.materia = data.materia;
        this.matriculas = data.matriculas;
        this.materiaGemelaId = data.materiaGemelaId || null;
        this.cargarNotas();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Cargar las notas de la materia propia del profesor para el semestre activo
  cargarNotas() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    this.loading = true;
    this.notas = {};
    this.http.get<any[]>(`${environment.apiUrl}/disciplina/materia/${this.materiaId}?semestre=${this.semestreSeleccionado}`, { headers }).subscribe({
      next: (notasExistentes) => {
        notasExistentes.forEach(n => {
          this.notas[n.matriculaId] = String(n.valor);
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

  cambiarSemestre(semestre: number) {
    if (this.semestreSeleccionado === semestre) return;
    this.semestreSeleccionado = semestre;
    this.cargarNotas();
  }

  guardar() {
    const notasArray: any[] = [];

    this.matriculas
      .filter(m => this.notas[m.id] !== undefined && this.notas[m.id] !== '')
      .forEach(m => {
        const valor = Number(this.notas[m.id]);
        // Siempre en la materia propia del profesor
        notasArray.push({ matriculaId: m.id, materiaId: this.materiaId, valor, semestre: this.semestreSeleccionado });
        // Si es submateria, también en su gemela (la misma submateria en Práctica/Teoría)
        if (this.materiaGemelaId) {
          notasArray.push({ matriculaId: m.id, materiaId: this.materiaGemelaId, valor, semestre: this.semestreSeleccionado });
        }
      });

    if (notasArray.length === 0) {
      this.snackBar.open('Ingresa al menos una nota', 'OK', { duration: 3000 });
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    this.guardando = true;
    this.cdr.detectChanges();

    this.http.post(`${environment.apiUrl}/disciplina/masivo`, { notas: notasArray, semestre: this.semestreSeleccionado }, { headers }).subscribe({
      next: () => {
        this.guardando = false;
        this.snackBar.open('Notas de disciplina guardadas', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.snackBar.open('Error al guardar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  volver() {
    this.router.navigate(['/profesor']);
  }
}