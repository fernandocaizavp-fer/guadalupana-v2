import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { TareaService } from '../../../services/tarea';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DialogService } from '../../../services/dialog';
import { NotificacionService } from '../../../services/notificacion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';
import { EstadoVacio } from '../../../shared/estado-vacio/estado-vacio';

@Component({
  selector: 'app-detalle-tarea-estudiante',
  imports: [EstadoVacio, Esqueleto, MatTooltipModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, DatePipe],
  templateUrl: './detalle-tarea-estudiante.html',
  styleUrl: './detalle-tarea-estudiante.scss'
})
export class DetalleTareaEstudiante implements OnInit {
  private dialogService = inject(DialogService);
  private notificacion = inject(NotificacionService);

  materiaId = 0;
  tareaId = 0;
  semestre = 1;
  matriculaId = 0;

  tarea: any = null;
  miNota: number | null = null;
  miEntrega: any = null;
  loading = true;
  subiendo = false;

  private readonly MAX_BYTES = 10 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private tareaService: TareaService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
    this.tareaId = Number(this.route.snapshot.paramMap.get('tareaId'));
    this.semestre = Number(this.route.snapshot.paramMap.get('semestre'));

    const usuario = this.authService.getUsuario();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });

    this.http.get<any>(
      `${environment.apiUrl}/usuarios/perfil-estudiante/${usuario.id}`,
      { headers }
    ).subscribe({
      next: (matricula) => {
        this.matriculaId = matricula.id;
        this.cargar();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  cargar() {
    this.tareaService.getTareasPorMateria(this.materiaId).subscribe({
      next: (tareas) => {
        this.tarea = tareas.find((t: any) => t.id === this.tareaId) || null;
        const nota = this.tarea?.notas?.find((n: any) => n.matriculaId === this.matriculaId);
        this.miNota = nota?.valor ?? null;
        this.cargarMiEntrega();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private cargarMiEntrega() {
    this.tareaService.getMiEntrega(this.tareaId).subscribe({
      next: (entrega) => { this.miEntrega = entrega; this.cdr.detectChanges(); }
    });
  }

  // El plazo vence si la tarea tiene fecha límite y ya pasó.
  get plazoVencido(): boolean {
    if (!this.tarea?.fechaFin) return false;
    return new Date() > new Date(this.tarea.fechaFin);
  }

  onSeleccionEntrega(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    if (this.plazoVencido) {
      this.notificacion.info('El plazo de entrega ya finalizó');
      input.value = '';
      return;
    }

    const grande = files.find(f => f.size > this.MAX_BYTES);
    if (grande) {
      this.notificacion.error(`El archivo ${grande.name} supera el tamaño máximo de 10 MB`);
      input.value = '';
      return;
    }

    this.subiendo = true;
    this.tareaService.subirEntrega(this.tareaId, files).subscribe({
      next: () => {
        this.subiendo = false;
        input.value = '';
        this.notificacion.exito('Entrega subida');
        this.cargarMiEntrega();
      },
      error: (e) => {
        this.subiendo = false;
        input.value = '';
        this.notificacion.error(e?.error?.error || 'Error al subir la entrega');
        this.cdr.detectChanges();
      }
    });
  }

  async eliminarArchivoEntrega(archivo: any) {
    const ok = await this.dialogService.confirm({
      titulo: 'Eliminar archivo',
      mensaje: `¿Eliminar "${archivo.nombreOriginal}"?`,
      peligro: true
    });
    if (!ok) return;
    this.tareaService.eliminarArchivoEntrega(archivo.id).subscribe({
      next: () => {
        if (this.miEntrega?.archivos) {
          this.miEntrega.archivos = this.miEntrega.archivos.filter((a: any) => a.id !== archivo.id);
        }
        this.cdr.detectChanges();
        this.notificacion.exito('Archivo eliminado');
      },
      error: (err) => this.notificacion.error(err.error?.error || 'Error al eliminar archivo')
    });
  }

  volver() {
    this.router.navigate(['/estudiante/materia', this.materiaId, this.semestre]);
  }
}
