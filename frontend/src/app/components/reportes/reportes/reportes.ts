import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CursoService } from '../../../services/curso';
import { AsistenciaService } from '../../../services/asistencia';
import { TareaService } from '../../../services/tarea';
import { SuplетorioService } from '../../../services/supletorio';
import { ReporteService } from '../../../services/reporte';
import { ExamenGradoService } from '../../../services/examen-grado';
import { calcularDisciplinaPonderada } from '../../../services/disciplina-util';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatSelectModule,
    MatFormFieldModule, MatInputModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes implements OnInit {
  cursos: any[] = [];
  seccionActiva: string | null = null;

  // Asistencia
  cursoSeleccionado: number | null = null;
  resumen: any[] = [];
  totalClases = 0;
  loading = false;
  lugarFecha = '';
  jornada = 'MATUTINA';
  observaciones: { [key: number]: string } = {};

  // Calificaciones AL14
  cursoCalificaciones: number | null = null;
  semestreCalificaciones = 1;
  resumenCalificaciones: any[] = [];
  materiasCalificaciones: any[] = [];
  todasMateriasCalificaciones: any[] = [];
  loadingCalificaciones = false;
  lugarFechaCalificaciones = '';

  // Cuadro Final AL15
  cursoAL15: number | null = null;
  lugarFechaAL15 = '';
  jornadaAL15 = 'MATUTINA';

  // Nómina AL9
  cursoAL9: number | null = null;
  lugarFechaAL9 = '';
  jornadaAL9 = 'MATUTINA';
  regimenAL9 = 'SIERRA';

  // Examen Grado AL23
  cursoAL23: number | null = null;
  lugarFechaAL23 = '';
  jornadaAL23 = 'MATUTINA';
  loadingAL23 = false;
  resumenAL23: any[] = [];
  materiasAL23: any[] = [];
  todasMateriasAL23: any[] = [];

  // Proyectos Productivos AL19
  cursoAL19: number | null = null;
  lugarFechaAL19 = '';
  jornadaAL19 = 'MATUTINA';

  // Certificado de Promoción AL16 (individual por estudiante)
  cursoAL16: number | null = null;
  lugarFechaAL16 = '';
  jornadaAL16 = 'MATUTINA';
  estudiantesAL16: any[] = [];
  loadingAL16 = false;
  descargandoAL16: number | null = null;

  // Cuadro Aprobados y No Aprobados AL22
  cursoAL22: number | null = null;
  lugarFechaAL22 = '';
  jornadaAL22 = 'MATUTINA';
  regimenAL22 = 'SIERRA';

  constructor(
    private router: Router,
    private cursoService: CursoService,
    private asistenciaService: AsistenciaService,
    private tareaService: TareaService,
    private suplетorioService: SuplетorioService,
    private reporteService: ReporteService,
    private examenGradoService: ExamenGradoService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cursoService.listarCursos().subscribe({
      next: (cursos: any[]) => {
        this.cursos = cursos;
        this.cdr.detectChanges();
      }
    });
  }

  abrirSeccion(seccion: string) {
    this.seccionActiva = seccion;
    this.cdr.detectChanges();
  }

  // ── ASISTENCIA ───────────────────────────────────────
  seleccionarCurso() {
    if (!this.cursoSeleccionado) return;
    this.loading = true;
    this.asistenciaService.getResumenAsistenciaCurso(this.cursoSeleccionado).subscribe({
      next: (data: any) => {
        this.resumen = data.resumen;
        this.totalClases = data.totalClases;
        this.resumen.forEach(e => {
          this.observaciones[e.id] = e.observacion || '';
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

  guardarObservacion(matriculaId: number) {
    this.asistenciaService.guardarObservacion({
      matriculaId,
      cursoId: this.cursoSeleccionado,
      observacion: this.observaciones[matriculaId] || ''
    }).subscribe({
      next: () => this.snackBar.open('Observación guardada', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Error al guardar', 'OK', { duration: 2000 })
    });
  }

  descargarAL18() {
    if (!this.cursoSeleccionado || !this.lugarFecha) {
      this.snackBar.open('Completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.asistenciaService.generarAL18(this.cursoSeleccionado, this.lugarFecha, this.jornada).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoSeleccionado);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL18_${curso?.ramaArtesanal || 'asistencia'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL18', 'OK', { duration: 3000 })
    });
  }

  getColorPorcentaje(porcentaje: number): string {
    if (porcentaje >= 90) return '#2e7d32';
    if (porcentaje >= 75) return '#f57f17';
    return '#c62828';
  }

  // ── CALIFICACIONES AL14 ──────────────────────────────
  seleccionarCursoCalificaciones() {
    if (!this.cursoCalificaciones) return;
    this.loadingCalificaciones = true;
    this.tareaService.getNotasCursoSemestre(
      this.cursoCalificaciones,
      this.semestreCalificaciones
    ).subscribe({
      next: (data: any) => {
        this.todasMateriasCalificaciones = data.todasMaterias;
        this.materiasCalificaciones = data.materias;
        this.resumenCalificaciones = data.matriculas;
        this.loadingCalificaciones = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingCalificaciones = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPromedioMateria(matricula: any, materiaId: number): string {
    const materia = this.materiasCalificaciones.find(m => m.id === materiaId);
    if (!materia) return '-';

    const esPracticaOTeoria =
      materia.nombre.toLowerCase().includes('práctica') ||
      materia.nombre.toLowerCase().includes('practica') ||
      materia.nombre.toLowerCase().includes('teoría') ||
      materia.nombre.toLowerCase().includes('teoria');

    if (esPracticaOTeoria) {
      const submaterias = this.todasMateriasCalificaciones.filter(
        m => m.esSubmateria && m.materiaParent === materia.nombre
      );
      if (submaterias.length === 0) return this.calcularPromedioDirecto(matricula, materiaId);
      const promediosPorSub = submaterias
        .map(sub => this.calcularPromedioDirecto(matricula, sub.id))
        .filter(p => p !== '-')
        .map(p => Number(p));
      if (promediosPorSub.length === 0) return '-';
      const prom = promediosPorSub.reduce((a, b) => a + b, 0) / promediosPorSub.length;
      return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
    }
    return this.calcularPromedioDirecto(matricula, materiaId);
  }

  calcularPromedioDirecto(matricula: any, materiaId: number): string {
    const notas = matricula.notasTarea?.filter((n: any) =>
      n.tarea?.materiaId === materiaId && n.valor !== null
    ) || [];
    if (notas.length === 0) return '-';
    const suma = notas.reduce((a: number, b: any) => a + b.valor, 0);
    const prom = suma / notas.length;
    return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
  }

  getNotaDisciplina(matricula: any): string {
    const prom = calcularDisciplinaPonderada(matricula.notasDisciplina || []);
    if (prom === null) return '-';
    return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
  }

  get tieneMateriaDiscipilna(): boolean {
    return this.materiasCalificaciones.some(
      m => m.nombre.toLowerCase().includes('disciplina')
    );
  }

  getPromedioGeneral(matricula: any): string {
    const valores: number[] = [];
    for (const materia of this.materiasCalificaciones) {
      let val: string;
      if (materia.nombre.toLowerCase().includes('disciplina')) {
        val = this.getNotaDisciplina(matricula);
      } else {
        val = this.getPromedioMateria(matricula, materia.id);
      }
      if (val !== '-') valores.push(Number(val));
    }
    if (!this.tieneMateriaDiscipilna) {
      const disc = this.getNotaDisciplina(matricula);
      if (disc !== '-') valores.push(Number(disc));
    }
    if (valores.length === 0) return '-';
    const prom = valores.reduce((a, b) => a + b, 0) / valores.length;
    return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
  }

  descargarAL14() {
    if (!this.cursoCalificaciones || !this.lugarFechaCalificaciones) {
      this.snackBar.open('Completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.tareaService.descargarAL14(
      this.cursoCalificaciones,
      this.lugarFechaCalificaciones,
      this.semestreCalificaciones
    ).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoCalificaciones);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL14_${curso?.ramaArtesanal}_S${this.semestreCalificaciones}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL14', 'OK', { duration: 3000 })
    });
  }

  // ── CUADRO FINAL AL15 ────────────────────────────────
  descargarAL15() {
    if (!this.cursoAL15 || !this.lugarFechaAL15) {
      this.snackBar.open('Selecciona curso y completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.suplетorioService.generarAL15(this.cursoAL15, this.lugarFechaAL15, this.jornadaAL15).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoAL15);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL15_${curso?.ramaArtesanal || 'cuadro_final'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL15', 'OK', { duration: 3000 })
    });
  }

  // ── NÓMINA AL9 ───────────────────────────────────────
  descargarAL9() {
    if (!this.cursoAL9 || !this.lugarFechaAL9) {
      this.snackBar.open('Selecciona curso y completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.reporteService.generarAL9(
      this.cursoAL9,
      this.lugarFechaAL9,
      this.jornadaAL9,
      this.regimenAL9
    ).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoAL9);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL9_${curso?.ramaArtesanal || 'nomina'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL9', 'OK', { duration: 3000 })
    });
  }

  // ── EXAMEN GRADO AL23 ────────────────────────────────
  seleccionarCursoAL23() {
    if (!this.cursoAL23) return;
    this.loadingAL23 = true;
    this.examenGradoService.getPorCurso(this.cursoAL23).subscribe({
      next: (data: any) => {
        this.todasMateriasAL23 = data.todasMaterias;
        this.materiasAL23 = data.materias.filter(
          (m: any) => !m.nombre.toLowerCase().includes('disciplina')
        );
        this.resumenAL23 = data.matriculas;
        this.loadingAL23 = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error AL23:', err);
        this.loadingAL23 = false;
        this.cdr.detectChanges();
      }
    });
  }

  getExamenMateria(matricula: any, materiaId: number): string {
    const materia = this.materiasAL23.find(m => m.id === materiaId);
    if (!materia) return '-';
    const esPracticaOTeoria =
      materia.nombre.toLowerCase().includes('práctica') ||
      materia.nombre.toLowerCase().includes('practica') ||
      materia.nombre.toLowerCase().includes('teoría') ||
      materia.nombre.toLowerCase().includes('teoria');
    if (esPracticaOTeoria) {
      const submaterias = this.todasMateriasAL23.filter(
        (m: any) => m.esSubmateria && m.materiaParent === materia.nombre
      );
      const notas = submaterias
        .map((sub: any) => {
          const e = matricula.examenesGrado?.find((eg: any) => eg.materiaId === sub.id);
          return e?.valor ?? null;
        })
        .filter((v: any) => v !== null) as number[];
      if (notas.length === 0) return '-';
      const prom = notas.reduce((a, b) => a + b, 0) / notas.length;
      return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
    }
    const examen = matricula.examenesGrado?.find((e: any) => e.materiaId === materiaId);
    if (examen?.valor === null || examen?.valor === undefined) return '-';
    return examen.valor % 1 === 0 ? String(examen.valor) : examen.valor.toFixed(1);
  }

  getPromedioExamen(matricula: any): string {
    const valores = this.materiasAL23
      .map(m => this.getExamenMateria(matricula, m.id))
      .filter(v => v !== '-')
      .map(v => Number(v));
    if (valores.length === 0) return '-';
    const prom = valores.reduce((a, b) => a + b, 0) / valores.length;
    return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
  }

  get tieneMateriaDiscipilnaAL23(): boolean {
    return this.materiasAL23.some(m => m.nombre.toLowerCase().includes('disciplina'));
  }

  descargarAL23() {
    if (!this.cursoAL23 || !this.lugarFechaAL23) {
      this.snackBar.open('Completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.examenGradoService.generarAL23(
      this.cursoAL23,
      this.lugarFechaAL23,
      this.jornadaAL23
    ).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoAL23);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL23_${curso?.ramaArtesanal || 'examen_grado'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL23', 'OK', { duration: 3000 })
    });
  }

  // ── PROYECTOS PRODUCTIVOS AL19 ────────────────────────
  descargarAL19() {
    if (!this.cursoAL19 || !this.lugarFechaAL19) {
      this.snackBar.open('Completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.suplетorioService.generarAL19(
      this.cursoAL19,
      this.lugarFechaAL19,
      this.jornadaAL19
    ).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoAL19);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL19_${curso?.ramaArtesanal || 'proyectos'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL19', 'OK', { duration: 3000 })
    });
  }

  // ── CERTIFICADO DE PROMOCIÓN AL16 ────────────────────
  seleccionarCursoAL16() {
    if (!this.cursoAL16) return;
    this.loadingAL16 = true;
    this.estudiantesAL16 = [];
    this.cursoService.obtenerCurso(this.cursoAL16).subscribe({
      next: (curso: any) => {
        this.estudiantesAL16 = (curso.matriculas || []).sort((a: any, b: any) =>
          (a.apellidos || '').localeCompare(b.apellidos || '')
        );
        this.loadingAL16 = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAL16 = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarAL16(est: any) {
    if (!this.lugarFechaAL16) {
      this.snackBar.open('Completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.descargandoAL16 = est.id;
    this.suplетorioService.generarAL16(est.id, this.lugarFechaAL16, this.jornadaAL16).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL16_${est.apellidos}_${est.nombres}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargandoAL16 = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.descargandoAL16 = null;
        this.snackBar.open('Error al generar AL16', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // ── CUADRO APROBADOS Y NO APROBADOS AL22 ─────────────
  descargarAL22() {
    if (!this.cursoAL22 || !this.lugarFechaAL22) {
      this.snackBar.open('Selecciona curso y completa lugar y fecha', 'OK', { duration: 3000 });
      return;
    }
    this.suplетorioService.generarAL22(
      this.cursoAL22,
      this.lugarFechaAL22,
      this.jornadaAL22,
      this.regimenAL22
    ).subscribe({
      next: (blob: Blob) => {
        const curso = this.cursos.find(c => c.id === this.cursoAL22);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL22_${curso?.ramaArtesanal || 'aprobados'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Error al generar AL22', 'OK', { duration: 3000 })
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}