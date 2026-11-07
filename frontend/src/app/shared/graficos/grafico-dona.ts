import { Component, computed, input } from '@angular/core';
import { PuntoGrafico } from '../../services/dashboard';

const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

// Dona en SVG: cada segmento es un círculo con stroke-dasharray desplazado.
@Component({
  selector: 'app-grafico-dona',
  template: `
    <div class="dona">
      <svg viewBox="0 0 100 100" role="img" [attr.aria-label]="descripcion()">
        <circle cx="50" cy="50" [attr.r]="radio" class="fondo" />
        @for (s of segmentos(); track s.etiqueta) {
          <circle cx="50" cy="50" [attr.r]="radio" class="segmento"
                  [attr.stroke]="s.color"
                  [attr.stroke-dasharray]="s.largo + ' ' + circunferencia"
                  [attr.stroke-dashoffset]="-s.desde">
            <title>{{ s.etiqueta }}: {{ s.valor }} ({{ s.pct }}%)</title>
          </circle>
        }
      </svg>
      <div class="centro">
        <strong>{{ total() }}</strong>
        <span>{{ unidad() }}</span>
      </div>
    </div>
    <ul class="leyenda">
      @for (s of segmentos(); track s.etiqueta) {
        <li>
          <span class="punto" [style.background]="s.color"></span>
          {{ s.etiqueta }}
          <strong>{{ s.valor }}</strong>
        </li>
      }
    </ul>
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }

    .dona { position: relative; width: 170px; height: 170px; }

    svg { width: 100%; height: 100%; transform: rotate(-90deg); }

    circle { fill: none; stroke-width: 14; }
    .fondo { stroke: #f1f3f8; }
    .segmento { transition: stroke-width .2s; animation: aparecer .9s ease; cursor: default; }
    .segmento:hover { stroke-width: 17; }

    .centro {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      strong { font-size: 28px; color: #1a2a5e; line-height: 1; }
      span { font-size: 12px; color: #64748b; margin-top: 4px; }
    }

    .leyenda {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; }
      strong { margin-left: auto; padding-left: 12px; color: #1a2a5e; }
    }

    .punto { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }

    @keyframes aparecer { from { opacity: 0; } }
  `]
})
export class GraficoDona {
  datos = input<PuntoGrafico[]>([]);
  colores = input<string[]>(['#2e7d32', '#1a2a5e', '#d32f2f', '#c8a84b']);
  unidad = input('total');

  protected readonly radio = RADIO;
  protected readonly circunferencia = CIRCUNFERENCIA;

  protected total = computed(() => this.datos().reduce((a, p) => a + p.valor, 0));

  protected segmentos = computed(() => {
    const total = this.total() || 1;
    let desde = 0;
    return this.datos().map((p, i) => {
      const largo = (p.valor / total) * CIRCUNFERENCIA;
      const s = {
        ...p,
        color: this.colores()[i % this.colores().length],
        largo,
        desde,
        pct: Math.round((p.valor / total) * 100)
      };
      desde += largo;
      return s;
    });
  });

  protected descripcion = computed(() =>
    this.segmentos().map((s) => `${s.etiqueta}: ${s.valor}`).join(', ')
  );
}
