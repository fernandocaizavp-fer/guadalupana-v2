import { Component, computed, input } from '@angular/core';

// Marcador de carga con la forma aproximada del contenido (skeleton): el usuario
// ve dónde aparecerán los datos en lugar de un spinner en blanco.
//   <app-esqueleto variante="tabla" [filas]="8" />
@Component({
  selector: 'app-esqueleto',
  template: `
    <div class="esqueleto" [class]="'v-' + variante()" role="status" aria-label="Cargando">
      @switch (variante()) {
        @case ('tabla') {
          <div class="bloque cabecera"></div>
          @for (i of indices(); track i) {
            <div class="fila">
              <div class="bloque circulo"></div>
              <div class="bloque texto largo"></div>
              <div class="bloque texto corto"></div>
              <div class="bloque texto corto"></div>
            </div>
          }
        }
        @case ('tarjetas') {
          <div class="rejilla">
            @for (i of indices(); track i) {
              <div class="tarjeta">
                <div class="bloque icono"></div>
                <div class="bloque texto largo"></div>
                <div class="bloque texto medio"></div>
              </div>
            }
          </div>
        }
        @default {
          <div class="bloque titulo"></div>
          @for (i of indices(); track i) {
            <div class="bloque texto" [style.width.%]="90 - (i % 3) * 18"></div>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .esqueleto { padding: 8px 0; }

    .bloque {
      border-radius: 8px;
      background: linear-gradient(90deg, #eceef4 25%, #f7f8fb 50%, #eceef4 75%);
      background-size: 200% 100%;
      animation: brillo 1.3s linear infinite;
    }

    .cabecera { height: 44px; margin-bottom: 12px; }
    .fila {
      display: grid;
      grid-template-columns: 36px 1fr 90px 90px;
      align-items: center;
      gap: 14px;
      padding: 10px 4px;
      border-bottom: 1px solid #f1f3f8;
    }
    .circulo { width: 36px; height: 36px; border-radius: 50%; }
    .texto { height: 14px; margin: 10px 0; }
    .fila .texto { margin: 0; }
    .titulo { height: 26px; width: 40%; margin-bottom: 18px; }

    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .tarjeta { background: #fff; border: 1px solid #eef0f5; border-radius: 14px; padding: 20px; }
    .icono { width: 48px; height: 48px; border-radius: 12px; margin-bottom: 16px; }
    .largo { width: 85%; }
    .medio { width: 60%; }
    .corto { width: 100%; }

    @keyframes brillo { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .bloque { animation: none; } }
    @media (max-width: 600px) { .fila { grid-template-columns: 36px 1fr 60px; .texto.corto:last-child { display: none; } } }
  `]
})
export class Esqueleto {
  variante = input<'tabla' | 'tarjetas' | 'lista'>('lista');
  filas = input(6);
  protected indices = computed(() => Array.from({ length: this.filas() }, (_, i) => i));
}
