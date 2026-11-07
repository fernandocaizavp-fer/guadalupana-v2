import { AbstractControl, NgForm } from '@angular/forms';
import { NotificacionService } from '../services/notificacion';

// Validación de formularios (ngModel o reactivos): si hay campos obligatorios
// vacíos o mal escritos, los marca en rojo (cada <mat-error> dice qué falta),
// avisa con un toast y lleva el foco al primero. Uso en guardar():
//   if (!formularioValido(this.formulario, this.notificacion)) return;
export function formularioValido(
  form: NgForm | AbstractControl | undefined,
  notificacion: NotificacionService
): boolean {
  const control = form instanceof NgForm ? form.control : form;
  if (!control || control.valid) return true;

  control.markAllAsTouched();
  notificacion.info('Revisa los campos marcados en rojo');

  // Tras pintar el estado de error, enfocar el primer campo inválido.
  setTimeout(() => {
    const campo = document.querySelector<HTMLElement>(
      '.mat-form-field-invalid input, .mat-form-field-invalid textarea, .mat-form-field-invalid mat-select'
    );
    campo?.focus();
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  return false;
}
