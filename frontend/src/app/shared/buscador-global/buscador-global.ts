import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatriculaService } from '../../services/matricula';
import { CarnetDigitalDialog } from '../carnet-digital/carnet-digital';

export interface EstudianteEncontrado {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  matriculaNo: string;
  usuarioId: number;
  cursoId: number;
  curso: { id: number; ramaArtesanal: string; anioFormativo: string };
  usuario?: { id: number; correo: string; fotoUrl: string | null };
}

export interface CursoEncontrado {
  id: number;
  ramaArtesanal: string;
  anioFormativo: string;
  fechaInicio: string;
  fechaFin: string;
  _count?: { matriculas: number; materias: number };
}

@Component({
  selector: 'app-buscador-global-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './buscador-global.html',
  styleUrls: ['./buscador-global.scss']
})
export class BuscadorGlobalDialog implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<BuscadorGlobalDialog>);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private matriculaService = inject(MatriculaService);

  textoBusqueda = '';
  cargando = signal(false);
  estudiantes = signal<EstudianteEncontrado[]>([]);
  cursos = signal<CursoEncontrado[]>([]);
  busquedaRealizada = signal(false);

  private busquedaSubject = new Subject<string>();
  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.busquedaSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => {
        if (!q || q.trim().length < 2) {
          this.cargando.set(false);
          this.estudiantes.set([]);
          this.cursos.set([]);
          this.busquedaRealizada.set(false);
          return [];
        }
        this.cargando.set(true);
        this.busquedaRealizada.set(true);
        return this.matriculaService.buscarGlobal(q.trim());
      })
    ).subscribe({
      next: (res) => {
        this.estudiantes.set(res?.estudiantes || []);
        this.cursos.set(res?.cursos || []);
        this.cargando.set(false);
      },
      error: () => {
        this.estudiantes.set([]);
        this.cursos.set([]);
        this.cargando.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  alEscribir(valor: string) {
    this.busquedaSubject.next(valor);
  }

  limpiar() {
    this.textoBusqueda = '';
    this.alEscribir('');
  }

  verCarnet(est: EstudianteEncontrado, event: MouseEvent) {
    event.stopPropagation();
    this.matriculaService.obtenerMatricula(est.id).subscribe({
      next: (completa) => {
        this.dialog.open(CarnetDigitalDialog, {
          width: '560px',
          maxWidth: '96vw',
          data: {
            matricula: completa || { ...est, curso: est.curso },
            fotoUrl: completa?.usuario?.fotoUrl || est.usuario?.fotoUrl
          }
        });
      },
      error: () => {
        this.dialog.open(CarnetDigitalDialog, {
          width: '560px',
          maxWidth: '96vw',
          data: {
            matricula: { ...est, curso: est.curso },
            fotoUrl: est.usuario?.fotoUrl
          }
        });
      }
    });
  }

  irACurso(cursoId: number) {
    this.dialogRef.close();
    this.router.navigate(['/cursos', cursoId]);
  }

  cerrar() {
    this.dialogRef.close();
  }
}
