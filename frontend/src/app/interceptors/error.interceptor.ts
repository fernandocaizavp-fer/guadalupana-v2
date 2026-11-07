import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { NotificacionService } from '../services/notificacion';

// Manejo global de los errores HTTP que ninguna pantalla debería tratar por su cuenta:
// - 401 con sesión iniciada: el JWT caducó (dura 8 h) o es inválido. Se cierra la
//   sesión y se vuelve al login una sola vez, aunque fallen varias peticiones a la vez.
// - 0: no hubo respuesta (sin internet, servidor dormido o caído).
// El resto de errores (400, 403, 409, 500...) siguen llegando a cada componente,
// que muestra el mensaje concreto del backend.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // El login devuelve 401 por credenciales incorrectas: eso lo maneja su pantalla.
      const esAutenticacion = req.url.includes('/auth/');

      if (err.status === 401 && !esAutenticacion && authService.isLoggedIn()) {
        authService.logout();
        notificacion.info('Tu sesión expiró. Vuelve a iniciar sesión.');
        router.navigate(['/login']);
        // No se propaga: la pantalla que hizo la petición ya no está visible.
        return EMPTY;
      }

      if (err.status === 0) {
        notificacion.error('Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
      }

      return throwError(() => err);
    })
  );
};
