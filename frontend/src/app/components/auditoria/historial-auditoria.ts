import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuditoriaService, FiltrosAuditoria, PaginaAuditoria, RegistroAuditoria } from '../../services/auditoria';
import { EstadoVacio } from '../../shared/estado-vacio/estado-vacio';

// Nombre legible de cada tabla auditada.
const NOMBRE_ENTIDAD: Record<string, string> = {
  NotaTarea: 'Nota de tarea',
  Supletorio: 'Supletorio',
  NotaDisciplina: 'Disciplina',
  ExamenGrado: 'Examen de grado',
  RegistroNotaGlobal: 'Nota (ingreso rápido)',
  RegistroExamenGlobal: 'Examen (ingreso rápido)',
  RegistroAsistenciaGlobal: 'Asistencia (ingreso rápido)',
  ConceptoPago: 'Concepto de pago',
  Deuda: 'Deuda',
  Comprobante: 'Pago / comprobante',
  Matricula: 'Matrícula',
  Usuario: 'Usuario',
  Curso: 'Curso',
  Materia: 'Materia'
};

const ACCIONES: Record<string, { texto: string; clase: string }> = {
  CREATE: { texto: 'Creó', clase: 'crear' },
  CREATEMANY: { texto: 'Creó varios', clase: 'crear' },
  UPDATE: { texto: 'Modificó', clase: 'editar' },
  UPDATEMANY: { texto: 'Modificó varios', clase: 'editar' },
  UPSERT: { texto: 'Guardó', clase: 'editar' },
  DELETE: { texto: 'Eliminó', clase: 'borrar' },
  DELETEMANY: { texto: 'Eliminó varios', clase: 'borrar' }
};

// Campos técnicos que cambian siempre y no aportan al leer un cambio.
const CAMPOS_IGNORADOS = new Set(['updatedAt', 'createdAt']);

interface Cambio {
  campo: string;
  antes: string;
  despues: string;
}

@Component({
  selector: 'app-historial-auditoria',
  imports: [FormsModule, DatePipe, JsonPipe, MatToolbarModule, MatButtonModule, MatIconModule, EstadoVacio],
  templateUrl: './historial-auditoria.html',
  styleUrl: './historial-auditoria.scss'
})
export class HistorialAuditoria implements OnInit {
  private auditoriaService = inject(AuditoriaService);
  private router = inject(Router);

  protected datos = signal<PaginaAuditoria | null>(null);
  protected cargando = signal(true);
  protected error = signal(false);
  protected abierto = signal<number | null>(null);

  protected filtros: FiltrosAuditoria = { entidad: '', accion: '', desde: '', hasta: '', pagina: 1 };
  protected readonly acciones = Object.entries(ACCIONES).map(([valor, a]) => ({ valor, texto: a.texto }));

  ngOnInit() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(false);
    this.auditoriaService.listar(this.filtros).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      }
    });
  }

  protected filtrar() {
    this.filtros.pagina = 1;
    this.cargar();
  }

  protected limpiarFiltros() {
    this.filtros = { entidad: '', accion: '', desde: '', hasta: '', pagina: 1 };
    this.cargar();
  }

  protected irAPagina(pagina: number) {
    this.filtros.pagina = pagina;
    this.abierto.set(null);
    this.cargar();
  }

  protected totalPaginas(d: PaginaAuditoria) {
    return Math.max(1, Math.ceil(d.total / d.porPagina));
  }

  protected alternar(id: number) {
    this.abierto.update((actual) => (actual === id ? null : id));
  }

  protected nombreEntidad(entidad: string) {
    return NOMBRE_ENTIDAD[entidad] ?? entidad;
  }

  protected accion(accion: string) {
    return ACCIONES[accion] ?? { texto: accion, clase: 'editar' };
  }

  // Diferencias campo a campo entre el valor anterior y el nuevo (solo para
  // operaciones sobre una fila; las masivas se muestran en crudo).
  protected cambios(r: RegistroAuditoria): Cambio[] | null {
    const unico = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && !('filas' in v);
    if (r.accion.endsWith('MANY')) return null;
    const antes = unico(r.antes) ? r.antes : {};
    const despues = unico(r.despues) ? r.despues : {};
    const campos = new Set([...Object.keys(antes), ...Object.keys(despues)]);
    const lista: Cambio[] = [];
    for (const campo of campos) {
      if (CAMPOS_IGNORADOS.has(campo)) continue;
      const a = JSON.stringify(antes[campo] ?? null);
      const d = JSON.stringify(despues[campo] ?? null);
      if (a !== d) lista.push({ campo, antes: this.legible(antes[campo]), despues: this.legible(despues[campo]) });
    }
    return lista;
  }

  private legible(v: any) {
    if (v === undefined || v === null) return '—';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  protected volver() {
    this.router.navigate(['/dashboard']);
  }
}
