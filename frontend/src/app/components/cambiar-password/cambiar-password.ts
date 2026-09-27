import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-cambiar-password',
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.scss'
})
export class CambiarPassword {
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  error = '';
  exito = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  // Validaciones visuales en tiempo real
  get tieneLongitud(): boolean { return this.passwordNueva.length >= 8; }
  get tieneMayuscula(): boolean { return /[A-Z]/.test(this.passwordNueva); }
  get tieneNumero(): boolean { return /[0-9]/.test(this.passwordNueva); }
  get coinciden(): boolean { return this.passwordNueva === this.passwordConfirmar && this.passwordConfirmar !== ''; }

  get formularioValido(): boolean {
    return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero && this.coinciden && this.passwordActual !== '';
  }

  cambiar() {
    this.error = '';
    this.exito = '';

    if (!this.formularioValido) {
      this.error = 'Revise que la contraseña cumpla todos los requisitos';
      return;
    }

    const usuario = this.authService.getUsuario();
    this.loading = true;

    this.authService.cambiarPassword(usuario.id, this.passwordActual, this.passwordNueva).subscribe({
      next: () => {
        this.exito = 'Contraseña actualizada correctamente';
        this.authService.marcarPasswordCambiada();
        this.loading = false;
        // Lo manda a su portal después de un momento
        setTimeout(() => this.router.navigate([this.authService.getRutaPorRol()]), 1500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al cambiar la contraseña';
        this.loading = false;
      }
    });
  }
}