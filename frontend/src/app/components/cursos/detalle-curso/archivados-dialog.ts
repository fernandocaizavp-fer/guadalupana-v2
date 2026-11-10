import { ChangeDetectorRef, Component, Inject, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaService } from '../../../services/matricula';
import { DialogService } from '../../../services/dialog';
import { NotificacionService } from '../../../services/notificacion';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';
import { EstadoVacio } from '../../../shared/estado-vacio/estado-vacio';

export interface ArchivadosData {
  cursoId: number;
  cursoNombre: string;
}

// Estudiantes dados de baja de TODOS los cursos: un archivado de este curso vuelve
// con sus notas; uno de otro curso (p. ej. del año anterior) se pasa a este.
// Devuelve true al cerrar si se reactivó a alguien, para recargar la lista.
@Component({
  selector: 'app-archivados-dialog',
  imports: [FormsModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatTooltipModule, Esqueleto, EstadoVacio],
  template: `
    <h2 mat-dialog-title>Estudiantes archivados</h2>
    <mat-dialog-content>
      <p class="ayuda">Estudiantes dados de baja. Al reactivar uno, vuelve a <strong>{{ data.cursoNombre }}</strong> y puede iniciar sesión otra vez con su misma contraseña.</p>
      <mat-form-field appearance="outline" class="buscador" subscriptSizing="dynamic">
        <mat-label>Buscar por nombre, apellido o cédula</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="busqueda" (ngModelChange)="buscar$.next($event)" name="busqueda" autocomplete="off">
      </mat-form-field>

      @if (cargando) {
        <app-esqueleto variante="lista" [filas]="4" />
      } @else if (archivadas.length === 0) {
        <app-estado-vacio icono="inventory_2" titulo="Sin estudiantes archivados"
          [mensaje]="busqueda ? 'Ningún archivado coincide con la búsqueda.' : 'Aquí aparecen los estudiantes que se eliminan de un curso.'" [compacto]="true" />
      } @else {
        <ul class="lista">
          @for (m of archivadas; track m.id) {
            <li>
              <div class="info">
                <span class="nombre">{{ m.apellidos }} {{ m.nombres }}</span>
                <span class="meta">
                  {{ m.cedula }} · {{ m.curso.ramaArtesanal }} ({{ m.curso.anioFormativo }})
                  @if (m.curso.id === data.cursoId) { <span class="chip">este curso</span> }
                  · archivado {{ m.updatedAt | date: 'dd/MM/yyyy' }}
                </span>
              </div>
              <button mat-stroked-button class="btn-reactivar" [disabled]="reactivando !== null" (click)="reactivar(m)"
                [attr.aria-label]="'Reactivar a ' + m.nombres">
                <mat-icon>{{ reactivando === m.id ? 'hourglass_top' : 'restore' }}</mat-icon> Reactivar
              </button>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(huboCambios)">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .ayuda { margin: 0 0 12px; color: #555; font-size: 14px; }
    .buscador { width: 100%; margin-bottom: 8px; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .lista li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid #eee; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .nombre { font-weight: 600; }
    .meta { font-size: 12px; color: #777; }
    .chip { background: #f3e9c6; color: #7a5a00; border-radius: 10px; padding: 0 6px; font-weight: 600; }
    .btn-reactivar { flex-shrink: 0; }
  `]
})
export class ArchivadosDialog implements OnInit {
  private matriculaService = inject(MatriculaService);
  private dialogService = inject(DialogService);
  private notificacion = inject(NotificacionService);
  private cdr = inject(ChangeDetectorRef);

  archivadas: any[] = [];
  busqueda = '';
  cargando = true;
  reactivando: number | null = null;
  huboCambios = false;
  buscar$ = new Subject<string>();

  constructor(
    public dialogRef: MatDialogRef<ArchivadosDialog, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ArchivadosData
  ) {
    this.buscar$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(q => this.cargar(q));
  }

  ngOnInit() {
    this.cargar('');
  }

  cargar(q: string) {
    this.cargando = true;
    this.cdr.detectChanges();
    this.matriculaService.listarArchivadas(q.trim()).subscribe({
      next: (lista) => {
        this.archivadas = lista;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.notificacion.error(err.error?.error || 'No se pudo cargar la lista de archivados');
        this.cdr.detectChanges();
      }
    });
  }

  async reactivar(m: any) {
    const otroCurso = m.curso.id !== this.data.cursoId;
    const ok = await this.dialogService.confirm({
      titulo: 'Reactivar matrícula',
      mensaje: otroCurso
        ? `${m.nombres} ${m.apellidos} pasará de ${m.curso.ramaArtesanal} a ${this.data.cursoNombre}. Sus notas del curso anterior se conservan como historial; las notas de ingreso rápido y la observación de asistencia de ese curso se borran para que no se mezclen con las del nuevo.`
        : `${m.nombres} ${m.apellidos} vuelve a ${this.data.cursoNombre} con todas sus notas y asistencias.`,
      confirmText: 'Reactivar',
      icon: 'restore'
    });
    if (!ok) return;
    this.reactivando = m.id;
    this.cdr.detectChanges();
    this.matriculaService.reactivarMatricula(m.id, this.data.cursoId).subscribe({
      next: (res) => {
        this.reactivando = null;
        this.huboCambios = true;
        this.archivadas = this.archivadas.filter(a => a.id !== m.id);
        this.notificacion.exito(res.message);
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.reactivando = null;
        this.notificacion.error(e.error?.error || 'No se pudo reactivar la matrícula');
        this.cdr.detectChanges();
      }
    });
  }
}
