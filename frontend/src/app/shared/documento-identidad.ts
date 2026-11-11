import { Directive, ElementRef, inject } from '@angular/core';

// Cédula ecuatoriana o pasaporte extranjero (p. ej. "FB603825"). Replica la regla
// del servidor (backend/src/lib/documento-identidad.ts), que es la que manda:
// aquí solo sirve para que el director vea al escribir lo que se va a guardar.

/** Quita todos los espacios y pasa a mayúsculas. " fb 603825 " → "FB603825". */
export function normalizarDocumento(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, '').toUpperCase();
}

/** Solo letras y números (la longitud la controla maxlength / maxLength(10)). */
export const PATRON_DOCUMENTO = /^[A-Za-z0-9]*$/;

/** Una cédula ecuatoriana: lo único que puede consultar la lupa del Registro Civil. */
export const esCedulaEcuatoriana = (v: string) => /^\d{10}$/.test(v);

/**
 * `<input appDocumentoIdentidad ...>`: mientras se escribe, quita los espacios y
 * pasa a mayúsculas. Funciona con formControlName y con ngModel: reescribe el
 * valor del input y lanza un nuevo evento `input`, así el control de Angular lee
 * siempre el valor ya limpio sin importar el orden de los manejadores.
 */
@Directive({
  selector: 'input[appDocumentoIdentidad]',
  host: {
    '(input)': 'alEscribir()',
    autocapitalize: 'characters',
    spellcheck: 'false'
  }
})
export class DocumentoIdentidad {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  alEscribir(): void {
    const original = this.input.value;
    const limpio = normalizarDocumento(original);
    if (limpio === original) return;
    // Conserva la posición del cursor descontando los espacios quitados antes de él.
    const cursor = normalizarDocumento(original.slice(0, this.input.selectionStart ?? original.length)).length;
    this.input.value = limpio;
    this.input.setSelectionRange(cursor, cursor);
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
