import { DatosExtraidosMatricula } from './matricula-datos';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatriculaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  extraerDatos(texto: string): Observable<DatosExtraidosMatricula> {
    return this.http.post<DatosExtraidosMatricula>(`${this.apiUrl}/matriculas/extraer-datos`, { texto }, {
      headers: this.getHeaders()
    });
  }

  crearMatricula(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/matriculas`, datos, {
      headers: this.getHeaders()
    });
  }

  descargarMatricula(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/matricula/${id}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  descargarCertificado(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/certificado/${id}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Matrícula completa (con datos personales, familiares, académicos y el correo
  // de acceso), para editarla sin perder los campos que la lista del curso no trae.
  obtenerMatricula(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matriculas/${id}`, {
      headers: this.getHeaders()
    });
  }

  actualizarMatricula(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/matriculas/${id}`, datos, {
      headers: this.getHeaders()
    });
  }

  eliminarMatricula(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/matriculas/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Estudiantes dados de baja (de todos los cursos), para volver a matricularlos.
  listarArchivadas(q = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/matriculas/archivadas`, {
      headers: this.getHeaders(),
      params: q ? { q } : {}
    });
  }

  reactivarMatricula(id: number, cursoId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/matriculas/${id}/reactivar`, { cursoId }, {
      headers: this.getHeaders()
    });
  }

  getCursos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cursos`, {
      headers: this.getHeaders()
    });
  }

  getSiguienteMatricula(cursoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/matriculas/siguiente/${cursoId}`, {
      headers: this.getHeaders()
    });
  }

  consultarCedula(cedula: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cedula/${cedula}`, {
      headers: this.getHeaders()
    });
  }
}