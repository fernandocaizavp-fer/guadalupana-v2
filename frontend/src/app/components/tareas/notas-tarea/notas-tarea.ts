import { Component, OnInit, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CursoService } from '../../../services/curso';
import { TareaService } from '../../../services/tarea';
import { ConfiguracionService } from '../../../services/configuracion';
import { Title } from '@angular/platform-browser';
import { ConCambiosSinGuardar, avisarAlCerrar } from '../../../shared/cambios-sin-guardar';
import { NotificacionService } from '../../../services/notificacion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';


@Component({
  selector: 'app-notas-tarea',
  imports: [Esqueleto, MatTooltipModule, FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatInputModule, MatFormFieldModule],
  templateUrl: './notas-tarea.html',
  styleUrl: './notas-tarea.scss'
})
export class NotasTarea implements OnInit, ConCambiosSinGuardar {
  private notificacion = inject(NotificacionService);

  // Las notas se guardan al salir de cada casilla; queda "sucia" la que se
  // está escribiendo o una cuyo guardado falló.
  hayCambiosSinGuardar(): boolean {
    return Object.entries(this.notas).some(([id, n]) => {
      const o = this.orig[Number(id)] || { valor: '', observacion: '' };
      const valor = n.valor === null || n.valor === undefined ? '' : String(n.valor);
      return valor !== o.valor || (n.observacion || '') !== o.observacion;
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  alCerrarPestana(evento: BeforeUnloadEvent) {
    avisarAlCerrar(evento, this.hayCambiosSinGuardar());
  }

  materiaId = 0;
  tareaId = 0;
  tarea: any = null;
  matriculas: any[] = [];
  loading = true;
  notaMin = 0;
  notaMax = 10;

  // notas[matriculaId] = { valor, observacion }
  notas: { [key: number]: { valor: string, observacion: string } } = {};

  // Guardado automático: estado del indicador y valores confirmados por estudiante.
  estado: 'idle' | 'guardando' | 'guardado' | 'error' = 'idle';
  private orig: { [id: number]: { valor: string, observacion: string } } = {};
  private fadeTimer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tareaService: TareaService,
    private cursoService: CursoService,
    private configService: ConfiguracionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Calificaciones');
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.tareaId = Number(this.route.snapshot.paramMap.get('tareaId'));
    this.configService.obtener().subscribe({
      next: (c) => { this.notaMin = c.notaMinima; this.notaMax = c.notaMaxima; }
    });
    this.cargarDatos();
  }

  cargarDatos() {
    this.tareaService.getTareasPorMateria(this.materiaId).subscribe({
      next: (tareas) => {
        this.tarea = tareas.find((t: any) => t.id === this.tareaId);
        if (this.tarea) {
          // Cargar estudiantes del curso de la materia
          const cursoId = this.tarea.materia?.cursoId;
          if (cursoId) {
            this.cursoService.obtenerCurso(cursoId).subscribe({
              next: (curso) => {
                this.matriculas = curso.matriculas || [];
                // Inicializar notas
                this.matriculas.forEach((m: any) => {
                  const notaExistente = this.tarea.notas?.find((n: any) => n.matriculaId === m.id);
                  const valor = notaExistente?.valor !== null && notaExistente?.valor !== undefined
                    ? String(notaExistente.valor) : '';
                  const observacion = notaExistente?.observacion || '';
                  this.notas[m.id] = { valor, observacion };
                  this.orig[m.id] = { valor, observacion }; // línea base para detectar cambios
                });
                this.loading = false;
                this.cdr.detectChanges();
              }
            });
          }
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Guardado automático de la nota/observación de un estudiante (al salir del campo).
  guardarUno(matriculaId: number) {
    const n = this.notas[matriculaId];
    if (!n) return;
    const o = this.orig[matriculaId] || { valor: '', observacion: '' };
    const valorStr = (n.valor === null || n.valor === undefined) ? '' : String(n.valor);
    const obs = n.observacion || '';
    if (valorStr === o.valor && obs === o.observacion) return; // sin cambios: no guarda

    this.estado = 'guardando';
    this.cdr.detectChanges();
    this.tareaService.guardarNotas([{
      tareaId: this.tareaId,
      matriculaId,
      valor: valorStr,            // '' => el backend lo guarda como null (sin nota)
      observacion: obs || null
    }]).subscribe({
      next: () => {
        this.orig[matriculaId] = { valor: valorStr, observacion: obs };
        this.marcarGuardado();
      },
      error: (e) => {
        this.notas[matriculaId].valor = o.valor;
        this.notas[matriculaId].observacion = o.observacion;
        this.estado = 'error';
        this.notificacion.error(e?.error?.error || 'Error al guardar la nota');
        this.cdr.detectChanges();
      }
    });
  }

  private marcarGuardado() {
    this.estado = 'guardado';
    this.cdr.detectChanges();
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => { this.estado = 'idle'; this.cdr.detectChanges(); }, 2500);
  }

  volver() {
    this.router.navigate(['/tareas', this.materiaId]);
  }
}