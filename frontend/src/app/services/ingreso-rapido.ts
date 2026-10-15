import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

// Ingreso rápido masivo (Configuración): notas finales escritas por el administrador
// que los formatos AL usan con prioridad sobre tareas, listas y exámenes por materia.

export type ClaveMateria =
  | 'TEORIA' | 'PRACTICA' | 'ADMINISTRACION' | 'CONTABILIDAD' | 'TICS'
  | 'INGLES' | 'DESARROLLO' | 'PROYECTOS' | 'LEGISLACION' | 'DISCIPLINA';

export interface ColumnaMateria {
  clave: ClaveMateria;
  corto: string;   // encabezado de la tabla
  nombre: string;  // nombre completo (tooltip y selector)
}

// Columnas de la pestaña Notas, en el orden de los AL.
export const MATERIAS_NOTAS: ColumnaMateria[] = [
  { clave: 'TEORIA', corto: 'Teoría', nombre: 'Teoría' },
  { clave: 'PRACTICA', corto: 'Práctica', nombre: 'Práctica' },
  { clave: 'ADMINISTRACION', corto: 'Adm. Talleres', nombre: 'Administración de Talleres' },
  { clave: 'CONTABILIDAD', corto: 'Contabilidad', nombre: 'Contabilidad' },
  { clave: 'TICS', corto: 'TIC', nombre: 'TIC' },
  { clave: 'INGLES', corto: 'Inglés Téc.', nombre: 'Inglés Técnico' },
  { clave: 'DESARROLLO', corto: 'Des. Humano', nombre: 'Desarrollo Humano y Ética' },
  { clave: 'PROYECTOS', corto: 'Elab. Proyectos', nombre: 'Elaboración de Proyectos Productivos' },
  { clave: 'LEGISLACION', corto: 'Legislación', nombre: 'Legislación' },
  { clave: 'DISCIPLINA', corto: 'Disciplina', nombre: 'Disciplina' }
];

// Columnas del AL23: las mismas sin Elaboración de Proyectos.
export const MATERIAS_EXAMEN: ColumnaMateria[] = MATERIAS_NOTAS.filter((m) => m.clave !== 'PROYECTOS');

export interface EstudianteRapido {
  id: number; // matriculaId
  apellidos: string;
  nombres: string;
  cedula: string;
}

export interface RespuestaNotas {
  estudiantes: EstudianteRapido[];
  registros: { matriculaId: number; materia: ClaveMateria; semestre: number; nota: number }[];
}

export interface RespuestaExamenes {
  estudiantes: EstudianteRapido[];
  registros: { matriculaId: number; materia: ClaveMateria; nota: number }[];
}

export interface RespuestaAsistencias {
  estudiantes: EstudianteRapido[];
  registros: { matriculaId: number; porcentaje: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class IngresoRapidoService {
  private apiUrl = `${environment.apiUrl}/configuracion`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  obtenerNotas(cursoId: number): Observable<RespuestaNotas> {
    return this.http.get<RespuestaNotas>(`${this.apiUrl}/notas-bulk/${cursoId}`, { headers: this.getHeaders() });
  }

  guardarNotas(cursoId: number, notas: { matriculaId: number; materia: ClaveMateria; semestre: number; nota: number | null }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/notas-bulk`, { cursoId, notas }, { headers: this.getHeaders() });
  }

  obtenerExamenes(cursoId: number): Observable<RespuestaExamenes> {
    return this.http.get<RespuestaExamenes>(`${this.apiUrl}/examenes-bulk/${cursoId}`, { headers: this.getHeaders() });
  }

  guardarExamenes(cursoId: number, examenes: { matriculaId: number; materia: ClaveMateria; nota: number | null }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/examenes-bulk`, { cursoId, examenes }, { headers: this.getHeaders() });
  }

  obtenerAsistencias(cursoId: number): Observable<RespuestaAsistencias> {
    return this.http.get<RespuestaAsistencias>(`${this.apiUrl}/asistencias-bulk/${cursoId}`, { headers: this.getHeaders() });
  }

  guardarAsistencias(cursoId: number, asistencias: { matriculaId: number; porcentaje: number | null }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/asistencias-bulk`, { cursoId, asistencias }, { headers: this.getHeaders() });
  }

  // Borra todos los registros rápidos de un curso para una pestaña.
  limpiar(tipo: 'notas' | 'examenes' | 'asistencias', cursoId: number): Observable<{ message: string; borrados: number }> {
    return this.http.delete<{ message: string; borrados: number }>(
      `${this.apiUrl}/${tipo}-bulk/${cursoId}`, { headers: this.getHeaders() }
    );
  }
}
