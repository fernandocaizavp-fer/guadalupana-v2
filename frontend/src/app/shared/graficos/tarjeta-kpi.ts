import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TonoKpi = 'azul' | 'dorado' | 'verde' | 'ambar' | 'rojo';

// Tarjeta de indicador reutilizable (paneles del docente y del estudiante).
//   <app-tarjeta-kpi icono="groups" titulo="Estudiantes" valor="28" tono="azul" (clic)="..." />
// Con (clic) enlazado se comporta como botón (teclado y foco incluidos).
@Component({
  selector: 'app-tarjeta-kpi',
  imports: [MatIconModule],
  template: `
    <button type="button" class="kpi" [class]="'tono-' + tono()" [class.estatica]="!navegable()"
            [attr.tabindex]="navegable() ? null : -1" (click)="navegable() && clic.emit()">
      <span class="icono"><mat-icon>{{ icono() }}</mat-icon></span>
      <span class="texto">
        <span class="titulo">{{ titulo() }}</span>
        <strong class="valor">{{ valor() }}</strong>
        @if (detalle()) {
          <span class="detalle">{{ detalle() }}</span>
        }
      </span>
    </button>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .kpi {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      background: #fff;
      border: 1px solid #e8eaf0;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      font: inherit;
      text-align: left;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: transform .25s ease, box-shadow .25s ease;

      &::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--tono);
      }

      &:not(.estatica):hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(26, 42, 94, .10); }
      &:focus-visible { outline: 3px solid #c8a84b; outline-offset: 2px; }
      &.estatica { cursor: default; }
    }

    .tono-azul { --tono: #1a2a5e; --suave: #e8ecf7; }
    .tono-dorado { --tono: #b08d2c; --suave: #fbf4e2; }
    .tono-verde { --tono: #2e7d32; --suave: #e8f5e9; }
    .tono-ambar { --tono: #b45309; --suave: #fef3c7; }
    .tono-rojo { --tono: #d32f2f; --suave: #fdecea; }

    .icono {
      width: 46px;
      height: 46px;
      flex-shrink: 0;
      border-radius: 12px;
      background: var(--suave);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: var(--tono); }
    }

    .texto { display: flex; flex-direction: column; min-width: 0; }
    .titulo { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    .valor { font-size: 22px; font-weight: 800; color: #1a2a5e; line-height: 1.25; }
    .detalle { font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class TarjetaKpi {
  icono = input.required<string>();
  titulo = input.required<string>();
  valor = input<string | number>('—');
  detalle = input('');
  tono = input<TonoKpi>('azul');
  navegable = input(false);
  clic = output<void>();
}
