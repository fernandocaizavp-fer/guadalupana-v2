import { Component, OnInit, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CursoService } from '../../../services/curso';
import { SuplетorioService } from '../../../services/supletorio';
import { BotonCalendario, lugarFechaHoy } from '../../../shared/lugar-fecha/lugar-fecha';
import { ConCambiosSinGuardar, avisarAlCerrar, Instantanea } from '../../../shared/cambios-sin-guardar';
import { NotificacionService } from '../../../services/notificacion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';

@Component({
  selector: 'app-ingresar-supletorios',
  imports: [Esqueleto, MatTooltipModule, FormsModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, BotonCalendario],
  templateUrl: './ingresar-supletorios.html',
  styleUrl: './ingresar-supletorios.scss'
})
export class IngresarSupletorios implements OnInit, ConCambiosSinGuardar {
  private notificacion = inject(NotificacionService);

  // Foto del estado editable al cargar y al guardar (aviso de cambios sin guardar).
  private instantanea = new Instantanea();

  hayCambiosSinGuardar(): boolean {
    return this.instantanea.cambio(this.supletorios);
  }

  @HostListener('window:beforeunload', ['$event'])
  alCerrarPestana(evento: BeforeUnloadEvent) {
    avisarAlCerrar(evento, this.hayCambiosSinGuardar());
  }

  cursoId = 0;
  curso: any = null;
  matriculas: any[] = [];
  materias: any[] = [];
  loading = true;
  guardando = false;
  lugarFecha = lugarFechaHoy();
  jornada = 'MATUTINA';

  // supletorios[matriculaId][materiaId] = valor
  supletorios: { [key: number]: { [key: number]: string } } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private suplетorioService: SuplетorioService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cursoId = Number(this.route.snapshot.paramMap.get('cursoId'));
    this.cursoService.obtenerCurso(this.cursoId).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.materias = curso.materias || [];
        this.matriculas = curso.matriculas || [];

        this.matriculas.forEach((m: any) => {
          this.supletorios[m.id] = {};
          this.materias.forEach((mat: any) => {
            this.supletorios[m.id][mat.id] = '';
          });
        });
        this.instantanea.fijar(this.supletorios);

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
    this.guardando = true;
    const data: any[] = [];

    this.matriculas.forEach(m => {
      this.materias.forEach(mat => {
        const valor = this.supletorios[m.id]?.[mat.id];
        if (valor !== '' && valor !== null && valor !== undefined) {
          data.push({
            matriculaId: m.id,
            materiaId: mat.id,
            valor: Number(valor)
          });
        }
      });
    });

    this.suplетorioService.guardarMasivo(data).subscribe({
      next: () => {
        this.guardando = false;
        this.instantanea.fijar(this.supletorios);
        this.notificacion.exito('Supletorios guardados');
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.notificacion.error('Error al guardar');
        this.cdr.detectChanges();
      }
    });
  }

  descargarAL15() {
    if (!this.lugarFecha) {
      this.notificacion.info('Ingresa el lugar y fecha');
      return;
    }
    this.suplетorioService.generarAL15(this.cursoId, this.lugarFecha, this.jornada).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL15_${this.curso?.ramaArtesanal}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notificacion.error('Error al generar AL15')
    });
  }

  volver() {
    this.router.navigate(['/cursos', this.cursoId]);
  }
}