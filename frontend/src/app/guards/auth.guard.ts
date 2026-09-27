import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const roles = route.data['roles'] as string[];
    if (roles) {
      const usuario = this.authService.getUsuario();
      if (!roles.includes(usuario?.rol)) {
        this.router.navigate([this.getRutaPorRol(usuario?.rol)]);
        return false;
      }
    }

    return true;
  }

  private getRutaPorRol(rol: string): string {
    switch (rol) {
      case 'ADMIN': return '/dashboard';
      case 'PROFESOR': return '/profesor';
      case 'ESTUDIANTE': return '/estudiante';
      default: return '/login';
    }
  }
}