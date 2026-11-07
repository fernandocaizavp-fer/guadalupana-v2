import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmData, ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

// Punto único para pedir confirmaciones con el diálogo institucional en lugar de
// window.confirm(). Devuelve una promesa para poder escribir:
//   if (!(await this.dialogService.confirm({ ... }))) return;
@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);

  confirm(data: ConfirmData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '400px',
      maxWidth: '92vw',
      autoFocus: false,
      backdropClass: 'confirm-dialog-backdrop',
      data
    });
    // Cerrar con Esc o clic fuera cuenta como "Cancelar".
    return firstValueFrom(ref.afterClosed()).then((r) => r === true);
  }
}
