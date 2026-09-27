import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ExamenGradoService } from '../../../services/examen-grado';
import { ConfiguracionService } from '../../../services/configuracion';

@Component({
  selector: 'app-ingresar-examen-grado',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './ingresar-examen-grado.html',
  styleUrl: './ingresar-examen-grado.scss'
})
export class IngresarExamenGrado implements OnInit {
  materia: any = null;
  estudiantes: any[] = [];
  notas: { [key: number]: number | null } = {};
  loading = true;
  guardando = false;
  materiaId!: number;
  notaMin = 0;
  notaMax = 10;
  ventanaAbierta = false;   // plazo general de exámenes de grado

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examenGradoService: ExamenGradoService,
    private configService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    // Primero la configuración (para saber si el plazo está abierto); luego los datos.
    this.configService.obtener().subscribe({
      next: (c) => {
        this.notaMin = c.notaMinima;
        this.notaMax = c.notaMaxima;
        this.ventanaAbierta = this.calcularVentana(c);
        this.cargarEstudiantes();
      },
      error: () => this.cargarEstudiantes()
    });
  }

  // Comparación por día calendario anclada a Ecuador (UTC-5), ambos extremos
  // inclusivos. Idéntica a la de supletorios.
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
    if (!c?.examenGradoInicio && !c?.examenGradoFin) return false;
    const hoy = this.hoyEcuador();
    if (c.examenGradoInicio && hoy < this.diaGuardado(c.examenGradoInicio)) return false;
    if (c.examenGradoFin && hoy > this.diaGuardado(c.examenGradoFin)) return false;
    return true;
  }

  cargarEstudiantes() {
    this.loading = true;
    this.examenGradoService.getEstudiantes(this.materiaId).subscribe({
      next: (data) => {
        this.materia = data.materia;
        // Cada estudiante está habilitado si el plazo general está abierto o
        // tiene una recalificación individual vigente (habilitada por admin).
        this.estudiantes = data.estudiantes.map((e: any) => ({
          ...e,
          habilitado: this.ventanaAbierta || this.vigenteHasta(e.examenGradoHabilitadoHasta)
        }));
        this.estudiantes.forEach(e => {
          this.notas[e.id] = e.valor ?? null;
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

  guardar() {
    // Solo se envían los estudiantes habilitados (plazo abierto o permiso
    // individual). El backend revalida.
    const notas = this.estudiantes
      .filter(e => e.habilitado)
      .map(e => ({
        matriculaId: e.id,
        materiaId: this.materiaId,
        valor: this.notas[e.id] !== null ? this.notas[e.id] : null
      }));

    if (notas.length === 0) {
      this.snackBar.open('No hay estudiantes habilitados para registrar exámenes', 'OK', { duration: 3000 });
      return;
    }

    this.guardando = true;
    this.examenGradoService.guardar(notas).subscribe({
      next: () => {
        this.snackBar.open('Exámenes guardados correctamente', 'OK', { duration: 3000 });
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.error || 'Error al guardar', 'OK', { duration: 4000 });
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get estudiantesConNota(): number {
    return this.estudiantes.filter(e => this.notas[e.id] !== null && this.notas[e.id] !== undefined).length;
  }

  get estudiantesHabilitados(): number {
    return this.estudiantes.filter(e => e.habilitado).length;
  }

  volver() {
    this.router.navigate(['/profesor']);
  }

  
}