import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export type TipoRecurso = 'GUIA_TALLER' | 'LISTA_MATERIALES' | 'VIDEO_TUTORIAL' | 'DOCUMENTO';

export interface RecursoDidactico {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoRecurso;
  urlRecurso: string;
  archivoNombre: string | null;
  cursoId: number | null;
  materiaId: number | null;
  autorId: number;
  creadoEn: string;
  updatedAt: string;
  autor?: { id: number; nombre: string; apellido: string; rol: string };
  materia?: { id: number; nombre: string };
  curso?: { id: number; ramaArtesanal: string; anioFormativo: string };
}

@Injectable({
  providedIn: 'root'
})
export class RecursoService {
  private apiUrl = `${environment.apiUrl}/recursos`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  listar(filtros?: { cursoId?: number; materiaId?: number; tipo?: string }): Observable<RecursoDidactico[]> {
    let params = new HttpParams();
    if (filtros?.cursoId) params = params.set('cursoId', filtros.cursoId.toString());
    if (filtros?.materiaId) params = params.set('materiaId', filtros.materiaId.toString());
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);

    return this.http.get<RecursoDidactico[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  crear(datos: {
    titulo: string;
    descripcion?: string;
    tipo: TipoRecurso;
    urlRecurso: string;
    archivoNombre?: string;
    cursoId?: number;
    materiaId?: number;
  }): Observable<{ message: string; recurso: RecursoDidactico }> {
    return this.http.post<{ message: string; recurso: RecursoDidactico }>(this.apiUrl, datos, {
      headers: this.getHeaders()
    });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }
}
