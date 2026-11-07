import { Component, computed, input } from '@angular/core';
import { PuntoGrafico } from '../../services/dashboard';

// Barras hechas con CSS (sin librería de gráficos): verticales para series en
// el tiempo y horizontales para comparar categorías con nombres largos.
@Component({
  selector: 'app-grafico-barras',
  template: `
    @if (horizontal()) {
      <div class="horizontal">
        @for (p of puntos(); track p.etiqueta) {
          <div class="fila" [title]="p.etiqueta + ': ' + formato(p.valor)">
            <span class="etiqueta">{{ p.etiqueta }}</span>
            <div class="pista">
              <div class="barra" [style.width.%]="porcentaje(p.valor)"></div>
            </div>
            <span class="valor">{{ formato(p.valor) }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="vertical">
        @for (p of puntos(); track p.etiqueta) {
          <div class="columna">
            <span class="valor">{{ p.valor ? formato(p.valor) : '' }}</span>
            <div class="pista">
              <div class="barra" [style.height.%]="porcentaje(p.valor)"
                   [title]="p.etiqueta + ': ' + formato(p.valor)"></div>
            </div>
            <span class="etiqueta">{{ p.etiqueta }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .vertical {
      display: flex;
      align-items: stretch;
      gap: 12px;
      height: 200px;
    }

    .columna {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 0;

      .pista {
        flex: 1;
        width: 100%;
        max-width: 46px;
        display: flex;
        align-items: flex-end;
        background: #f1f3f8;
        border-radius: 8px;
      }

      .barra {
        width: 100%;
        min-height: 3px;
        border-radius: 8px;
        background: linear-gradient(180deg, #c8a84b, #1a2a5e);
        animation: crecerY 0.8s cubic-bezier(.2,.8,.2,1);
        transform-origin: bottom;
        transition: filter .2s;
        &:hover { filter: brightness(1.2); }
      }

      .valor { font-size: 11px; font-weight: 700; color: #1a2a5e; white-space: nowrap; height: 14px; }
      .etiqueta { font-size: 12px; color: #64748b; }
    }

    .horizontal { display: flex; flex-direction: column; gap: 12px; }

    .fila {
      display: grid;
      grid-template-columns: minmax(80px, 38%) 1fr 36px;
      align-items: center;
      gap: 10px;

      .etiqueta {
        font-size: 13px;
        color: #334155;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pista { height: 12px; background: #f1f3f8; border-radius: 6px; overflow: hidden; }

      .barra {
        height: 100%;
        border-radius: 6px;
        background: linear-gradient(90deg, #1a2a5e, #2a4f9f);
        animation: crecerX 0.8s cubic-bezier(.2,.8,.2,1);
        transform-origin: left;
      }

      .valor { font-size: 13px; font-weight: 700; color: #1a2a5e; text-align: right; }
    }

    @keyframes crecerY { from { transform: scaleY(0); } }
    @keyframes crecerX { from { transform: scaleX(0); } }

    @media (prefers-reduced-motion: reduce) {
      .barra { animation: none !important; }
    }
  `]
})
export class GraficoBarras {
  datos = input<PuntoGrafico[]>([]);
  horizontal = input(false);
  moneda = input(false);

  protected puntos = computed(() => this.datos());
  private maximo = computed(() => Math.max(1, ...this.datos().map((p) => p.valor)));

  protected porcentaje(valor: number) {
    return (valor / this.maximo()) * 100;
  }

  protected formato(valor: number) {
    return this.moneda()
      ? '$' + valor.toLocaleString('es-EC', { maximumFractionDigits: 0 })
      : valor.toLocaleString('es-EC');
  }
}
