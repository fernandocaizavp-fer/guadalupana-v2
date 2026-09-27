import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  correo = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.authService.login(this.correo, this.password).subscribe({
      next: () => {
        if (this.authService.debeCambiarPassword()) {
          this.router.navigate(['/cambiar-password']);
        } else {
          this.router.navigate([this.authService.getRutaPorRol()]);
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Correo o contraseña incorrectos';
        this.loading = false;
      }
    });
  }

  irARecuperar() {
    this.router.navigate(['/recuperar-password']);
  }
}