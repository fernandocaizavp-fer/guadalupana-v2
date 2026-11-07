import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { DialogService } from '../services/dialog';

// Pantallas de ingreso de notas/asistencia: avisan antes de perder lo escrito.
// Dos frentes:
//  - navegación dentro de la app (volver, menú, enlaces) → cambiosSinGuardarGuard
//    en la ruta (canDeactivate);
//  - cerrar o recargar la pestaña → el componente escucha 'window:beforeunload'
//    y llama a avisarAlCerrar().
export interface ConCambiosSinGuardar {
  hayCambiosSinGuardar(): boolean;
}

// "Foto" del estado editable tomada al cargar y al guardar; si el estado actual
// difiere de la foto, hay cambios sin guardar. Antes de la primera foto (datos
// aún cargando) nunca hay cambios.
export class Instantanea {
  private base: string | null = null;

  fijar(estado: unknown) {
    this.base = JSON.stringify(estado);
  }

  cambio(estado: unknown): boolean {
    return this.base !== null && JSON.stringify(estado) !== this.base;
  }
}

export function confirmarDescarte(dialogService: DialogService): Promise<boolean> {
  return dialogService.confirm({
    titulo: 'Cambios sin guardar',
    mensaje: 'Hay datos escritos que todavía no se guardaron. Si sales ahora, se perderán.',
    confirmText: 'Salir sin guardar',
    cancelText: 'Seguir editando',
    peligro: true
  });
}

export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = (componente) => {
  if (!componente?.hayCambiosSinGuardar?.()) return true;
  return confirmarDescarte(inject(DialogService));
};

// El navegador muestra su propio aviso genérico (no se puede personalizar el texto).
export function avisarAlCerrar(evento: BeforeUnloadEvent, hayCambios: boolean) {
  if (hayCambios) {
    evento.preventDefault();
    evento.returnValue = '';
  }
}
