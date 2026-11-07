import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, finalize } from 'rxjs';
import { LoadingService } from '../services/loading';

// Permite excluir una petición concreta del indicador global:
//   this.http.post(url, body, { context: new HttpContext().set(SIN_CARGA_GLOBAL, true) })
export const SIN_CARGA_GLOBAL = new HttpContextToken<boolean>(() => false);

// Las consultas (GET) no bloquean la pantalla: hay peticiones de fondo (globos del
// panel, búsquedas) que taparían la interfaz a cada momento. Las pantallas que sí
// quieren el indicador al cargar lo piden con LoadingService.mostrar()/ocultar().
const METODOS_SIN_CARGA = ['GET', 'HEAD', 'OPTIONS'];

// Retardo antes de mostrar el indicador: las operaciones rápidas terminan antes y
// así no hay un parpadeo del overlay.
const RETARDO_MS = 300;

// Muestra el indicador de carga global durante toda escritura (POST, PUT, PATCH,
// DELETE): guardar, eliminar, subir archivos... quedan cubiertos desde un solo punto.
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (METODOS_SIN_CARGA.includes(req.method) || req.context.get(SIN_CARGA_GLOBAL)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  return defer(() => {
    let visible = false;
    const temporizador = setTimeout(() => {
      visible = true;
      loadingService.mostrar();
    }, RETARDO_MS);

    return next(req).pipe(
      finalize(() => {
        clearTimeout(temporizador);
        if (visible) loadingService.ocultar();
      })
    );
  });
};
