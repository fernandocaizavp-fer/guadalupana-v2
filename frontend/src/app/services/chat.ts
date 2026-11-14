import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface MensajeChat {
  id: number;
  contenido: string;
  esMio: boolean;
  leido: boolean;
  fecha: string;
  materia?: string | null;
}

export interface ContactoChat {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
  fotoUrl?: string | null;
  correo: string;
  detalleMateria?: string;
  ultimoMensaje?: {
    contenido: string;
    fecha: string;
    esMio: boolean;
    leido: boolean;
  } | null;
  noLeidos: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  listarContactos(): Observable<ContactoChat[]> {
    return this.http.get<ContactoChat[]>(`${this.apiUrl}/chat/contactos`, {
      headers: this.getHeaders()
    });
  }

  obtenerConversacion(contactoId: number): Observable<{ contacto: ContactoChat; mensajes: MensajeChat[] }> {
    return this.http.get<{ contacto: ContactoChat; mensajes: MensajeChat[] }>(
      `${this.apiUrl}/chat/conversacion/${contactoId}`,
      { headers: this.getHeaders()}
    );
  }

  enviarMensaje(destinatarioId: number, contenido: string, materiaId?: number): Observable<MensajeChat> {
    return this.http.post<MensajeChat>(
      `${this.apiUrl}/chat/mensajes`,
      { destinatarioId, contenido, materiaId },
      { headers: this.getHeaders() }
    );
  }

  obtenerConteoNoLeidos(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/chat/no-leidos`, {
      headers: this.getHeaders()
    });
  }
}
