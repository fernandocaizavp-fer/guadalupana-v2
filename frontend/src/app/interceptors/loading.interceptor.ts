import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading';

// Muestra el indicador de carga global durante cualquier petición DELETE,
// de modo que todas las acciones de "Eliminar" quedan cubiertas desde un solo punto.
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'DELETE') return next(req);

  const loadingService = inject(LoadingService);
  loadingService.mostrar();
  return next(req).pipe(finalize(() => loadingService.ocultar()));
};
