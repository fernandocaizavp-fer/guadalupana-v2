import { Component, OnInit, input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RecursoService, RecursoDidactico, TipoRecurso } from '../../services/recurso';
import { AuthService } from '../../services/auth';
import { NotificacionService } from '../../services/notificacion';
import { EstadoVacio } from '../estado-vacio/estado-vacio';

@Component({
  selector: 'app-dialogo-crear-recurso',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal-crear-recurso">
      <div class="modal-header">
        <mat-icon>post_add</mat-icon>
        <h2>Publicar Recurso o Guía de Taller</h2>
      </div>

      <div class="modal-body">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Título del recurso / guía</mat-label>
          <input matInput [(ngModel)]="titulo" placeholder="Ej: Guía de Técnicas de Corte y Degradado">
        </mat-form-field>

        <div class="grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de Recurso</mat-label>
            <mat-select [(ngModel)]="tipo">
              <mat-option value="GUIA_TALLER">📄 Guía de Taller (PDF / Procedimiento)</mat-option>
              <mat-option value="LISTA_MATERIALES">🧰 Lista de Materiales e Insumos</mat-option>
              <mat-option value="VIDEO_TUTORIAL">🎬 Video Tutorial / Demostración</mat-option>
              <mat-option value="DOCUMENTO">📑 Documento Técnico / Normativa</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nombre de archivo (opcional)</mat-label>
            <input matInput [(ngModel)]="archivoNombre" placeholder="Ej: guia_corte_paso_a_paso.pdf">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Enlace / URL del Recurso (Drive, YouTube, Cloudflare o Web)</mat-label>
          <input matInput [(ngModel)]="urlRecurso" placeholder="https://...">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Descripción o indicaciones para los estudiantes (opcional)</mat-label>
          <textarea matInput [(ngModel)]="descripcion" rows="3" placeholder="Instrucciones para la práctica de taller o materiales necesarios para la clase..."></textarea>
        </mat-form-field>
      </div>

      <div class="modal-actions">
        <button mat-button (click)="dialogRef.close()">Cancelar</button>
        <button mat-raised-button color="primary" [disabled]="!esValido() || guardando" (click)="guardar()">
          {{ guardando ? 'Guardando...' : 'Publicar Recurso' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-crear-recurso { padding: 20px; max-width: 560px; }
    .modal-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; color: #1a2a5e; }
    .modal-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
    .modal-header mat-icon { color: #c8a84b; }
    .w-100 { width: 100%; margin-bottom: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
  `]
})
export class DialogoCrearRecurso {
  dialogRef = inject(MatDialogRef<DialogoCrearRecurso>);
  data = inject(MAT_DIALOG_DATA);

  titulo = '';
  tipo: TipoRecurso = 'GUIA_TALLER';
  urlRecurso = '';
  archivoNombre = '';
  descripcion = '';
  guardando = false;

  esValido(): boolean {
    return !!(this.titulo.trim() && this.urlRecurso.trim());
  }

  guardar() {
    if (!this.esValido()) return;
    this.dialogRef.close({
      titulo: this.titulo.trim(),
      tipo: this.tipo,
      urlRecurso: this.urlRecurso.trim(),
      archivoNombre: this.archivoNombre.trim() || undefined,
      descripcion: this.descripcion.trim() || undefined,
      cursoId: this.data?.cursoId,
      materiaId: this.data?.materiaId
    });
  }
}

@Component({
  selector: 'app-recursos-didacticos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, EstadoVacio],
  templateUrl: './recursos-didacticos.html',
  styleUrls: ['./recursos-didacticos.scss']
})
export class RecursosDidacticosComponent implements OnInit {
  private recursoService = inject(RecursoService);
  private authService = inject(AuthService);
  private notificacion = inject(NotificacionService);
  private dialog = inject(MatDialog);

  cursoId = input<number | undefined>();
  materiaId = input<number | undefined>();
  mostrarTitulo = input<boolean>(true);

  recursos = signal<RecursoDidactico[]>([]);
  cargando = signal(false);
  filtroTipo = signal<string>('TODOS');

  usuario = computed(() => this.authService.getUsuario());
  puedeCrear = computed(() => {
    const rol = this.usuario()?.rol;
    return rol === 'ADMIN' || rol === 'PROFESOR';
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.recursoService.listar({
      cursoId: this.cursoId(),
      materiaId: this.materiaId()
    }).subscribe({
      next: (data) => {
        this.recursos.set(data || []);
        this.cargando.set(false);
      },
      error: () => {
        this.recursos.set([]);
        this.cargando.set(false);
      }
    });
  }

  recursosFiltrados = computed(() => {
    const f = this.filtroTipo();
    if (f === 'TODOS') return this.recursos();
    return this.recursos().filter(r => r.tipo === f);
  });

  abrirCrear() {
    const dialogRef = this.dialog.open(DialogoCrearRecurso, {
      width: '580px',
      maxWidth: '95vw',
      data: {
        cursoId: this.cursoId(),
        materiaId: this.materiaId()
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (!res) return;
      this.recursoService.crear(res).subscribe({
        next: () => {
          this.notificacion.exito('Recurso publicado correctamente');
          this.cargar();
        },
        error: (err) => {
          this.notificacion.error(err?.error?.error || 'No se pudo publicar el recurso');
        }
      });
    });
  }

  eliminar(r: RecursoDidactico) {
    if (!confirm(`¿Deseas eliminar el recurso "${r.titulo}"?`)) return;
    this.recursoService.eliminar(r.id).subscribe({
      next: () => {
        this.notificacion.exito('Recurso eliminado');
        this.cargar();
      },
      error: (err) => {
        this.notificacion.error(err?.error?.error || 'No se pudo eliminar el recurso');
      }
    });
  }

  esAutor(r: RecursoDidactico): boolean {
    const u = this.usuario();
    if (!u) return false;
    return u.rol === 'ADMIN' || Number(u.id) === r.autorId;
  }

  abrirEnlace(url: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  iconoPorTipo(tipo: TipoRecurso): string {
    switch (tipo) {
      case 'GUIA_TALLER': return 'picture_as_pdf';
      case 'LISTA_MATERIALES': return 'inventory_2';
      case 'VIDEO_TUTORIAL': return 'smart_display';
      case 'DOCUMENTO': return 'description';
      default: return 'folder_open';
    }
  }

  etiquetaPorTipo(tipo: TipoRecurso): string {
    switch (tipo) {
      case 'GUIA_TALLER': return 'Guía de Taller';
      case 'LISTA_MATERIALES': return 'Lista de Materiales';
      case 'VIDEO_TUTORIAL': return 'Video Tutorial';
      case 'DOCUMENTO': return 'Documento';
      default: return 'Recurso';
    }
  }
}
