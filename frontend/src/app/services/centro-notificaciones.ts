import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface ItemNotificacion {
  id: string;
  tipo: 'MENSAJE' | 'ANUNCIO' | 'TAREA' | 'PROSPECTO';
  titulo: string;
  subtitulo: string;
  detalle?: string;
  ruta: string;
  fecha: string | Date;
  leido: boolean;
  icono: string;
}

export interface ResumenNotificaciones {
  conteoTotal: number;
  totalMensajesNoLeidos: number;
  items: ItemNotificacion[];
}

@Injectable({
  providedIn: 'root'
})
export class CentroNotificacionesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  conteoTotal = signal<number>(0);
  items = signal<ItemNotificacion[]>([]);
  cargando = signal<boolean>(false);

  private subSondeo: Subscription | null = null;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
  }

  cargarResumen(): void {
    if (!this.authService.isLoggedIn()) {
      this.conteoTotal.set(0);
      this.items.set([]);
      return;
    }

    this.cargando.set(true);
    this.http.get<ResumenNotificaciones>(`${environment.apiUrl}/notificaciones/resumen`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        this.conteoTotal.set(res.conteoTotal || 0);
        this.items.set(res.items || []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  iniciarSondeo(): void {
    this.cargarResumen();
    if (!this.subSondeo) {
      // Consultar cada 60 segundos
      this.subSondeo = interval(60000).subscribe(() => {
        if (this.authService.isLoggedIn()) {
          this.cargarResumen();
        }
      });
    }
  }

  detenerSondeo(): void {
    if (this.subSondeo) {
      this.subSondeo.unsubscribe();
      this.subSondeo = null;
    }
  }

  navegarA(item: ItemNotificacion): void {
    if (item.ruta) {
      this.router.navigate([item.ruta]);
    }
  }
}
