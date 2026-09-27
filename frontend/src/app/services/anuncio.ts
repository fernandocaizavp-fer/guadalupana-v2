import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnuncioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  listarAnuncios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/anuncios`, {
      headers: this.getHeaders()
    });
  }

  listarTodos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/anuncios/todos`, {
      headers: this.getHeaders()
    });
  }

  crearAnuncio(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/anuncios`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    });
  }

  actualizarAnuncio(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/anuncios/${id}`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    });
  }

  eliminarAnuncio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/anuncios/${id}`, {
      headers: this.getHeaders()
    });
  }
}