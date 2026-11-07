import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type TipoToast = 'exito' | 'error' | 'info';

// Notificaciones breves (toasts) en la esquina superior derecha que desaparecen
// solas a los 3 segundos. Reemplazan a alert() y unifican los snackbars sueltos.
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private snackBar = inject(MatSnackBar);

  exito(mensaje: string) {
    this.mostrar(mensaje, 'exito');
  }

  error(mensaje: string) {
    this.mostrar(mensaje, 'error');
  }

  info(mensaje: string) {
    this.mostrar(mensaje, 'info');
  }

  private mostrar(mensaje: string, tipo: TipoToast) {
    this.snackBar.open(mensaje, '✕', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['app-toast', `app-toast-${tipo}`]
    });
  }
}
