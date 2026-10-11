import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { AcademicoService, TareaPendiente } from '../../../services/academico';
import { LoadingService } from '../../../services/loading';
import { etiquetaAutorAnuncio } from '../../../services/anuncio-util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { VisorImagen } from '../../../shared/visor-imagen/visor-imagen';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Acceso {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string | null; // null = la vista todavía no está disponible
}

@Component({
  selector: 'app-dashboard-estudiante',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDialogModule, DatePipe, VisorImagen, FotoPerfil],
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.scss'
})
export class DashboardEstudiante implements OnInit {
  usuario: any;
  matricula: any = null;
  loading = true;
  anuncios: any[] = [];
  tareasPendientes: TareaPendiente[] = [];
  etiquetaAutor = etiquetaAutorAnuncio;

  imagenAmpliada: string | null = null;

  accesos: Acceso[] = [
    { titulo: 'Aula Virtual / Materias', descripcion: 'Tus materias, docentes, tareas y calificaciones', icono: 'cast_for_education', ruta: '/estudiante/aula-virtual' },
    { titulo: 'Mis Horarios', descripcion: 'Días y horas de clase de cada materia', icono: 'calendar_month', ruta: null },
    { titulo: 'Mis Asistencias', descripcion: 'Registro de asistencias y faltas por materia', icono: 'how_to_reg', ruta: '/estudiante/asistencias' },
    { titulo: 'Mis Finanzas', descripcion: 'Pagos, saldos y comprobantes', icono: 'account_balance_wallet', ruta: '/estudiante/finanzas' }
  ];

  abrirImagen(url: string): void {
    if (url) this.imagenAmpliada = url;
  }

  urlImagen(imagen: string): string {
    if (!imagen) return '';
    return imagen.startsWith('http')
      ? imagen
      : `${environment.apiUrl.replace(/\/api$/, '')}${imagen}`;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private academicoService: AcademicoService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    // Indicador de carga global mientras llega el perfil (la primera petición
    // puede tardar si el servidor estaba inactivo).
    this.loadingService.mostrar();
    this.http.get(`${environment.apiUrl}/usuarios/perfil-estudiante/${this.usuario.id}`, { headers })
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: (matricula: any) => {
          this.matricula = matricula;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });

    this.http.get<any[]>(`${environment.apiUrl}/anuncios`, { headers }).subscribe({
      next: (anuncios) => {
        this.anuncios = anuncios;
        this.cdr.detectChanges();
      }
    });

    this.academicoService.tareasPendientes(this.usuario.id).subscribe({
      next: (tareas) => {
        this.tareasPendientes = tareas;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso: el panel queda vacío */ }
    });
  }

  // Una fecha límite es "cercana" si faltan 3 días o menos.
  esCercana(fechaLimite: string): boolean {
    const tresDias = 3 * 24 * 60 * 60 * 1000;
    return new Date(fechaLimite).getTime() - Date.now() <= tresDias;
  }

  abrirAcceso(acceso: Acceso) {
    if (acceso.ruta) {
      this.router.navigate([acceso.ruta]);
    } else {
      this.snackBar.open(`${acceso.titulo}: disponible próximamente`, 'OK', { duration: 3000 });
    }
  }

  irATarea(tarea: TareaPendiente) {
    this.router.navigate(['/estudiante/tarea', tarea.materiaId, tarea.id, tarea.semestre]);
  }

  logout() {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Cerrar sesión',
        mensaje: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Cerrar sesión',
        cancelText: 'Cancelar',
        icon: 'logout'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
