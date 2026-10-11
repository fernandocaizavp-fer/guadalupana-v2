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
import { PortalService, AnuncioPublico } from '../../../services/portal';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_BYTES = 5 * 1024 * 1024;

// Noticias que ve el público en la landing. No tienen relación con los anuncios
// internos (`/anuncios`) de docentes y estudiantes.
@Component({
  selector: 'app-anuncios-publicos',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe],
  templateUrl: './anuncios-publicos.html',
  styleUrl: './anuncios-publicos.scss'
})
export class AnunciosPublicos implements OnInit {
  anuncios: AnuncioPublico[] = [];
  cargado = false;

  // Formulario: sirve para crear y, si `editando` tiene valor, para modificar.
  formularioAbierto = false;
  editando: AnuncioPublico | null = null;
  titulo = '';
  contenido = '';
  activo = true;
  imagen: File | null = null;
  vistaPrevia: string | null = null;
  quitarImagen = false;

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
    this.conCarga(this.portalService.listarAnuncios()).subscribe({
      next: (anuncios) => {
        this.anuncios = anuncios;
        this.cargado = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.cargado = true;
        this.cdr.detectChanges();
        this.avisarError(e, 'Error al cargar los anuncios');
      }
    });
  }

  private limpiar() {
    if (this.vistaPrevia?.startsWith('blob:')) URL.revokeObjectURL(this.vistaPrevia);
    this.editando = null;
    this.titulo = '';
    this.contenido = '';
    this.activo = true;
    this.imagen = null;
    this.vistaPrevia = null;
    this.quitarImagen = false;
  }

  nuevo() {
    this.limpiar();
    this.formularioAbierto = true;
  }

  editar(anuncio: AnuncioPublico) {
    this.limpiar();
    this.editando = anuncio;
    this.titulo = anuncio.titulo;
    this.contenido = anuncio.contenido;
    this.activo = anuncio.activo;
    this.vistaPrevia = anuncio.imagenUrl;
    this.formularioAbierto = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelar() {
    this.limpiar();
    this.formularioAbierto = false;
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
    if (this.vistaPrevia?.startsWith('blob:')) URL.revokeObjectURL(this.vistaPrevia);
    this.imagen = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
    this.quitarImagen = false;
  }

  descartarImagen() {
    if (this.vistaPrevia?.startsWith('blob:')) URL.revokeObjectURL(this.vistaPrevia);
    this.imagen = null;
    this.vistaPrevia = null;
    // Si el anuncio ya tenía imagen guardada, hay que pedir al servidor que la quite.
    this.quitarImagen = !!this.editando?.imagenUrl;
  }

  get valido(): boolean {
    return this.titulo.trim().length > 0 && this.contenido.trim().length > 0;
  }

  guardar() {
    if (!this.valido) return;
    const datos = new FormData();
    datos.append('titulo', this.titulo.trim());
    datos.append('contenido', this.contenido.trim());
    datos.append('activo', String(this.activo));
    if (this.imagen) datos.append('imagen', this.imagen);
    if (this.quitarImagen) datos.append('quitarImagen', 'true');

    const peticion = this.editando
      ? this.portalService.actualizarAnuncio(this.editando.id, datos)
      : this.portalService.crearAnuncio(datos);
    const mensaje = this.editando ? 'Anuncio actualizado' : 'Anuncio publicado';

    this.conCarga(peticion).subscribe({
      next: () => {
        this.cancelar();
        this.snackBar.open(mensaje, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: (e) => this.avisarError(e, 'Error al guardar el anuncio')
    });
  }

  eliminar(anuncio: AnuncioPublico) {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Eliminar anuncio',
        mensaje: `¿Eliminar "${anuncio.titulo}"? Dejará de verse en la página principal.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        icon: 'delete'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // El indicador de carga de los DELETE lo pone el interceptor global.
      this.portalService.eliminarAnuncio(anuncio.id).subscribe({
        next: () => {
          this.anuncios = this.anuncios.filter((a) => a.id !== anuncio.id);
          if (this.editando?.id === anuncio.id) this.cancelar();
          this.cdr.detectChanges();
          this.snackBar.open('Anuncio eliminado', 'OK', { duration: 3000 });
        },
        error: (e) => this.avisarError(e, 'Error al eliminar el anuncio')
      });
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
