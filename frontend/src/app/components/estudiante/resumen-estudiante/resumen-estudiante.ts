import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, catchError } from 'rxjs';
import { AcademicoService, AsistenciasRespuesta, TareaPendiente } from '../../../services/academico';
import { TarjetaKpi, TonoKpi } from '../../../shared/graficos/tarjeta-kpi';

const UMBRAL_ASISTENCIA_OK = 85;
const UMBRAL_ASISTENCIA_ALERTA = 70;

// Indicadores del panel del estudiante: asistencia (semáforo), tareas pendientes,
// próxima entrega. El indicador de pagos se quitó mientras las finanzas del
// estudiante están desactivadas (ver dashboard-estudiante). No se muestra un "promedio" porque el cálculo oficial
// de notas vive en los reportes AL y aquí podría no coincidir.
@Component({
  selector: 'app-resumen-estudiante',
  imports: [TarjetaKpi],
  template: `
    <div class="kpis">
      <app-tarjeta-kpi icono="fact_check" titulo="Asistencia" [valor]="textoAsistencia()"
                       [tono]="tonoAsistencia()" [detalle]="detalleAsistencia()"
                       [navegable]="true" (clic)="ir('/estudiante/asistencias')" />
      <app-tarjeta-kpi icono="assignment" titulo="Tareas pendientes" [valor]="tareas().length"
                       [tono]="tareas().length > 0 ? 'ambar' : 'verde'"
                       [detalle]="tareas().length > 0 ? 'Por entregar' : 'Estás al día'" />
      <app-tarjeta-kpi icono="event" titulo="Próxima entrega" [valor]="proximaFecha()"
                       tono="dorado" [detalle]="proximaTarea()" />
    </div>
  `,
  styles: [`
    :host { display: block; margin-bottom: 24px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 760px) { .kpis { grid-template-columns: 1fr; } }
  `]
})
export class ResumenEstudiante implements OnInit {
  private academicoService = inject(AcademicoService);
  private router = inject(Router);

  usuarioId = input.required<number>();
  tareas = input<TareaPendiente[]>([]);

  private asistencia = signal<AsistenciasRespuesta | null>(null);

  ngOnInit() {
    this.academicoService.asistencias(this.usuarioId())
      .pipe(catchError(() => of(null)))
      .subscribe((asistencia) => this.asistencia.set(asistencia));
  }

  private porcentaje = computed(() => this.asistencia()?.resumen.porcentaje ?? null);

  protected textoAsistencia = computed(() => {
    const p = this.porcentaje();
    return p === null ? '—' : `${Math.round(p)}%`;
  });

  protected tonoAsistencia = computed<TonoKpi>(() => {
    const p = this.porcentaje();
    if (p === null) return 'azul';
    if (p >= UMBRAL_ASISTENCIA_OK) return 'verde';
    return p >= UMBRAL_ASISTENCIA_ALERTA ? 'ambar' : 'rojo';
  });

  protected detalleAsistencia = computed(() => {
    const r = this.asistencia()?.resumen;
    if (!r || r.clases === 0) return 'Sin registros todavía';
    return `${r.faltas} ${r.faltas === 1 ? 'falta' : 'faltas'} de ${r.clases} clases`;
  });

  private proxima = computed(() =>
    [...this.tareas()].sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))[0] ?? null
  );

  protected proximaFecha = computed(() => {
    const t = this.proxima();
    return t ? new Date(t.fechaLimite).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : '—';
  });

  protected proximaTarea = computed(() => {
    const t = this.proxima();
    return t ? `${t.titulo} · ${t.materia}` : 'No tienes entregas próximas';
  });

  protected ir(ruta: string) {
    this.router.navigate([ruta]);
  }
}
