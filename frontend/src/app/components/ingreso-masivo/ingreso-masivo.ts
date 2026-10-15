import { Component, ChangeDetectorRef, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, finalize } from 'rxjs';
import {
  IngresoRapidoService, EstudianteRapido, ClaveMateria, ColumnaMateria,
  MATERIAS_NOTAS, MATERIAS_EXAMEN
} from '../../services/ingreso-rapido';
import { CursoService } from '../../services/curso';
import { ConfiguracionService } from '../../services/configuracion';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

type Pestana = 'notas' | 'examenes' | 'asistencias';
type Valor = number | null;

// Ingreso rápido masivo (página a pantalla completa, solo ADMIN): tablas tipo hoja de cálculo para escribir de una vez las
// notas finales, los exámenes de grado y la asistencia de todo un curso. Lo que se
// guarda aquí tiene prioridad en los formatos AL; una casilla vacía deja que el
// dato se siga calculando desde el flujo normal.
@Component({
  selector: 'app-ingreso-masivo',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './ingreso-masivo.html',
  styleUrl: './ingreso-masivo.scss'
})
export class IngresoMasivo implements OnInit {
  cursos: any[] = [];
  // Rango de notas guardado en Configuración (el servidor valida con el mismo).
  notaMinima = 0;
  notaMaxima = 10;

  readonly pestanas: { id: Pestana; titulo: string; icono: string; formato: string }[] = [
    { id: 'notas', titulo: 'Notas', icono: 'grading', formato: 'AL14 · AL15 · AL16 · AL19 · AL22' },
    { id: 'examenes', titulo: 'Exámenes de grado', icono: 'school', formato: 'AL23' },
    { id: 'asistencias', titulo: 'Asistencias', icono: 'fact_check', formato: 'AL18' }
  ];
  readonly materiasNotas = MATERIAS_NOTAS;
  readonly materiasExamen = MATERIAS_EXAMEN;

  pestana: Pestana = 'notas';
  cursoId: number | null = null;
  estudiantes: EstudianteRapido[] = [];
  cargando = false;
  guardando = false;
  sinGuardar = false;

  // Valores de la tabla. Claves: "matricula|materia|semestre" (notas),
  // "matricula|materia" (exámenes) y "matricula" (asistencia).
  notas: Record<string, Valor> = {};
  examenes: Record<string, Valor> = {};
  asistencias: Record<string, Valor> = {};
  semestre: 1 | 2 = 1;

  // Atajo "aplicar a toda la columna" / "aplicar a todos".
  columnaMasiva: ClaveMateria = 'TEORIA';
  valorMasivo: Valor = null;

