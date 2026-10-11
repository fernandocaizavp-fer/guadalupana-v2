import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoadingService } from '../../../services/loading';
import { PortalService, FotoGaleria } from '../../../services/portal';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_BYTES = 5 * 1024 * 1024;

// Fotos públicas de la landing. Las imágenes se guardan en Cloudflare R2.
@Component({
  selector: 'app-galeria-publica',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe],
  templateUrl: './galeria-publica.html',
  styleUrl: './galeria-publica.scss'
})
export class GaleriaPublica implements OnInit {
  fotos: FotoGaleria[] = [];
  cargado = false;

  // Subida de una foto nueva.
  titulo = '';
  imagen: File | null = null;
  vistaPrevia: string | null = null;

  // Foto cuyo título se está corrigiendo.
  renombrando: FotoGaleria | null = null;
  tituloEditado = '';

  constructor(
    private portalService: PortalService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargar();
  }

  // Ejecuta una petición con el indicador de carga global.
  private conCarga<T>(peticion: Observable<T>): Observable<T> {
    this.loadingService.mostrar();
    return peticion.pipe(finalize(() => this.loadingService.ocultar()));
  }

  private avisarError(e: any, porDefecto: string) {
    this.snackBar.open(e?.error?.error || porDefecto, 'OK', { duration: 4000 });
  }

  cargar() {
    this.conCarga(this.portalService.listarGaleria()).subscribe({
      next: (fotos) => {
        this.fotos = fotos;
        this.cargado = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargado = true;
        this.cdr.detectChanges();
        this.avisarError(e, 'Error al cargar la galería');
      }
    });
  }

  elegirImagen(evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.snackBar.open('Solo se aceptan imágenes JPG, PNG o WEBP', 'OK', { duration: 4000 });
      return;
    }
    if (archivo.size > LIMITE_BYTES) {
      this.snackBar.open('La imagen supera el tamaño máximo de 5 MB', 'OK', { duration: 4000 });
      return;
    }
    this.descartarImagen();
    this.imagen = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
  }

  descartarImagen() {
    if (this.vistaPrevia) URL.revokeObjectURL(this.vistaPrevia);
    this.imagen = null;
    this.vistaPrevia = null;
  }

  get puedeSubir(): boolean {
    return !!this.imagen && this.titulo.trim().length > 0;
  }

  subir() {
    if (!this.puedeSubir || !this.imagen) return;
    this.conCarga(this.portalService.subirFoto(this.titulo.trim(), this.imagen)).subscribe({
      next: (foto) => {
        this.fotos = [foto, ...this.fotos];
        this.titulo = '';
        this.descartarImagen();
        this.cdr.detectChanges();
        this.snackBar.open('Foto publicada en la galería', 'OK', { duration: 3000 });
      },
      error: (e) => this.avisarError(e, 'Error al subir la foto')
    });
  }

  empezarRenombrar(foto: FotoGaleria) {
    this.renombrando = foto;
    this.tituloEditado = foto.titulo;
  }

  cancelarRenombrar() {
    this.renombrando = null;
  }

  guardarTitulo() {
    const foto = this.renombrando;
    const titulo = this.tituloEditado.trim();
    if (!foto || !titulo) return;
    this.conCarga(this.portalService.renombrarFoto(foto.id, titulo)).subscribe({
      next: () => {
        foto.titulo = titulo;
        this.renombrando = null;
        this.cdr.detectChanges();
        this.snackBar.open('Título actualizado', 'OK', { duration: 3000 });
      },
      error: (e) => this.avisarError(e, 'Error al actualizar la foto')
    });
  }

  eliminar(foto: FotoGaleria) {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Eliminar foto',
        mensaje: `¿Eliminar "${foto.titulo}" de la galería pública? El archivo se borra definitivamente.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        icon: 'delete'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // El indicador de carga de los DELETE lo pone el interceptor global.
      this.portalService.eliminarFoto(foto.id).subscribe({
        next: () => {
          this.fotos = this.fotos.filter((f) => f.id !== foto.id);
          this.cdr.detectChanges();
          this.snackBar.open('Foto eliminada', 'OK', { duration: 3000 });
        },
        error: (e) => this.avisarError(e, 'Error al eliminar la foto')
      });
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
