import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(correo: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { correo, password }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
      })
    );
  }




  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUsuario(): any {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  }

  getRutaPorRol(): string {
    const usuario = this.getUsuario();
    switch (usuario?.rol) {
      case 'ADMIN': return '/dashboard';
      case 'PROFESOR': return '/profesor';
      case 'ESTUDIANTE': return '/estudiante';
      default: return '/login';
    }
  }

  debeCambiarPassword(): boolean {
    const usuario = this.getUsuario();
    return usuario?.debeCambiarPassword === true;
  }

  cambiarPassword(usuarioId: number, passwordActual: string, passwordNueva: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/cambiar-password`, { usuarioId, passwordActual, passwordNueva });
  }

  marcarPasswordCambiada() {
    const usuario = this.getUsuario();
    if (usuario) {
      usuario.debeCambiarPassword = false;
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
  }

  solicitarRecuperacion(correo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/solicitar-recuperacion`, { correo });
  }

  restablecerPassword(correo: string, codigo: string, passwordNueva: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/restablecer-password`, { correo, codigo, passwordNueva });
  }

}