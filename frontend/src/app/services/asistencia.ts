import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  crearAsistencia(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/asistencias`, datos, {
      headers: this.getHeaders()
    });
  }

  actualizarAsistencia(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/asistencias/${id}`, datos, {
      headers: this.getHeaders()
    });
  }

  getAsistenciasPorMateria(materiaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asistencias/materia/${materiaId}`, {
      headers: this.getHeaders()
    });
  }

  getResumenAsistenciaCurso(cursoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/asistencias/resumen/${cursoId}`, {
      headers: this.getHeaders()
    });
  }

  guardarObservacion(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/asistencias/observacion`, datos, {
      headers: this.getHeaders()
    });
  }

  eliminarAsistencia(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/asistencias/${id}`, {
      headers: this.getHeaders()
    });
  }

  generarAL18(cursoId: number, lugarFecha: string, jornada: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/asistencias/al18/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }
}