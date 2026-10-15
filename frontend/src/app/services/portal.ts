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

export type FormatoGrid = 'GRANDE' | 'VERTICAL' | 'HORIZONTAL' | 'PEQUENA_1' | 'PEQUENA_2';

// Formas que puede ocupar una foto en la cuadrícula de la galería de la landing.
export const FORMATOS_GRID: { valor: FormatoGrid; etiqueta: string }[] = [
  { valor: 'GRANDE', etiqueta: 'Grande' },
  { valor: 'VERTICAL', etiqueta: 'Alargada vertical' },
  { valor: 'HORIZONTAL', etiqueta: 'Alargada horizontal' },
  { valor: 'PEQUENA_1', etiqueta: 'Pequeña 1' },
  { valor: 'PEQUENA_2', etiqueta: 'Pequeña 2' }
];

export interface FotoGaleria {
  id: number;
  titulo: string;
  imagenUrl: string;
  formatoGrid: FormatoGrid;
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

  subirFoto(titulo: string, imagen: File, formatoGrid: FormatoGrid): Observable<FotoGaleria> {
    const datos = new FormData();
    datos.append('titulo', titulo);
    datos.append('formatoGrid', formatoGrid);
    datos.append('imagen', imagen);
    return this.http.post<FotoGaleria>(`${this.adminUrl}/galeria`, datos, { headers: this.getHeaders() });
  }

  renombrarFoto(id: number, titulo: string, formatoGrid: FormatoGrid): Observable<any> {
    return this.http.put(`${this.adminUrl}/galeria/${id}`, { titulo, formatoGrid }, { headers: this.getHeaders() });
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
