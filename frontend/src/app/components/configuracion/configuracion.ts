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
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfiguracionService, Configuracion } from '../../services/configuracion';
import { CursoService } from '../../services/curso';
import { UsuarioService } from '../../services/usuario';
import { AcademicoService } from '../../services/academico';
import { FinanzasService, ConceptoPago, dinero } from '../../services/finanzas';
import { LoadingService } from '../../services/loading';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

// Fila editable de la programación académica de una materia.
interface FilaProgramacion {
  materiaId: number;
  nombre: string;
  grupo: string | null; // 'Práctica' | 'Teoría' para submaterias
  fechaInicio: string; // yyyy-MM-dd o ''
  fechaFin: string;
  horasTotales: number | null;
  docenteId: number | null;
}

@Component({
  selector: 'app-configuracion',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
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

  // Índice de secciones de la página (todo en un solo scroll).
  secciones = [
    { id: 'calificaciones', titulo: 'Calificaciones', icono: 'tune' },
    { id: 'supletorios', titulo: 'Supletorios', icono: 'event_available' },
    { id: 'examen-grado', titulo: 'Exámenes de grado', icono: 'school' },
    { id: 'fechas', titulo: 'Registro de fechas', icono: 'event_note' },
    { id: 'finanzas', titulo: 'Finanzas', icono: 'payments' }
  ];

  // ── Registro de fechas (programación académica) ──
  cursos: any[] = [];
  docentes: any[] = [];
  progCursoId: number | null = null;
  progMaterias: FilaProgramacion[] = [];
  progCargado = false;
  progGuardando = false;

  // ── Finanzas (conceptos de pago) ──
  conceptos: ConceptoPago[] = [];
  conceptoNombre = '';
  conceptoMonto: number | null = null;
  conceptoFecha = '';   // yyyy-MM-dd
  conceptoGuardando = false;
  dinero = dinero;

  constructor(
    private configService: ConfiguracionService,
    private cursoService: CursoService,
    private usuarioService: UsuarioService,
    private academicoService: AcademicoService,
    private finanzasService: FinanzasService,
    private loadingService: LoadingService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargar();
    this.cargarPermisos();
    this.cargarPermisosExamen();
    this.cargarConceptos();
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => { this.cursos = cursos; this.cdr.detectChanges(); },
      error: () => { /* silencioso: el selector queda vacío */ }
    });
    this.usuarioService.listarDocentes().subscribe({
      next: (docentes) => { this.docentes = docentes; this.cdr.detectChanges(); },
      error: () => { /* silencioso: el selector queda vacío */ }
    });
  }

  // Salta a una sección de la página.
  irA(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Registro de fechas ──

  onProgCurso() {
    this.progMaterias = [];
    this.progCargado = false;
    if (this.progCursoId === null) return;

    this.loadingService.mostrar();
    this.academicoService.materiasCurso(this.progCursoId)
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: (curso) => {
          this.progMaterias = curso.materias.map((m) => ({
            materiaId: m.id,
            nombre: m.nombre,
            grupo: m.esSubmateria ? m.materiaParent : null,
            fechaInicio: this.soloFecha(m.fechaInicio),
            fechaFin: this.soloFecha(m.fechaFin),
            horasTotales: m.horasTotales,
            docenteId: m.profesorId
          }));
          this.progCargado = true;
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.snackBar.open(e?.error?.error || 'Error al cargar las materias', 'OK', { duration: 3000 });
          this.cdr.detectChanges();
        }
      });
  }

  guardarProgramacion() {
    // Validación en cliente (el backend revalida)
    for (const m of this.progMaterias) {
      if (!!m.fechaInicio !== !!m.fechaFin) {
        this.snackBar.open(`${m.nombre}: indica la fecha de inicio y la de fin, o deja ambas vacías`, 'OK', { duration: 4000 });
        return;
      }
      if (m.fechaInicio && m.fechaFin <= m.fechaInicio) {
        this.snackBar.open(`${m.nombre}: la fecha de fin debe ser posterior a la de inicio`, 'OK', { duration: 4000 });
        return;
      }
      if (m.horasTotales !== null && (!Number.isInteger(Number(m.horasTotales)) || Number(m.horasTotales) <= 0)) {
        this.snackBar.open(`${m.nombre}: las horas totales deben ser un entero mayor que cero`, 'OK', { duration: 4000 });
        return;
      }
    }

    this.progGuardando = true;
    this.loadingService.mostrar();
    this.academicoService.guardarProgramacion(
      this.progMaterias.map((m) => ({
        materiaId: m.materiaId,
        fechaInicio: m.fechaInicio || null,
        fechaFin: m.fechaFin || null,
        horasTotales: m.horasTotales === null || (m.horasTotales as any) === '' ? null : Number(m.horasTotales),
        docenteId: m.docenteId
      }))
    ).pipe(finalize(() => this.loadingService.ocultar())).subscribe({
      next: () => {
        this.progGuardando = false;
        this.snackBar.open('Programación guardada', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.progGuardando = false;
        this.snackBar.open(e?.error?.error || 'Error al guardar la programación', 'OK', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Finanzas: conceptos de pago ──

  cargarConceptos() {
    this.finanzasService.listarConceptos().subscribe({
      next: (conceptos) => {
        this.conceptos = conceptos;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso: la lista queda vacía */ }
    });
  }

  crearConcepto() {
    const nombre = this.conceptoNombre.trim();
    const monto = Number(this.conceptoMonto);
    if (!nombre) {
      this.snackBar.open('Escribe el nombre del concepto', 'OK', { duration: 3000 });
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      this.snackBar.open('El monto debe ser mayor que cero', 'OK', { duration: 3000 });
      return;
    }
    if (!this.conceptoFecha) {
      this.snackBar.open('Indica la fecha máxima de pago', 'OK', { duration: 3000 });
      return;
    }

    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        titulo: 'Crear concepto de pago',
        mensaje: `Se cobrará "${nombre}" por ${dinero(monto)} a todos los estudiantes con matrícula activa. ¿Continuar?`,
        confirmText: 'Crear concepto',
        cancelText: 'Cancelar',
        icon: 'add_card'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.conceptoGuardando = true;
      this.loadingService.mostrar();
      this.finanzasService.crearConcepto({ nombre, monto, fechaMaxima: this.conceptoFecha })
        .pipe(finalize(() => this.loadingService.ocultar()))
        .subscribe({
          next: (res) => {
            this.conceptoGuardando = false;
            this.conceptoNombre = '';
            this.conceptoMonto = null;
            this.conceptoFecha = '';
            this.snackBar.open(res?.message || 'Concepto creado', 'OK', { duration: 4000 });
            this.cargarConceptos();
            this.cdr.detectChanges();
          },
          error: (e) => {
            this.conceptoGuardando = false;
            this.snackBar.open(e?.error?.error || 'Error al crear el concepto', 'OK', { duration: 4000 });
            this.cdr.detectChanges();
          }
        });
    });
  }

  eliminarConcepto(concepto: ConceptoPago) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        titulo: 'Eliminar concepto',
        mensaje: `¿Eliminar "${concepto.nombre}"? Se quitará de todos los estudiantes. Solo es posible si aún no tiene pagos ni comprobantes.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        icon: 'delete'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // El indicador de carga lo muestra el interceptor (petición DELETE).
      this.finanzasService.eliminarConcepto(concepto.id).subscribe({
        next: () => {
          this.snackBar.open('Concepto eliminado', 'OK', { duration: 3000 });
          this.cargarConceptos();
        },
        error: (e) => {
          this.snackBar.open(e?.error?.error || 'Error al eliminar el concepto', 'OK', { duration: 4000 });
          this.cdr.detectChanges();
        }
      });
    });
  }

  irAFinanzas() {
    this.router.navigate(['/finanzas']);
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
    this.loadingService.mostrar();
    this.configService.obtener().pipe(finalize(() => this.loadingService.ocultar())).subscribe({
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
        // /configuracion#finanzas abre directamente esa sección.
        const fragmento = this.route.snapshot.fragment;
        if (fragmento) setTimeout(() => this.irA(fragmento));
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
