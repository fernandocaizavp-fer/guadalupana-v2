import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export interface DocenteResumen {
  id: number;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
}

export interface MateriaAula {
  id: number;
  nombre: string;
  tieneSubmaterias: boolean;
  submaterias: number;
  docente: DocenteResumen | null;
  horasTotales: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  asistencia: number | null; // porcentaje 0-100; null = sin clases registradas
}

export interface AulaVirtualRespuesta {
  curso: { id: number; ramaArtesanal: string; anioFormativo: string };
  semestre: number;
  materias: MateriaAula[];
  disciplina: number | null;
}

export interface AsistenciaMateria {
  id: number;
  nombre: string;
  grupo: string | null; // 'Práctica' | 'Teoría' para submaterias
  clases: number;
  asistencias: number;
  faltas: number;
  porcentaje: number | null;
  fechasFaltas: string[];
}

export interface AsistenciasRespuesta {
  resumen: { clases: number; asistencias: number; faltas: number; porcentaje: number | null };
  materias: AsistenciaMateria[];
}

export interface TareaPendiente {
  id: number;
  titulo: string;
  materia: string;
  materiaId: number;
  semestre: number;
  fechaLimite: string;
}

export interface MateriaProgramable {
  id: number;
  nombre: string;
  esSubmateria: boolean;
  materiaParent: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTotales: number | null;
  profesorId: number | null;
}

export interface ProgramacionMateria {
  materiaId: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTotales: number | null;
  docenteId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicoService {
  private apiUrl = `${environment.apiUrl}/academico`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  // ── Estudiante ──

  aulaVirtual(usuarioId: number, semestre: number): Observable<AulaVirtualRespuesta> {
    return this.http.get<AulaVirtualRespuesta>(
      `${this.apiUrl}/estudiante/${usuarioId}/aula-virtual?semestre=${semestre}`,
      { headers: this.getHeaders() }
    );
  }

  asistencias(usuarioId: number): Observable<AsistenciasRespuesta> {
    return this.http.get<AsistenciasRespuesta>(`${this.apiUrl}/estudiante/${usuarioId}/asistencias`, {
      headers: this.getHeaders()
    });
  }

  tareasPendientes(usuarioId: number): Observable<TareaPendiente[]> {
    return this.http.get<TareaPendiente[]>(`${this.apiUrl}/estudiante/${usuarioId}/tareas-pendientes`, {
      headers: this.getHeaders()
    });
  }

  // ── Administrador: programación académica ──

  materiasCurso(cursoId: number): Observable<{ id: number; materias: MateriaProgramable[] }> {
    return this.http.get<{ id: number; materias: MateriaProgramable[] }>(
      `${this.apiUrl}/cursos/${cursoId}/materias`,
      { headers: this.getHeaders() }
    );
  }

  guardarProgramacion(filas: ProgramacionMateria[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/programacion`, filas, { headers: this.getHeaders() });
  }
}
