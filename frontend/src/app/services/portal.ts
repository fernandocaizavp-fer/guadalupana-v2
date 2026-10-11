import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

// Portal público (landing). Nada de esto se mezcla con la gestión académica:
// `AnuncioPublico` no es el anuncio interno de docentes y estudiantes.

export type EstadoProspecto = 'PENDIENTE' | 'CONTACTADO';

export interface Prospecto {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  especialidadInteres: string;
  estado: EstadoProspecto;
  fechaRegistro: string;
}

export interface DatosProspecto {
  nombres: string;
  apellidos: string;
  telefono: string;
  especialidadInteres: string;
}

export interface AnuncioPublico {
  id: number;
  titulo: string;
  contenido: string;
  imagenUrl: string | null;
  fechaPublicacion: string;
  activo: boolean;
}

export interface FotoGaleria {
  id: number;
  titulo: string;
  imagenUrl: string;
  fechaSubida: string;
}

export interface EventoPublico {
  id: number;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string | null;
}

export interface DatosEvento {
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
}

export const ESPECIALIDADES = ['Belleza', 'Maquillaje', 'Fotografía'];

@Injectable({
  providedIn: 'root'
})
export class PortalService {
  private apiUrl = `${environment.apiUrl}/portal`;
  private adminUrl = `${this.apiUrl}/admin`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  // ── Públicos: los usa la landing, sin token ──

  anunciosPublicados(): Observable<AnuncioPublico[]> {
    return this.http.get<AnuncioPublico[]>(`${this.apiUrl}/anuncios`);
  }

  galeriaPublicada(): Observable<FotoGaleria[]> {
    return this.http.get<FotoGaleria[]>(`${this.apiUrl}/galeria`);
  }

  calendarioPublicado(): Observable<EventoPublico[]> {
    return this.http.get<EventoPublico[]>(`${this.apiUrl}/calendario`);
  }

  // `sitioWeb` es el campo trampa contra bots: una persona lo deja vacío.
  preinscribir(datos: DatosProspecto & { sitioWeb?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/prospectos`, datos);
  }

  // ── Administrador: prospectos ──

  listarProspectos(): Observable<Prospecto[]> {
    return this.http.get<Prospecto[]>(`${this.adminUrl}/prospectos`, { headers: this.getHeaders() });
  }

  contarProspectosPendientes(): Observable<number> {
    return this.http.get<number>(`${this.adminUrl}/prospectos/pendientes/count`, { headers: this.getHeaders() });
  }

  crearProspecto(datos: DatosProspecto): Observable<Prospecto> {
    return this.http.post<Prospecto>(`${this.adminUrl}/prospectos`, datos, { headers: this.getHeaders() });
  }

  cambiarEstadoProspecto(id: number, estado: EstadoProspecto): Observable<any> {
    return this.http.put(`${this.adminUrl}/prospectos/${id}`, { estado }, { headers: this.getHeaders() });
  }

  eliminarProspecto(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/prospectos/${id}`, { headers: this.getHeaders() });
  }

  // ── Administrador: anuncios a terceros ──
  // multipart: el navegador pone el Content-Type con su boundary, no se fija a mano.

  listarAnuncios(): Observable<AnuncioPublico[]> {
    return this.http.get<AnuncioPublico[]>(`${this.adminUrl}/anuncios`, { headers: this.getHeaders() });
  }

  crearAnuncio(datos: FormData): Observable<AnuncioPublico> {
    return this.http.post<AnuncioPublico>(`${this.adminUrl}/anuncios`, datos, { headers: this.getHeaders() });
  }

  actualizarAnuncio(id: number, datos: FormData): Observable<AnuncioPublico> {
    return this.http.put<AnuncioPublico>(`${this.adminUrl}/anuncios/${id}`, datos, { headers: this.getHeaders() });
  }

  eliminarAnuncio(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/anuncios/${id}`, { headers: this.getHeaders() });
  }

  // ── Administrador: galería web ──

  listarGaleria(): Observable<FotoGaleria[]> {
    return this.http.get<FotoGaleria[]>(`${this.adminUrl}/galeria`, { headers: this.getHeaders() });
  }

  subirFoto(titulo: string, imagen: File): Observable<FotoGaleria> {
    const datos = new FormData();
    datos.append('titulo', titulo);
    datos.append('imagen', imagen);
    return this.http.post<FotoGaleria>(`${this.adminUrl}/galeria`, datos, { headers: this.getHeaders() });
  }

  renombrarFoto(id: number, titulo: string): Observable<any> {
    return this.http.put(`${this.adminUrl}/galeria/${id}`, { titulo }, { headers: this.getHeaders() });
  }

  eliminarFoto(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/galeria/${id}`, { headers: this.getHeaders() });
  }

  // ── Administrador: calendario público ──

  listarCalendario(): Observable<EventoPublico[]> {
    return this.http.get<EventoPublico[]>(`${this.adminUrl}/calendario`, { headers: this.getHeaders() });
  }

  crearEvento(datos: DatosEvento): Observable<EventoPublico> {
    return this.http.post<EventoPublico>(`${this.adminUrl}/calendario`, datos, { headers: this.getHeaders() });
  }

  actualizarEvento(id: number, datos: DatosEvento): Observable<any> {
    return this.http.put(`${this.adminUrl}/calendario/${id}`, datos, { headers: this.getHeaders() });
  }

  eliminarEvento(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/calendario/${id}`, { headers: this.getHeaders() });
  }
}
