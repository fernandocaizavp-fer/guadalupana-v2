import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmData {
  titulo?: string;
  mensaje: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="confirm-header">
        <div class="confirm-icon">
          <mat-icon>{{ data.icon || 'help_outline' }}</mat-icon>
        </div>
        <h2>{{ data.titulo || 'Confirmar' }}</h2>
      </div>

      <div class="confirm-body">
        <p>{{ data.mensaje }}</p>
      </div>

      <div class="confirm-actions">
        <button mat-stroked-button (click)="dialogRef.close(false)" class="btn-cancelar">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button mat-raised-button (click)="dialogRef.close(true)" class="btn-confirmar">
          <mat-icon>{{ data.icon || 'check' }}</mat-icon>
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog { min-width: 320px; }

    .confirm-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 24px 12px;
      text-align: center;

      h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1a2a5e; }
    }

    .confirm-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a2a5e, #2a4f9f);

      mat-icon {
        color: #c8a84b;
        font-size: 30px;
        width: 30px;
        height: 30px;
      }
    }

    .confirm-body {
      padding: 4px 28px 20px;
      text-align: center;

      p { margin: 0; color: #475569; font-size: 14px; line-height: 1.5; }
    }

    .confirm-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px 24px;

      button { min-width: 120px; }
    }

    .btn-cancelar { color: #64748b !important; border-color: #cbd5e1 !important; }

    .btn-confirmar {
      background: linear-gradient(135deg, #1a2a5e, #2a4f9f) !important;
      color: white !important;

      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
    }
  `]
})
export class ConfirmDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmData
  ) {}
}
