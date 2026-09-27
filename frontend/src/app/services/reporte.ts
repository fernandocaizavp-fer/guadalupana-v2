import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  generarAL9(cursoId: number, lugarFecha: string, jornada: string, regimen: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/reportes/al9/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}&regimen=${encodeURIComponent(regimen)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }
}