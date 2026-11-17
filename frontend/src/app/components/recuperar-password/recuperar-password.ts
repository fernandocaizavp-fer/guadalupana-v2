import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth';

const URL_EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_SERVICE = 'service_z7zewvc';
const EMAILJS_TEMPLATE = 'template_s3ktec8';
const EMAILJS_PUBLIC_KEY = 'ENzKszL5IxzmsSt26';

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

  @ViewChild('inputCodigo') inputCodigo?: ElementRef<HTMLInputElement>;
  @ViewChild('inputPassword') inputPassword?: ElementRef<HTMLInputElement>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // Validaciones visuales
  get tieneLongitud(): boolean { return this.passwordNueva.length >= 8; }
  get tieneMayuscula(): boolean { return /[A-Z]/.test(this.passwordNueva); }
  get tieneNumero(): boolean { return /[0-9]/.test(this.passwordNueva); }
  get coinciden(): boolean { return this.passwordNueva === this.passwordConfirmar && this.passwordConfirmar !== ''; }
  get passwordValida(): boolean {
    return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero && this.coinciden;
  }

  // PASO 1: solicitar el código
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
      next: async (res) => {
        // Si el backend entrega el código (despacho cliente con EmailJS)
        if (res?.codigo) {
          try {
            await fetch(URL_EMAILJS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: EMAILJS_SERVICE,
                template_id: EMAILJS_TEMPLATE,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                  correo: this.correo,
                  nombre: res.nombre,
                  codigo: res.codigo
                }
              })
            });
            this.finalizarEnvioExitoso('Se envió un código a su correo (válido por 15 minutos)');
          } catch (e) {
            this.error = 'No se pudo enviar el correo. Intente de nuevo';
            this.loading = false;
            this.cdr.detectChanges();
          }
        } else {
          // El servidor ya envió el correo directamente
          this.finalizarEnvioExitoso(res?.message || 'Si el correo está registrado, recibirás un código de verificación.');
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'No se pudo solicitar el código. Intente de nuevo';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private finalizarEnvioExitoso(mensaje: string) {
    this.exito = mensaje;
    this.loading = false;
    this.paso = 2;
    this.cdr.detectChanges(); // Inmediatamente avanza al Paso 2 sin requerir clic
    setTimeout(() => {
      this.inputCodigo?.nativeElement?.focus(); // Foco automático en el casillero del código
    }, 100);
  }

  onCodigoChange() {
    // Al completar los 6 dígitos del código, salta automáticamente al campo de contraseña
    if (this.codigo && this.codigo.trim().length === 6) {
      setTimeout(() => {
        this.inputPassword?.nativeElement?.focus();
      }, 50);
    }
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
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Código inválido o expirado';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  volverLogin() {
    this.router.navigate(['/login']);
  }
}