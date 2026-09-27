import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import emailjs from '@emailjs/browser';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-recuperar-password',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.scss'
})
export class RecuperarPassword {
  // Paso 1 = pedir correo, Paso 2 = ingresar código y nueva contraseña
  paso = 1;

  correo = '';
  codigo = '';
  passwordNueva = '';
  passwordConfirmar = '';

  error = '';
  exito = '';
  loading = false;

  // Datos de EmailJS
  private readonly SERVICE_ID = 'service_z7zewvc';
  private readonly TEMPLATE_ID = 'template_s3ktec8';
  private readonly PUBLIC_KEY = 'ENzKszL5IxzmsSt26';

  constructor(private authService: AuthService, private router: Router) {}

  // Validaciones visuales
  get tieneLongitud(): boolean { return this.passwordNueva.length >= 8; }
  get tieneMayuscula(): boolean { return /[A-Z]/.test(this.passwordNueva); }
  get tieneNumero(): boolean { return /[0-9]/.test(this.passwordNueva); }
  get coinciden(): boolean { return this.passwordNueva === this.passwordConfirmar && this.passwordConfirmar !== ''; }
  get passwordValida(): boolean {
    return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero && this.coinciden;
  }

  // PASO 1: solicitar el código y enviarlo por correo
  // PASO 1: solicitar el código y enviarlo por correo
  enviarCodigo() {
    if (this.loading) return;
    this.error = '';
    this.exito = '';

    if (!this.correo) {
      this.error = 'Ingrese su correo electrónico';
      return;
    }

    this.loading = true;
    this.authService.solicitarRecuperacion(this.correo).subscribe({
      next: (res) => {
        console.log("Respuesta del backend exitosa:", res); // Para confirmar que el backend sí responde
        
        // El backend devuelve el código y el nombre; los enviamos por EmailJS
        emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, {
          correo: this.correo,
          nombre: res.nombre,
          codigo: res.codigo
        }, this.PUBLIC_KEY).then((response) => {
          console.log("EmailJS enviado correctamente:", response);
          this.exito = 'Se envió un código a su correo';
          this.loading = false;
          this.paso = 2;
        }).catch((err) => {
          console.error("Error exacto de EmailJS:", err); // Aquí veremos si sigue el error 412 de Gmail
          this.error = 'No se pudo enviar el correo. Intente de nuevo';
          this.loading = false;
        });
      },
      error: (err) => {
        console.error("Error devuelto por el backend:", err); // Aquí veremos si la API falla o si es problema de CORS
        this.error = err.error?.error || 'No existe una cuenta con ese correo';
        this.loading = false;
      }
    });
  }

  // PASO 2: validar código y cambiar la contraseña
  restablecer() {
    if (this.loading) return;
    this.error = '';
    this.exito = '';

    if (!this.codigo) {
      this.error = 'Ingrese el código que recibió';
      return;
    }
    if (!this.passwordValida) {
      this.error = 'La contraseña no cumple los requisitos';
      return;
    }

    this.loading = true;
    this.authService.restablecerPassword(this.correo, this.codigo, this.passwordNueva).subscribe({
      next: () => {
        this.exito = 'Contraseña restablecida. Ya puede iniciar sesión';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Código inválido o expirado';
        this.loading = false;
      }
    });
  }

  volverLogin() {
    this.router.navigate(['/login']);
  }
}