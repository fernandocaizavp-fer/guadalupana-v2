import { Component, computed, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, forkJoin, timer } from 'rxjs';
import { AuthService } from '../../services/auth';
import { LoadingService } from '../../services/loading';

type Perfil = 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';

// Tiempo mínimo que se muestra el indicador de carga al ingresar.
const DURACION_CARGA_MS = 3000;

@Component({
  selector: 'app-login',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  readonly perfiles: { id: Perfil; etiqueta: string; icono: string }[] = [
    { id: 'ESTUDIANTE', etiqueta: 'Estudiante', icono: 'school' },
    { id: 'DOCENTE', etiqueta: 'Docente', icono: 'menu_book' },
    { id: 'ADMINISTRATIVO', etiqueta: 'Administrativo', icono: 'admin_panel_settings' }
  ];

  // El perfil elegido solo define el diseño de la pantalla: el rol real lo determina
  // el backend a partir de las credenciales y la redirección usa ese rol.
  perfil = signal<Perfil | null>(null);
  perfilActual = computed(() => this.perfiles.find((p) => p.id === this.perfil()) ?? null);

  correo = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  seleccionarPerfil(perfil: Perfil) {
    this.perfil.set(perfil);
  }

  cambiarPerfil() {
    this.perfil.set(null);
    this.correo = '';
    this.password = '';
    this.error.set('');
  }

  login() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.loadingService.mostrar();

    // La petición real corre en paralelo con el temporizador: si las credenciales
    // son inválidas, forkJoin falla de inmediato y el indicador se oculta sin esperar.
    forkJoin([this.authService.login(this.correo, this.password), timer(DURACION_CARGA_MS)])
      .pipe(
        finalize(() => {
          this.loadingService.ocultar();
          this.loading.set(false);
        })
      )
      .subscribe({
        next: () => {
          if (this.authService.debeCambiarPassword()) {
            this.router.navigate(['/cambiar-password']);
          } else {
            this.router.navigate([this.authService.getRutaPorRol()]);
          }
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Correo o contraseña incorrectos');
        }
      });
  }

  irARecuperar() {
    this.router.navigate(['/recuperar-password']);
  }
}
