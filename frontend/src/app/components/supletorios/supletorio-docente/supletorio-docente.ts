import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth';
import { SuplетorioService } from '../../../services/supletorio';
import { ConfiguracionService } from '../../../services/configuracion';

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
    private suplетorioService: SuplетorioService,
    private configService: ConfiguracionService,
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

  // Estudiantes y promedios vienen de una sola ruta que no depende de que la materia
  // tenga tareas y que respeta las notas del ingreso rápido (mismo cálculo que el AL15).
  cargarDatos() {
    const fmt = (v: number | null) => v === null ? '-' : (v % 1 === 0 ? String(v) : v.toFixed(1));
    this.suplетorioService.getSupletoriosMateria(this.materiaId).subscribe({
      next: ({ materia, estudiantes }) => {
        this.materia = materia;
        this.supletorios = {};
        this.estudiantes = estudiantes.map((m: any) => {
          const suma = m.promedioS1 !== null && m.promedioS2 !== null
            ? (m.promedioS1 + m.promedioS2) / 2
            : null;

          // Habilitar supletorio según el control del administrador:
          // ventana general abierta, o permiso individual vigente para este estudiante.
          const habilitarSup = this.ventanaAbierta || this.vigenteHasta(m.supletorioHabilitadoHasta);

          // Supletorio ya guardado, para verlo y corregirlo.
          this.supletorios[m.id] = m.supletorio !== null ? String(m.supletorio) : '';

          return {
            ...m,
            promedioS1: fmt(m.promedioS1),
            promedioS2: fmt(m.promedioS2),
            suma: fmt(suma),
            habilitarSup
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.snackBar.open(e?.error?.error || 'Error al cargar los estudiantes', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  guardar() {
    this.guardando = true;
    // Solo los habilitados: los demás pueden mostrar un supletorio ya guardado, pero
    // reenviarlo haría que el servidor rechace el lote fuera de la ventana.
    const data = this.estudiantes
      .filter(e => e.habilitarSup && this.supletorios[e.id] !== '' && this.supletorios[e.id] !== null)
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