import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Pantalla vacía uniforme: icono, título, mensaje y una acción opcional.
//   <app-estado-vacio icono="school" titulo="Aún no hay cursos"
//                     mensaje="..." accion="Crear curso" (accionClick)="nuevo()" />
@Component({
  selector: 'app-estado-vacio',
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="estado-vacio" [class.compacto]="compacto()">
      <div class="icono">
        <mat-icon>{{ icono() }}</mat-icon>
      </div>
      <h3>{{ titulo() }}</h3>
      @if (mensaje()) {
        <p>{{ mensaje() }}</p>
      }
      @if (accion()) {
        <button mat-flat-button class="btn-accion" (click)="accionClick.emit()">
          <mat-icon>add</mat-icon> {{ accion() }}
        </button>
      }
    </div>
  `,
  styles: [`
    /* Siempre a todo el ancho y centrado, aunque el contenedor sea flex o grid:
       antes podía quedar pegado a una esquina. */
    :host { display: block; width: 100%; grid-column: 1 / -1; box-sizing: border-box; }

    /* Tarjeta con la identidad del centro: fondo claro, filete dorado arriba y
       azul institucional (#1a2a5e) en el icono y el título. */
    .estado-vacio {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      margin: 8px auto;
      max-width: 560px;
      background: linear-gradient(180deg, #ffffff 0%, #fbf8f0 100%);
      border: 1px solid #ece3c8;
      border-radius: 18px;
      box-shadow: 0 6px 20px rgba(26, 42, 94, .07);
      overflow: hidden;
      animation: aparecer .35s ease;

      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
        background: linear-gradient(90deg, #1a2a5e, #c8a84b, #1a2a5e);
      }

      /* Dentro de otra tarjeta: sin sombra para no apilar tarjetas. */
      &.compacto {
        padding: 24px 16px;
        max-width: none;
        box-shadow: none;
        border-style: dashed;
        &::before { display: none; }
      }
    }

    .icono {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #fff8e6, #f3ead2);
      border: 2px dashed #c8a84b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;

      mat-icon { font-size: 38px; width: 38px; height: 38px; color: #1a2a5e; }
    }

    .compacto .icono {
      width: 60px;
      height: 60px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    h3 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #1a2a5e; }
    p { margin: 0; max-width: 380px; font-size: 14px; line-height: 1.5; color: #64748b; }

    .btn-accion {
      margin-top: 18px;
      border-radius: 10px;
      background: #1a2a5e !important;
      color: #fff !important;
      mat-icon { margin-right: 4px; }
    }

    @keyframes aparecer { from { opacity: 0; transform: translateY(6px); } }
  `]
})
export class EstadoVacio {
  icono = input('inbox');
  titulo = input.required<string>();
  mensaje = input('');
  accion = input('');
  compacto = input(false);
  accionClick = output<void>();
}
