import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth';
import { TareaService } from '../../../services/tarea';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-detalle-materia',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './detalle-materia.html',
  styleUrl: './detalle-materia.scss'
})
export class DetalleMateria implements OnInit {
  materiaId = 0;
  semestre = 1;
  materia: any = null;
  tareas: any[] = [];
  promedio = '-';
  loading = true;
  usuario: any;
  matriculaId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private tareaService: TareaService,
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

    // Obtener perfil del estudiante para tener el matriculaId
    this.http.get<any>(
      `https://cf-guadalupana-production.up.railway.app/api/usuarios/perfil-estudiante/${this.usuario.id}`,
      { headers }
    ).subscribe({
      next: (matricula) => {
        this.matriculaId = matricula.id;
        this.cargarTareas();
      }
    });
  }

  cargarTareas() {
    this.tareaService.getTareasPorMateria(this.materiaId, this.semestre).subscribe({
      next: (tareas) => {
        if (tareas.length > 0) {
          this.materia = tareas[0].materia;
        }

        // Filtrar notas del estudiante
        this.tareas = tareas.map(tarea => {
          const miNota = tarea.notas?.find((n: any) => n.matriculaId === this.matriculaId);
          return {
            ...tarea,
            miNota: miNota?.valor ?? null,
            miObservacion: miNota?.observacion || ''
          };
        });

        // Calcular promedio
        const notasValidas = this.tareas.filter(t => t.miNota !== null);
        if (notasValidas.length > 0) {
          const suma = notasValidas.reduce((a, b) => a + b.miNota, 0);
          const prom = suma / notasValidas.length;
          this.promedio = prom % 1 === 0 ? String(prom) : prom.toFixed(1);
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

  abrirTarea(tarea: any) {
    this.router.navigate(['/estudiante/tarea', this.materiaId, tarea.id, this.semestre]);
  }

  volver() {
    this.router.navigate(['/estudiante']);
  }
}