import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
}

export interface ResumenDashboard {
  kpis: {
    estudiantes: number;
    cursos: number;
    docentes: number;
    comprobantesPendientes: number;
    prospectosPendientes: number;
    recaudado: number;
    porCobrar: number;
    deudasEnMora: number;
    montoEnMora: number;
  };
  recaudacionMensual: { etiqueta: string; total: number }[];
  estadoCartera: PuntoGrafico[];
  estudiantesPorCurso: (PuntoGrafico & { cursoId: number })[];
}

export interface ResumenProfesor {
  materias: number;
  cursos: number;
  estudiantes: number;
  porCalificar: number;
  tareasActivas: number;
  asistenciasSemana: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  obtenerResumen(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${this.apiUrl}/resumen`, { headers: this.getHeaders() });
  }

  obtenerResumenProfesor(): Observable<ResumenProfesor> {
    return this.http.get<ResumenProfesor>(`${this.apiUrl}/profesor`, { headers: this.getHeaders() });
  }
}