  constructor(
    private servicio: IngresoRapidoService,
    private cursoService: CursoService,
    private configuracionService: ConfiguracionService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => { this.cursos = cursos; this.cdr.detectChanges(); },
      error: () => this.snackBar.open('Error al cargar los cursos', 'OK', { duration: 3000 })
    });
    this.configuracionService.obtener().subscribe({
      next: (config) => {
        this.notaMinima = config.notaMinima;
        this.notaMaxima = config.notaMaxima;
        this.cdr.detectChanges();
      }
    });
  }

  async volver() {
    if (await this.puedeDescartar()) this.router.navigate(['/dashboard']);
  }

  // ── Claves de las casillas ──

  claveNota(matriculaId: number, materia: ClaveMateria, semestre: number = this.semestre): string {
    return `${matriculaId}|${materia}|${semestre}`;
  }

  claveExamen(matriculaId: number, materia: ClaveMateria): string {
    return `${matriculaId}|${materia}`;
  }

  get columnasActuales(): ColumnaMateria[] {
    return this.pestana === 'examenes' ? this.materiasExamen : this.materiasNotas;
  }

  get pestanaActual() {
    return this.pestanas.find((p) => p.id === this.pestana)!;
  }

  // ── Validación ──

  fueraDeRango(valor: Valor): boolean {
    if (valor === null || valor === undefined) return false;
    return valor < this.notaMinima || valor > this.notaMaxima;
  }

  porcentajeInvalido(valor: Valor): boolean {
    if (valor === null || valor === undefined) return false;
    return valor < 0 || valor > 100;
  }

  get hayErrores(): boolean {
    if (this.pestana === 'notas') return Object.values(this.notas).some((v) => this.fueraDeRango(v));
    if (this.pestana === 'examenes') return Object.values(this.examenes).some((v) => this.fueraDeRango(v));
    return Object.values(this.asistencias).some((v) => this.porcentajeInvalido(v));
  }

  get valorMasivoInvalido(): boolean {
    return this.pestana === 'asistencias'
      ? this.porcentajeInvalido(this.valorMasivo)
      : this.fueraDeRango(this.valorMasivo);
  }

  // Promedio del AL23: media de las notas presentes del estudiante.
  promedioExamen(matriculaId: number): string {
    const valores = this.materiasExamen
      .map((m) => this.examenes[this.claveExamen(matriculaId, m.clave)])
      .filter((v): v is number => v !== null && v !== undefined && !this.fueraDeRango(v));
    if (valores.length === 0) return '—';
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    return promedio % 1 === 0 ? String(promedio) : promedio.toFixed(2);
  }

  marcarCambio() {
    this.sinGuardar = true;
  }

  // ── Navegación: pestañas y curso ──

  async cambiarPestana(id: Pestana) {
    if (id === this.pestana) return;
    if (!(await this.puedeDescartar())) return;
    this.pestana = id;
    this.valorMasivo = null;
    this.columnaMasiva = 'TEORIA';
    this.cargar();
  }

  async cambiarCurso(id: number | null) {
    const anterior = this.cursoId;
    this.cursoId = id;
    this.cdr.detectChanges();
    if (!(await this.puedeDescartar())) {
      // Revertir el selector si el usuario decide conservar los cambios.
      this.cursoId = anterior;
      this.cdr.detectChanges();
      return;
    }
    this.cargar();
  }

  private puedeDescartar(): Promise<boolean> {
    if (!this.sinGuardar) return Promise.resolve(true);
    return new Promise((resolve) => {
      this.dialog.open(ConfirmDialog, {
        width: '400px',
        data: {
          titulo: 'Cambios sin guardar',
          mensaje: 'Hay notas escritas que todavía no se guardaron. Si continúas, se perderán.',
          confirmText: 'Descartar cambios',
          cancelText: 'Seguir editando',
          icon: 'warning'
        }
      }).afterClosed().subscribe((ok) => resolve(!!ok));
    });
  }

  cargar() {
    this.estudiantes = [];
    this.notas = {};
    this.examenes = {};
    this.asistencias = {};
    this.sinGuardar = false;
    if (this.cursoId === null) {
      this.cdr.detectChanges();
      return;
    }
    const cursoId = this.cursoId;
    this.cargando = true;
    this.cdr.detectChanges();

    const fin = () => { this.cargando = false; this.cdr.detectChanges(); };
    const error = (e: any) => {
      this.snackBar.open(e?.error?.error || 'Error al cargar los datos del curso', 'OK', { duration: 3500 });
    };

    if (this.pestana === 'notas') {
      this.servicio.obtenerNotas(cursoId).pipe(finalize(fin)).subscribe({
        next: ({ estudiantes, registros }) => {
          this.estudiantes = estudiantes;
          for (const r of registros) this.notas[this.claveNota(r.matriculaId, r.materia, r.semestre)] = r.nota;
        },
        error
      });
    } else if (this.pestana === 'examenes') {
      this.servicio.obtenerExamenes(cursoId).pipe(finalize(fin)).subscribe({
        next: ({ estudiantes, registros }) => {
          this.estudiantes = estudiantes;
          for (const r of registros) this.examenes[this.claveExamen(r.matriculaId, r.materia)] = r.nota;
        },
        error
      });
    } else {
      this.servicio.obtenerAsistencias(cursoId).pipe(finalize(fin)).subscribe({
        next: ({ estudiantes, registros }) => {
          this.estudiantes = estudiantes;
          for (const r of registros) this.asistencias[String(r.matriculaId)] = r.porcentaje;
        },
        error
      });
    }
  }

  // ── Atajos ──

  // Escribe el mismo valor en toda una columna (o en toda la asistencia);
  // después cada casilla se puede corregir a mano.
  aplicarATodos() {
    if (this.valorMasivo === null || this.valorMasivoInvalido) return;
    const valor = this.valorMasivo;
    for (const e of this.estudiantes) {
      if (this.pestana === 'notas') this.notas[this.claveNota(e.id, this.columnaMasiva)] = valor;
      else if (this.pestana === 'examenes') this.examenes[this.claveExamen(e.id, this.columnaMasiva)] = valor;
      else this.asistencias[String(e.id)] = valor;
    }
    this.marcarCambio();
    const destino = this.pestana === 'asistencias'
      ? 'todos los estudiantes'
      : `la columna ${this.columnasActuales.find((c) => c.clave === this.columnaMasiva)?.nombre}`;
    this.snackBar.open(`Se aplicó ${valor} a ${destino}`, 'OK', { duration: 2500 });
  }

  copiarPrimerSemestre() {
    const ocupadas = this.estudiantes.some((e) =>
      this.materiasNotas.some((m) => this.notas[this.claveNota(e.id, m.clave, 2)] != null)
    );
    if (!ocupadas) {
      this.copiarSemestre();
      return;
    }
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        titulo: 'Reemplazar el Segundo Semestre',
        mensaje: 'El Segundo Semestre ya tiene notas escritas. Se reemplazarán por las del Primer Semestre.',
        confirmText: 'Copiar y reemplazar',
        cancelText: 'Cancelar',
        icon: 'content_copy'
      }
    }).afterClosed().subscribe((ok) => {
      if (ok) this.copiarSemestre();
    });
  }

  private copiarSemestre() {
    for (const e of this.estudiantes) {
      for (const m of this.materiasNotas) {
        this.notas[this.claveNota(e.id, m.clave, 2)] = this.notas[this.claveNota(e.id, m.clave, 1)] ?? null;
      }
    }
    this.semestre = 2;
    this.marcarCambio();
    this.snackBar.open('Notas copiadas al Segundo Semestre. Revísalas y pulsa Guardar.', 'OK', { duration: 3500 });
    this.cdr.detectChanges();
  }

  // Enter baja a la misma columna de la fila siguiente, como en una hoja de cálculo.
  bajar(evento: Event, fila: number, columna: number) {
    evento.preventDefault();
    const siguiente = this.host.nativeElement.querySelector<HTMLInputElement>(
      `input[data-fila="${fila + 1}"][data-col="${columna}"]`
    );
    siguiente?.focus();
    siguiente?.select();
  }

  // ── Limpiar ──

  // Borra en la base todos los datos de la pestaña actual para el curso elegido,
  // previa confirmación. Los AL vuelven a calcularse desde el flujo normal.
  limpiar() {
    if (this.cursoId === null || this.guardando) return;
    const cursoId = this.cursoId;
    const tipo = this.pestana;
    const curso = this.cursos.find((c) => c.id === cursoId);
    const nombreCurso = curso ? `${curso.ramaArtesanal} — ${curso.anioFormativo}` : 'este curso';
    const que = tipo === 'notas'
      ? 'todas las notas (ambos semestres)'
      : tipo === 'examenes' ? 'todas las notas de exámenes de grado' : 'todos los porcentajes de asistencia';

    this.dialog.open(ConfirmDialog, {
      width: '440px',
      data: {
        titulo: '¿Realmente quiere borrar todos los datos?',
        mensaje: `Se borrarán ${que} ingresadas aquí para ${nombreCurso}. Los documentos AL volverán a usar el cálculo normal. Esta acción no se puede deshacer.`,
        confirmText: 'Sí, borrar todo',
        cancelText: 'Cancelar',
        icon: 'delete_sweep'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.guardando = true;
      this.cdr.detectChanges();
      this.servicio.limpiar(tipo, cursoId)
        .pipe(finalize(() => { this.guardando = false; this.cdr.detectChanges(); }))
        .subscribe({
          next: (res) => {
            this.snackBar.open(`Datos borrados (${res.borrados} registro(s))`, 'OK', { duration: 3000 });
            this.cargar();
          },
          error: (e) => this.snackBar.open(e?.error?.error || 'Error al borrar los datos', 'OK', { duration: 4000 })
        });
    });
  }

  // ── Guardar ──

  guardar() {
    if (this.cursoId === null || this.hayErrores || this.guardando) return;
    const cursoId = this.cursoId;
    const valor = (v: Valor | undefined): Valor => (v === undefined ? null : v);
    let peticion: Observable<any>;

    if (this.pestana === 'notas') {
      // Se envían ambos semestres: lo copiado al segundo también se guarda.
      peticion = this.servicio.guardarNotas(cursoId, this.estudiantes.flatMap((e) =>
        [1, 2].flatMap((semestre) => this.materiasNotas.map((m) => ({
          matriculaId: e.id, materia: m.clave, semestre,
          nota: valor(this.notas[this.claveNota(e.id, m.clave, semestre)])
        })))
      ));
    } else if (this.pestana === 'examenes') {
      peticion = this.servicio.guardarExamenes(cursoId, this.estudiantes.flatMap((e) =>
        this.materiasExamen.map((m) => ({
          matriculaId: e.id, materia: m.clave,
          nota: valor(this.examenes[this.claveExamen(e.id, m.clave)])
        }))
      ));
    } else {
      peticion = this.servicio.guardarAsistencias(cursoId, this.estudiantes.map((e) => ({
        matriculaId: e.id, porcentaje: valor(this.asistencias[String(e.id)])
      })));
    }

    this.guardando = true;
    this.cdr.detectChanges();
    peticion.pipe(finalize(() => { this.guardando = false; this.cdr.detectChanges(); })).subscribe({
      next: (res) => {
        this.sinGuardar = false;
        this.snackBar.open(res?.message || 'Guardado', 'OK', { duration: 3000 });
      },
      error: (e) => {
        this.snackBar.open(e?.error?.error || 'Error al guardar', 'OK', { duration: 4000 });
      }
    });
  }
}
