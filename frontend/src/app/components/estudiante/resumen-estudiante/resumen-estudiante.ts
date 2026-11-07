import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AcademicoService, AsistenciasRespuesta, TareaPendiente } from '../../../services/academico';
import { FinanzasService, EstadoCuenta } from '../../../services/finanzas';
import { TarjetaKpi, TonoKpi } from '../../../shared/graficos/tarjeta-kpi';

const UMBRAL_ASISTENCIA_OK = 85;
const UMBRAL_ASISTENCIA_ALERTA = 70;

// Indicadores del panel del estudiante: asistencia (semáforo), tareas pendientes,
// próxima entrega y pagos. No se muestra un "promedio" porque el cálculo oficial
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
      <app-tarjeta-kpi icono="payments" titulo="Pagos pendientes" [valor]="textoSaldo()"
                       [tono]="tonoPagos()" [detalle]="detallePagos()"
                       [navegable]="true" (clic)="ir('/estudiante/finanzas')" />
    </div>
  `,
  styles: [`
    :host { display: block; margin-bottom: 24px; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `]
})
export class ResumenEstudiante implements OnInit {
  private academicoService = inject(AcademicoService);
  private finanzasService = inject(FinanzasService);
  private router = inject(Router);

  usuarioId = input.required<number>();
  tareas = input<TareaPendiente[]>([]);

  private asistencia = signal<AsistenciasRespuesta | null>(null);
  private cuenta = signal<EstadoCuenta | null>(null);

  ngOnInit() {
    forkJoin({
      asistencia: this.academicoService.asistencias(this.usuarioId()).pipe(catchError(() => of(null))),
      cuenta: this.finanzasService.estadoCuenta(this.usuarioId()).pipe(catchError(() => of(null)))
    }).subscribe(({ asistencia, cuenta }) => {
      this.asistencia.set(asistencia);
      this.cuenta.set(cuenta);
    });
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

  protected textoSaldo = computed(() => {
    const c = this.cuenta();
    return c ? `$${c.saldoPendiente.toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : '—';
  });

  protected tonoPagos = computed<TonoKpi>(() => {
    const c = this.cuenta();
    if (!c || c.saldoPendiente === 0) return 'verde';
    return c.vencido > 0 ? 'rojo' : 'ambar';
  });

  protected detallePagos = computed(() => {
    const c = this.cuenta();
    if (!c) return '';
    if (c.saldoPendiente === 0) return 'Estás al día';
    return c.vencido > 0
      ? `$${c.vencido.toLocaleString('es-EC', { minimumFractionDigits: 2 })} vencidos`
      : 'Dentro del plazo';
  });

  protected ir(ruta: string) {
    this.router.navigate([ruta]);
  }
}
