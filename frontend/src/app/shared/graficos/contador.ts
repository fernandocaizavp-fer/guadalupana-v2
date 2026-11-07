import { Component, OnChanges, OnDestroy, input, signal } from '@angular/core';

const DURACION_MS = 900;

// Número que "cuenta" desde 0 hasta su valor al aparecer (efecto de los KPI).
@Component({
  selector: 'app-contador',
  template: `{{ texto() }}`
})
export class Contador implements OnChanges, OnDestroy {
  valor = input(0);
  moneda = input(false);

  protected texto = signal('0');
  private frame = 0;

  ngOnChanges() {
    cancelAnimationFrame(this.frame);
    const destino = this.valor() || 0;
    const reducido = typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido || destino === 0) {
      this.texto.set(this.formatear(destino));
      return;
    }
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS);
      const suavizado = 1 - Math.pow(1 - t, 3);
      this.texto.set(this.formatear(destino * suavizado));
      if (t < 1) this.frame = requestAnimationFrame(paso);
    };
    this.frame = requestAnimationFrame(paso);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
  }

  private formatear(n: number) {
    return this.moneda()
      ? '$' + n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(n).toLocaleString('es-EC');
  }
}
