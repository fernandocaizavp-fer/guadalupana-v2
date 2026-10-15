import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

export type EstadoDeuda = 'PENDIENTE' | 'PAGADA' | 'MORA';
export type EstadoComprobante = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'ANULADO';
export type MetodoPago = 'COMPROBANTE' | 'EFECTIVO' | 'TRANSFERENCIA';
export type MetodoManual = 'EFECTIVO' | 'TRANSFERENCIA';

export const NOMBRE_METODO: Record<MetodoPago, string> = {
  COMPROBANTE: 'comprobante',
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia'
};

export interface Comprobante {
  id: number;
  metodo: MetodoPago;
  urlImagen: string | null;
  montoAbonado: number;
  estado: EstadoComprobante;
  motivoRechazo: string | null;
  fechaSubida: string;
  deudaId: number;
}

export interface Deuda {
  id: number;
  concepto: string;
  montoTotal: number;
  saldo: number;
  fechaMaxima: string;
  estado: EstadoDeuda;
  comprobantes: Comprobante[];
}

export interface ResumenFinanzas {
  saldoPendiente: number;
  vencido: number;
  pagado: number;
  enRevision: number;
}

export interface EstadoCuenta extends ResumenFinanzas {
  deudas: Deuda[];
}

export interface ConceptoPago {
  id: number;
  nombre: string;
  monto: number;
  fechaMaxima: string;
  estudiantes: number;
  pagados: number;
}

export interface EstudianteFinanzas extends ResumenFinanzas {
  usuarioId: number;
  matriculaId: number;
  apellidos: string;
  nombres: string;
  cedula: string;
  fotoUrl: string | null;
  comprobantesPorRevisar: number;
}

export interface ComprobantePendiente extends Comprobante {
  deuda: {
    id: number;
    concepto: string;
    montoTotal: number;
    saldo: number;
    fechaMaxima: string;
    estado: EstadoDeuda;
    estudiante: {
      id: number;
      nombre: string;
      apellido: string;
      cedula: string | null;
      matricula: { curso: { id: number; ramaArtesanal: string } } | null;
    };
  };
}

// Estado que se muestra al usuario para un concepto: combina el estado de la
// deuda con el de su comprobante más reciente.
export type EstadoVisible = 'PAGADO' | 'REVISANDO' | 'RECHAZADO' | 'VENCIDO' | 'PENDIENTE';

export const ETIQUETA_ESTADO: Record<EstadoVisible, string> = {
  PAGADO: 'Pagado',
  REVISANDO: 'Revisando',
  RECHAZADO: 'Rechazado',
  VENCIDO: 'Vencido',
  PENDIENTE: 'Pendiente'
};

export function estadoVisible(deuda: Deuda): EstadoVisible {
  if (deuda.estado === 'PAGADA') return 'PAGADO';
  if (deuda.comprobantes.some((c) => c.estado === 'EN_REVISION')) return 'REVISANDO';
  if (deuda.estado === 'MORA') return 'VENCIDO';
  // `comprobantes` llega del más reciente al más antiguo.
  if (deuda.comprobantes[0]?.estado === 'RECHAZADO') return 'RECHAZADO';
  return 'PENDIENTE';
}

export function dinero(valor: number): string {
  return `$${(valor ?? 0).toFixed(2)}`;
}

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private apiUrl = `${environment.apiUrl}/finanzas`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  // ── Estudiante ──

  estadoCuenta(usuarioId: number): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.apiUrl}/estudiante/${usuarioId}`, {
      headers: this.getHeaders()
    });
  }

  // multipart: el navegador pone el Content-Type con su boundary, no se fija a mano.
  subirComprobante(deudaId: number, archivo: File): Observable<any> {
    const datos = new FormData();
    datos.append('deudaId', String(deudaId));
    datos.append('comprobante', archivo);
    return this.http.post(`${this.apiUrl}/comprobante`, datos, { headers: this.getHeaders() });
  }

  // ── Administrador ──

  listarConceptos(): Observable<ConceptoPago[]> {
    return this.http.get<ConceptoPago[]>(`${this.apiUrl}/admin/conceptos`, { headers: this.getHeaders() });
  }

  crearConcepto(datos: { nombre: string; monto: number; fechaMaxima: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/conceptos`, datos, { headers: this.getHeaders() });
  }

  eliminarConcepto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/conceptos/${id}`, { headers: this.getHeaders() });
  }

  contarPendientes(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/admin/pendientes/count`, { headers: this.getHeaders() });
  }

  comprobantesPendientes(): Observable<ComprobantePendiente[]> {
    return this.http.get<ComprobantePendiente[]>(`${this.apiUrl}/admin/comprobantes?estado=EN_REVISION`, {
      headers: this.getHeaders()
    });
  }

  estudiantesCurso(cursoId: number): Observable<EstudianteFinanzas[]> {
    return this.http.get<EstudianteFinanzas[]>(`${this.apiUrl}/admin/cursos/${cursoId}/estudiantes`, {
      headers: this.getHeaders()
    });
  }

  aprobarComprobante(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/comprobante/${id}/aprobar`, {}, { headers: this.getHeaders() });
  }

  rechazarComprobante(id: number, motivo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/comprobante/${id}/rechazar`, { motivo }, {
      headers: this.getHeaders()
    });
  }

  // Pago recibido fuera del sistema (efectivo o transferencia).
  registrarPago(deudaId: number, metodo: MetodoManual): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/deuda/${deudaId}/pago-manual`, { metodo }, {
      headers: this.getHeaders()
    });
  }

  // Corrige el método de un pago manual ya registrado.
  cambiarMetodo(comprobanteId: number, metodo: MetodoManual): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/comprobante/${comprobanteId}/metodo`, { metodo }, {
      headers: this.getHeaders()
    });
  }

  // Restablece un pago aprobado: el concepto vuelve a quedar pendiente.
  anularPago(comprobanteId: number, motivo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/comprobante/${comprobanteId}/anular`, { motivo }, {
      headers: this.getHeaders()
    });
  }
}
