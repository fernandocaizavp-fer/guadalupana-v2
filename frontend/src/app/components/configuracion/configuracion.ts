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
import { DatePipe } from '@angular/common';
import { ConfiguracionService, Configuracion } from '../../services/configuracion';

@Component({
  selector: 'app-configuracion',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, DatePipe],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss'
})
export class ConfiguracionComponent implements OnInit {
  loading = true;
  guardando = false;

  // Supletorios (controlados solo por el plazo de fechas)
  supletorioInicio = '';   // yyyy-MM-dd
  supletorioFin = '';      // yyyy-MM-dd

  // Exámenes de grado (mismo esquema de plazo por fechas)
  examenGradoInicio = '';  // yyyy-MM-dd
  examenGradoFin = '';     // yyyy-MM-dd

  // Rango de notas
  notaMinima = 0;
  notaMaxima = 10;
  notaAprobacion = 7;

  // Permiso individual (reclamo)
  busqueda = '';
  buscando = false;
  resultados: any[] = [];
  seleccionado: any = null;
  permisoFecha = '';   // yyyy-MM-dd
  permisoMotivo = '';
  permisosActivos: any[] = [];   // permisos vigentes (persisten al recargar)

  // Recalificación de examen de grado (permiso individual)
  busquedaExamen = '';
  buscandoExamen = false;
  resultadosExamen: any[] = [];
  seleccionadoExamen: any = null;
  permisoFechaExamen = '';   // yyyy-MM-dd
  permisoMotivoExamen = '';
  permisosExamenActivos: any[] = [];

  constructor(
    private configService: ConfiguracionService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargar();
    this.cargarPermisos();
    this.cargarPermisosExamen();
  }

  cargarPermisos() {
    this.configService.listarPermisosSupletorio().subscribe({
      next: (permisos) => {
        this.permisosActivos = permisos;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso: la lista queda vacía */ }
    });
  }

  cargarPermisosExamen() {
    this.configService.listarPermisosExamenGrado().subscribe({
      next: (permisos) => {
        this.permisosExamenActivos = permisos;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso: la lista queda vacía */ }
    });
  }

  private soloFecha(iso: string | null): string {
    return iso ? iso.substring(0, 10) : '';
  }

  cargar() {
    this.configService.obtener().subscribe({
      next: (c: Configuracion) => {
        this.supletorioInicio = this.soloFecha(c.supletorioInicio);
        this.supletorioFin = this.soloFecha(c.supletorioFin);
        this.examenGradoInicio = this.soloFecha(c.examenGradoInicio);
        this.examenGradoFin = this.soloFecha(c.examenGradoFin);
        this.notaMinima = c.notaMinima;
        this.notaMaxima = c.notaMaxima;
        this.notaAprobacion = c.notaAprobacion;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar la configuración', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  guardar() {
    // Validación en cliente (el backend revalida)
    if (this.notaMinima >= this.notaMaxima) {
      this.snackBar.open('La nota mínima debe ser menor que la máxima', 'OK', { duration: 3000 });
      return;
    }
    if (this.notaAprobacion < this.notaMinima || this.notaAprobacion > this.notaMaxima) {
      this.snackBar.open('La nota de aprobación debe estar dentro del rango', 'OK', { duration: 3000 });
      return;
    }

    this.guardando = true;
    this.configService.actualizar({
      supletorioInicio: this.supletorioInicio || null,
      supletorioFin: this.supletorioFin || null,
      examenGradoInicio: this.examenGradoInicio || null,
      examenGradoFin: this.examenGradoFin || null,
      notaMinima: Number(this.notaMinima),
      notaMaxima: Number(this.notaMaxima),
      notaAprobacion: Number(this.notaAprobacion)
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.snackBar.open('Configuración guardada', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.guardando = false;
        this.snackBar.open(e?.error?.error || 'Error al guardar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  buscar() {
    if (!this.busqueda.trim()) return;
    this.buscando = true;
    this.configService.buscarEstudiante(this.busqueda.trim()).subscribe({
      next: (res) => {
        this.resultados = res;
        this.buscando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscando = false;
        this.snackBar.open('Error al buscar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  elegir(m: any) {
    this.seleccionado = m;
    this.permisoFecha = '';
    this.permisoMotivo = '';
  }

  habilitarPermiso() {
    if (!this.seleccionado || !this.permisoFecha) {
      this.snackBar.open('Selecciona estudiante y fecha límite', 'OK', { duration: 3000 });
      return;
    }
    this.configService.habilitarIndividual(this.seleccionado.id, this.permisoFecha, this.permisoMotivo).subscribe({
      next: () => {
        this.snackBar.open('Permiso individual habilitado', 'OK', { duration: 3000 });
        this.seleccionado = null;
        this.cargarPermisos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Error al habilitar el permiso', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  revocarPermiso(m: any) {
    this.configService.revocarIndividual(m.id).subscribe({
      next: () => {
        m.supletorioHabilitadoHasta = null;
        this.snackBar.open('Permiso revocado', 'OK', { duration: 3000 });
        this.cargarPermisos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Error al revocar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Recalificación de examen de grado ──

  buscarExamen() {
    if (!this.busquedaExamen.trim()) return;
    this.buscandoExamen = true;
    this.configService.buscarEstudiante(this.busquedaExamen.trim()).subscribe({
      next: (res) => {
        this.resultadosExamen = res;
        this.buscandoExamen = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoExamen = false;
        this.snackBar.open('Error al buscar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  elegirExamen(m: any) {
    this.seleccionadoExamen = m;
    this.permisoFechaExamen = '';
    this.permisoMotivoExamen = '';
  }

  habilitarRecalificacion() {
    if (!this.seleccionadoExamen || !this.permisoFechaExamen) {
      this.snackBar.open('Selecciona estudiante y fecha límite', 'OK', { duration: 3000 });
      return;
    }
    this.configService.habilitarRecalificacionExamen(
      this.seleccionadoExamen.id, this.permisoFechaExamen, this.permisoMotivoExamen
    ).subscribe({
      next: () => {
        this.snackBar.open('Recalificación habilitada', 'OK', { duration: 3000 });
        this.seleccionadoExamen = null;
        this.cargarPermisosExamen();
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Error al habilitar la recalificación', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  revocarRecalificacion(m: any) {
    this.configService.revocarRecalificacionExamen(m.id).subscribe({
      next: () => {
        m.examenGradoHabilitadoHasta = null;
        this.snackBar.open('Recalificación revocada', 'OK', { duration: 3000 });
        this.cargarPermisosExamen();
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Error al revocar', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
