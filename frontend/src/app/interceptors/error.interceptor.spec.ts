import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { NotificacionService } from '../services/notificacion';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sesionIniciada: boolean;
  const auth = { isLoggedIn: () => sesionIniciada, logout: vi.fn(() => (sesionIniciada = false)) };
  const router = { navigate: vi.fn() };
  const notificacion = { info: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    sesionIniciada = true;
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: NotificacionService, useValue: notificacion }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('401 con sesión iniciada: cierra la sesión, avisa y va al login sin propagar el error', () => {
    const error = vi.fn();
    http.get('/api/cursos').subscribe({ error });
    backend.expectOne('/api/cursos').flush({ error: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(notificacion.info).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('varias peticiones 401 a la vez: un solo cierre de sesión y ningún error en pantalla', () => {
    const error = vi.fn();
    http.get('/api/a').subscribe({ error });
    http.get('/api/b').subscribe({ error });
    backend.expectOne('/api/a').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/b').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(notificacion.info).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('401 del login (contraseña incorrecta) llega a la pantalla sin cerrar sesión', () => {
    const error = vi.fn();
    http.post('/api/auth/login', {}).subscribe({ error });
    backend.expectOne('/api/auth/login').flush({ error: 'Contraseña incorrecta' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('sin conexión (estado 0): avisa y deja que la pantalla maneje el error', () => {
    const error = vi.fn();
    http.get('/api/cursos').subscribe({ error });
    backend.expectOne('/api/cursos').error(new ProgressEvent('error'), { status: 0 });
    expect(notificacion.error).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('otros errores (409, 500) pasan a la pantalla sin avisos globales', () => {
    const error = vi.fn();
    http.delete('/api/cursos/1').subscribe({ error });
    backend.expectOne('/api/cursos/1').flush({ error: 'Tiene matrículas' }, { status: 409, statusText: 'Conflict' });
    expect(error).toHaveBeenCalled();
    expect(notificacion.error).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
