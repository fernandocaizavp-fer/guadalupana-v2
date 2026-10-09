import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Contador de operaciones en curso: el indicador solo se oculta cuando todas terminan
  // (p. ej. eliminar una submateria doble dispara dos DELETE en paralelo).
  private pendientes = signal(0);

  readonly isLoading = computed(() => this.pendientes() > 0);

  mostrar() {
    this.pendientes.update((n) => n + 1);
  }

  ocultar() {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
