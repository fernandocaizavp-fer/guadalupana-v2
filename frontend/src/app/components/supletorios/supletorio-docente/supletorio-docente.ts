import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth';
import { TareaService } from '../../../services/tarea';
import { SuplетorioService } from '../../../services/supletorio';
import { ConfiguracionService } from '../../../services/configuracion';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-supletorio-docente',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './supletorio-docente.html',
  styleUrl: './supletorio-docente.scss'
})
export class SupletorioDocente implements OnInit {
  materiaId = 0;
  materia: any = null;
  estudiantes: any[] = [];
  loading = true;
  guardando = false;
  usuario: any;

  // Configuración (rango de notas y ventana de supletorios)
  ventanaAbierta = false;
  notaMin = 0;
  notaMax = 10;

  // supletorios[matriculaId] = valor
  supletorios: { [key: number]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private tareaService: TareaService,
    private suplетorioService: SuplетorioService,
    private configService: ConfiguracionService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    // Primero la configuración; luego los datos del curso.
    this.configService.obtener().subscribe({
      next: (c) => {
        this.notaMin = c.notaMinima;
        this.notaMax = c.notaMaxima;
        this.ventanaAbierta = this.calcularVentana(c);
        this.cargarDatos();
      },
      error: () => this.cargarDatos()
    });
  }

  // Comparación por día calendario, anclada a Ecuador (UTC-5), ambos extremos
  // inclusivos. Evita cortes por hora/zona horaria.
  private hoyEcuador(): string {
    return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().substring(0, 10);
  }
  private diaGuardado(fecha: any): string {
    return new Date(fecha).toISOString().substring(0, 10);
  }

  private vigenteHasta(fecha: any): boolean {
    if (!fecha) return false;
    return this.hoyEcuador() <= this.diaGuardado(fecha);
  }

  private calcularVentana(c: any): boolean {
    if (!c?.supletorioInicio && !c?.supletorioFin) return false;
    const hoy = this.hoyEcuador();
    if (c.supletorioInicio && hoy < this.diaGuardado(c.supletorioInicio)) return false;
    if (c.supletorioFin && hoy > this.diaGuardado(c.supletorioFin)) return false;
    return true;
  }

  cargarDatos() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    // Obtener tareas de la materia para ambos semestres
    this.tareaService.getTareasPorMateria(this.materiaId).subscribe({
      next: (tareas) => {
        if (tareas.length > 0) {
          this.materia = tareas[0].materia;
          const cursoId = tareas[0].materia?.curso?.id;

          // Obtener notas del curso
          this.tareaService.getNotasCursoSemestre(cursoId).subscribe({
            next: (data) => {
              this.estudiantes = data.matriculas.map((m: any) => {
                // Promedio semestre 1
                const notasS1 = m.notasTarea?.filter((n: any) =>
                  n.tarea?.materiaId === this.materiaId &&
                  n.tarea?.semestre === 1 &&
                  n.valor !== null
                ) || [];
                const promedioS1 = notasS1.length > 0
                  ? notasS1.reduce((a: number, b: any) => a + b.valor, 0) / notasS1.length
                  : null;

                // Promedio semestre 2
                const notasS2 = m.notasTarea?.filter((n: any) =>
                  n.tarea?.materiaId === this.materiaId &&
                  n.tarea?.semestre === 2 &&
                  n.valor !== null
                ) || [];
                const promedioS2 = notasS2.length > 0
                  ? notasS2.reduce((a: number, b: any) => a + b.valor, 0) / notasS2.length
                  : null;

                // Suma de promedios
                const suma = promedioS1 !== null && promedioS2 !== null
                  ? (promedioS1 + promedioS2) / 2
                  : null;

                // Habilitar supletorio según el control del administrador:
                // ventana general abierta, o permiso individual vigente para este estudiante.
                const permisoIndividual = this.vigenteHasta(m.supletorioHabilitadoHasta);
                const habilitarSup = this.ventanaAbierta || permisoIndividual;

                this.supletorios[m.id] = '';

                return {
                  ...m,
                  promedioS1: promedioS1 !== null ? (promedioS1 % 1 === 0 ? String(promedioS1) : promedioS1.toFixed(1)) : '-',
                  promedioS2: promedioS2 !== null ? (promedioS2 % 1 === 0 ? String(promedioS2) : promedioS2.toFixed(1)) : '-',
                  suma: suma !== null ? (suma % 1 === 0 ? String(suma) : suma.toFixed(1)) : '-',
                  habilitarSup
                };
              });

              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardar() {
    this.guardando = true;
    const data = this.estudiantes
      .filter(e => this.supletorios[e.id] !== '' && this.supletorios[e.id] !== null)
      .map(e => ({
        matriculaId: e.id,
        materiaId: this.materiaId,
        valor: Number(this.supletorios[e.id])
      }));

    if (data.length === 0) {
      this.snackBar.open('No hay supletorios para guardar', 'OK', { duration: 3000 });
      this.guardando = false;
      return;
    }

    this.suplетorioService.guardarMasivo(data).subscribe({
      next: () => {
        this.guardando = false;
        this.snackBar.open('Supletorios guardados', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.snackBar.open('Error al guardar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  get estudiantesHabilitados(): number {
  return this.estudiantes.filter(e => e.habilitarSup).length;
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