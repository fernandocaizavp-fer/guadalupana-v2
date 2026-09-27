import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SuplетorioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  guardarMasivo(supletorios: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/supletorios/masivo`, { supletorios }, {
      headers: this.getHeaders()
    });
  }

  generarAL15(cursoId: number, lugarFecha: string, jornada: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/supletorios/al15/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  generarAL19(cursoId: number, lugarFecha: string, jornada: string): Observable<Blob> {
  return this.http.get(
    `${this.apiUrl}/supletorios/al19/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}`,
    { headers: this.getHeaders(), responseType: 'blob' }
  );
}

  generarAL16(matriculaId: number, lugarFecha: string, jornada: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/supletorios/al16/${matriculaId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }

  generarAL22(cursoId: number, lugarFecha: string, jornada: string, regimen: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/supletorios/al22/${cursoId}?lugarFecha=${encodeURIComponent(lugarFecha)}&jornada=${encodeURIComponent(jornada)}&regimen=${encodeURIComponent(regimen)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }
}