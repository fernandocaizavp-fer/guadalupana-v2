import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface Configuracion {
  id: number;
  supletorioHabilitado: boolean;
  supletorioInicio: string | null;
  supletorioFin: string | null;
  examenGradoInicio: string | null;
  examenGradoFin: string | null;
  notaMinima: number;
  notaMaxima: number;
  notaAprobacion: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  obtener(): Observable<Configuracion> {
    return this.http.get<Configuracion>(`${this.apiUrl}/configuracion`, {
      headers: this.getHeaders()
    });
  }

  actualizar(data: Partial<Configuracion>): Observable<any> {
    return this.http.put(`${this.apiUrl}/configuracion`, data, {
      headers: this.getHeaders()
    });
  }

  habilitarIndividual(matriculaId: number, habilitadoHasta: string, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/configuracion/permiso-supletorio`,
      { matriculaId, habilitadoHasta, motivo }, { headers: this.getHeaders() });
  }

  revocarIndividual(matriculaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/configuracion/permiso-supletorio/${matriculaId}`, {
      headers: this.getHeaders()
    });
  }

  listarPermisosSupletorio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/configuracion/permisos-supletorio`, {
      headers: this.getHeaders()
    });
  }

  habilitarRecalificacionExamen(matriculaId: number, habilitadoHasta: string, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/configuracion/permiso-examen-grado`,
      { matriculaId, habilitadoHasta, motivo }, { headers: this.getHeaders() });
  }

  revocarRecalificacionExamen(matriculaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/configuracion/permiso-examen-grado/${matriculaId}`, {
      headers: this.getHeaders()
    });
  }

  listarPermisosExamenGrado(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/configuracion/permisos-examen-grado`, {
      headers: this.getHeaders()
    });
  }

  buscarEstudiante(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/matriculas/buscar?q=${encodeURIComponent(q)}`, {
      headers: this.getHeaders()
    });
  }
}
