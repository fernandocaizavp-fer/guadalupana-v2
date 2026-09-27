import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getTareasPorMateria(materiaId: number, semestre?: number): Observable<any[]> {
    const params = semestre ? `?semestre=${semestre}` : '';
    return this.http.get<any[]>(`${this.apiUrl}/tareas/materia/${materiaId}${params}`, {
      headers: this.getHeaders()
    });
  }

  crearTarea(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tareas`, datos, {
      headers: this.getHeaders()
    });
  }

  actualizarTarea(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tareas/${id}`, datos, {
      headers: this.getHeaders()
    });
  }

  guardarNotas(notas: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/tareas/notas`, { notas }, {
      headers: this.getHeaders()
    });
  }

  eliminarTarea(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tareas/${id}`, {
      headers: this.getHeaders()
    });
  }

  getNotasCursoSemestre(cursoId: number, semestre?: number): Observable<any> {
    const params = semestre ? `?semestre=${semestre}` : '';
    return this.http.get(`${this.apiUrl}/tareas/curso/${cursoId}${params}`, {
      headers: this.getHeaders()
    });
  }

  descargarAL14(cursoId: number, lugarFecha: string, semestre: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/notas/al14/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&semestre=${semestre}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  // ---------- Archivos adjuntos del docente ----------
  subirArchivosTarea(tareaId: number, archivos: File[]): Observable<any> {
    const form = new FormData();
    archivos.forEach(a => form.append('archivos', a));
    return this.http.post(`${this.apiUrl}/tareas/${tareaId}/archivos`, form, {
      headers: this.getHeaders()
    });
  }

  eliminarArchivoTarea(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tareas/archivos/${id}`, { headers: this.getHeaders() });
  }

  getEntregasTarea(tareaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tareas/${tareaId}/entregas`, { headers: this.getHeaders() });
  }

  // ---------- Entregas del estudiante ----------
  subirEntrega(tareaId: number, archivos: File[], comentario = ''): Observable<any> {
    const form = new FormData();
    archivos.forEach(a => form.append('archivos', a));
    if (comentario) form.append('comentario', comentario);
    return this.http.post(`${this.apiUrl}/tareas/${tareaId}/entregas`, form, {
      headers: this.getHeaders()
    });
  }

  getMiEntrega(tareaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tareas/${tareaId}/entregas/mias`, { headers: this.getHeaders() });
  }

  eliminarArchivoEntrega(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tareas/entregas/archivos/${id}`, { headers: this.getHeaders() });
  }
}