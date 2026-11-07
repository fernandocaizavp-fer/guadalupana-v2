import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface RegistroAuditoria {
  id: number;
  fecha: string;
  usuarioId: number | null;
  usuarioNombre: string;
  rol: string | null;
  ip: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  antes: any;
  despues: any;
}

export interface PaginaAuditoria {
  total: number;
  pagina: number;
  porPagina: number;
  entidades: string[];
  registros: RegistroAuditoria[];
}

export interface FiltrosAuditoria {
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private apiUrl = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  listar(filtros: FiltrosAuditoria): Observable<PaginaAuditoria> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') params = params.set(clave, String(valor));
    }
    return this.http.get<PaginaAuditoria>(this.apiUrl, { headers: this.getHeaders(), params });
  }
}
