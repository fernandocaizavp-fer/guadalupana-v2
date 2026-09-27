import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExamenGradoService {
  private api = `${environment.apiUrl}/examen-grado`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getEstudiantes(materiaId: number) {
    return this.http.get<any>(`${this.api}/materia/${materiaId}`, { headers: this.headers() });
  }

  guardar(notas: any[]) {
    return this.http.post<any>(`${this.api}/guardar`, { notas }, { headers: this.headers() });
  }

  getPorCurso(cursoId: number) {
    return this.http.get<any>(`${this.api}/curso/${cursoId}`, { headers: this.headers() });
  }

  generarAL23(cursoId: number, lugarFecha: string, jornada: string) {
  return this.http.get(
    `${this.api}/generar-al23/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${jornada}`,
    { headers: this.headers(), responseType: 'blob' }
  );
}
}