import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { etiquetaAutorAnuncio } from '../../../services/anuncio-util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { VisorImagen } from '../../../shared/visor-imagen/visor-imagen';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';
import { environment } from '../../../../environments/environment';
import { NotificacionService } from '../../../services/notificacion';
import { ResumenProfesorComponent } from '../resumen-profesor/resumen-profesor';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Esqueleto } from '../../../shared/esqueleto/esqueleto';
import { EstadoVacio } from '../../../shared/estado-vacio/estado-vacio';
import { CampanaNotificaciones } from '../../../shared/notificaciones/campana-notificaciones';

@Component({
  selector: 'app-dashboard-profesor',
  standalone: true,
  imports: [EstadoVacio, Esqueleto, MatTooltipModule, ResumenProfesorComponent,
    MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatMenuModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, DatePipe,
    VisorImagen, FotoPerfil, CampanaNotificaciones
  ],
  templateUrl: './dashboard-profesor.html',
  styleUrl: './dashboard-profesor.scss'
})
export class DashboardProfesor implements OnInit {
  private notificacion = inject(NotificacionService);

  usuario: any;
  cursosAgrupados: any[] = [];
  anuncios: any[] = [];
  loading = true;
  etiquetaAutor = etiquetaAutorAnuncio;
  imagenAmpliada: string | null = null;

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

    this.http.get<any[]>(`${environment.apiUrl}/usuarios/mis-materias/${this.usuario.id}`, { headers }).subscribe({
      next: (materias) => {
        const mapa: { [key: number]: any } = {};

        materias.forEach(m => {
          console.log(m.nombre, m.id, m.materiaParent, m.tieneDisciplina);

          if (!mapa[m.cursoId]) {
            mapa[m.cursoId] = {
              id: m.cursoId,
              ramaArtesanal: m.curso?.ramaArtesanal,
              anioFormativo: m.curso?.anioFormativo,
              materias: []
            };
          }

          if (!m.esSubmateria && (m.nombre === 'Práctica' || m.nombre === 'Teoría')) {
            return;
          }

          if (m.esSubmateria) {
            const yaExiste = mapa[m.cursoId].materias.find(
              (x: any) => x.esSubmateria && x.nombre === m.nombre
            );
            if (yaExiste) {
              yaExiste.idGemela = m.id;
              if (m.tieneDisciplina) yaExiste.tieneDisciplina = true;
              return;
            }
          }

          mapa[m.cursoId].materias.push(m);
        });

        this.cursosAgrupados = Object.values(mapa);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.notificacion.error(err.error?.error || 'Error al cargar materias');
      }
    });

    this.http.get<any[]>(`${environment.apiUrl}/anuncios`, { headers }).subscribe({
      next: (anuncios) => {
        this.anuncios = anuncios;
        this.cdr.detectChanges();
      }
    });
  }

  irAAsistencia(materiaId: number) {
    this.router.navigate(['/asistencia/materia', materiaId]);
  }

  irANotas(cursoId: number, materiaId?: number) {
    if (materiaId) {
      this.router.navigate(['/tareas', materiaId]);
    } else {
      this.router.navigate(['/cursos', cursoId, 'notas']);
    }
  }

  irASupletorio(materiaId: number) {
    this.router.navigate(['/supletorios/materia', materiaId]);
  }

  irAExamenGrado(materiaId: number) {
    this.router.navigate(['/examen-grado', materiaId]);
  }

  irADisciplina(materiaId: number) {
    this.router.navigate(['/disciplina/materia', materiaId]);
  }

  irAAnuncios() {
    this.router.navigate(['/anuncios']);
  }

  irAChat() {
    this.router.navigate(['/chat']);
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