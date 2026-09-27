import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getNotasCurso(cursoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/notas/curso/${cursoId}`, {
      headers: this.getHeaders()
    });
  }

  guardarNotasMasivo(notas: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/notas/masivo`, { notas }, {
      headers: this.getHeaders()
    });
  }

  descargarAL14(cursoId: number, lugarFecha: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/notas/al14/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }
}