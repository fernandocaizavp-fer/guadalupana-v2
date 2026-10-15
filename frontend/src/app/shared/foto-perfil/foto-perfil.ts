import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth';
import { UsuarioService } from '../../services/usuario';
import { LoadingService } from '../../services/loading';

const LIMITE_BYTES = 5 * 1024 * 1024;

/**
 * Avatar circular de un usuario: muestra su foto o, si no tiene, su inicial.
 *
 * - Solo lectura (por defecto): pinta la `fotoUrl` recibida (p. ej. el docente
 *   de una materia).
 * - `editable`: es la foto del usuario con sesión iniciada; al hacer clic abre
 *   el selector de archivos, la sube y la deja guardada en la sesión.
 * - `editable` + `usuarioId`: el administrador cambia la foto de otro usuario
 *   (un docente); no toca la sesión y avisa con `fotoCambiada`.
 */
@Component({
  selector: 'app-foto-perfil',
  imports: [MatIconModule, MatSnackBarModule],
  templateUrl: './foto-perfil.html',
  styleUrl: './foto-perfil.scss'
})
export class FotoPerfil {
  @Input() fotoUrl: string | null | undefined = null;
  @Input() nombre: string | null | undefined = '';
  @Input() tamano = 56; // px
  @Input() editable = false;
  @Input() usuarioId: number | null = null;
  @Output() fotoCambiada = new EventEmitter<string>();

  // Foto recién subida para otro usuario (modo administrador).
  private fotoSubida = signal<string | null>(null);

  // Foto del usuario con sesión iniciada (solo se usa en modo editable).
  private fotoPropia = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private loadingService: LoadingService,
    private snackBar: MatSnackBar
  ) {
    this.fotoPropia.set(this.authService.getUsuario()?.fotoUrl ?? null);
  }

  get url(): string | null {
    if (this.editable && this.usuarioId === null) return this.fotoPropia();
    return this.fotoSubida() || this.fotoUrl || null;
  }

  get inicial(): string {
    return (this.nombre || '?').trim().charAt(0).toUpperCase();
  }

  onArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      this.snackBar.open('La foto debe ser una imagen JPG, PNG o WEBP', 'OK', { duration: 4000 });
      return;
    }
    if (archivo.size > LIMITE_BYTES) {
      this.snackBar.open('La foto supera el tamaño máximo de 5 MB', 'OK', { duration: 4000 });
      return;
    }

    const deOtro = this.usuarioId !== null;
    const peticion = deOtro
      ? this.usuarioService.subirFotoDe(this.usuarioId as number, archivo)
      : this.usuarioService.subirFoto(archivo);

    this.loadingService.mostrar();
    peticion
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: (res) => {
          if (deOtro) {
            this.fotoSubida.set(res.fotoUrl);
            this.fotoCambiada.emit(res.fotoUrl);
          } else {
            this.authService.actualizarFoto(res.fotoUrl);
            this.fotoPropia.set(res.fotoUrl);
          }
          this.snackBar.open('Foto de perfil actualizada', 'OK', { duration: 3000 });
        },
        error: (e) => {
          this.snackBar.open(e?.error?.error || 'Error al subir la foto', 'OK', { duration: 4000 });
        }
      });
  }
}
