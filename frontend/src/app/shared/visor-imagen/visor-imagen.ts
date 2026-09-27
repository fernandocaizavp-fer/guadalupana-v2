import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Visor de imagen (lightbox) reutilizable para anuncios.
 * Se abre al asignar `src`; muestra la imagen completa y, si es más alta que la
 * pantalla, permite desplazarla (scroll vertical) para leerla toda. Se cierra
 * con la ✕, clic en el fondo o la tecla Escape. Solo visualiza (no descarga).
 */
@Component({
  selector: 'app-visor-imagen',
  imports: [],
  templateUrl: './visor-imagen.html',
  styleUrl: './visor-imagen.scss'
})
export class VisorImagen {
  @Input() src: string | null = null;
  @Output() cerrar = new EventEmitter<void>();

  onCerrar(): void {
    this.cerrar.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.src) this.onCerrar();
  }
}
