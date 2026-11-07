import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth';

// Página 404: cualquier ruta inexistente termina aquí (ruta '**').
@Component({
  selector: 'app-no-encontrado',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <main class="no-encontrado">
      <div class="robot">
        <img src="cargando.webp" alt="" width="340" height="340">
      </div>
      <span class="codigo">404</span>
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o fue movida. Revisa el enlace o vuelve al inicio.</p>
      <div class="acciones">
        <button mat-flat-button class="btn-inicio" (click)="irAlInicio()">
          <mat-icon>home</mat-icon> {{ textoInicio }}
        </button>
        <button mat-button class="btn-atras" (click)="volver()">
          <mat-icon>arrow_back</mat-icon> Regresar
        </button>
      </div>
    </main>
  `,
  styles: [`
    .no-encontrado {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 16px;
      background: radial-gradient(circle at 50% 30%, #fffaf0, #f4f5f9 70%);
    }

    .robot {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid #c8a84b;
      background: white;
      box-shadow: 0 12px 30px rgba(26, 42, 94, 0.2);
      animation: levitar 2.2s ease-in-out infinite;

      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }

    .codigo {
      margin-top: 22px;
      font-size: 72px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 4px;
      background: linear-gradient(135deg, #1a2a5e, #c8a84b);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    h1 { margin: 8px 0; font-size: 24px; color: #1a2a5e; }
    p { margin: 0; max-width: 420px; color: #64748b; line-height: 1.5; }

    .acciones { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }

    .btn-inicio {
      border-radius: 10px;
      background: #1a2a5e !important;
      color: white !important;
    }

    .btn-atras { color: #1a2a5e !important; }

    mat-icon { margin-right: 4px; }

    @keyframes levitar {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .robot { animation: none; }
    }
  `]
})
export class NoEncontrado {
  private router = inject(Router);
  private authService = inject(AuthService);

  private readonly destino = this.authService.isLoggedIn() ? this.authService.getRutaPorRol() : '/';
  protected readonly textoInicio = this.authService.isLoggedIn() ? 'Ir a mi panel' : 'Ir al inicio';

  irAlInicio() {
    this.router.navigate([this.destino]);
  }

  volver() {
    history.length > 1 ? history.back() : this.irAlInicio();
  }
}
