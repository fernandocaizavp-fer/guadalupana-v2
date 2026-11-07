import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardService, ResumenDashboard } from '../../../services/dashboard';
import { Contador } from '../../../shared/graficos/contador';
import { GraficoBarras } from '../../../shared/graficos/grafico-barras';
import { GraficoDona } from '../../../shared/graficos/grafico-dona';
import { EstadoVacio } from '../../../shared/estado-vacio/estado-vacio';

interface Kpi {
  clave: keyof ResumenDashboard['kpis'];
  titulo: string;
  icono: string;
  ruta: string;
  moneda?: boolean;
  tono: 'azul' | 'dorado' | 'verde' | 'rojo';
  detalle?: (k: ResumenDashboard['kpis']) => string;
}

// Indicadores y gráficos del panel del administrador. Vive en su propio
// componente para no cargar la hoja de estilos del menú de tarjetas.
@Component({
  selector: 'app-panel-resumen',
  imports: [MatIconModule, Contador, GraficoBarras, GraficoDona, EstadoVacio],
  templateUrl: './panel-resumen.html',
  styleUrl: './panel-resumen.scss'
})
export class PanelResumen implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  protected resumen = signal<ResumenDashboard | null>(null);
  protected error = signal(false);

  protected readonly kpis: Kpi[] = [
    { clave: 'estudiantes', titulo: 'Estudiantes activos', icono: 'groups', ruta: '/cursos', tono: 'azul',
      detalle: (k) => `${k.cursos} cursos activos` },
    { clave: 'docentes', titulo: 'Docentes', icono: 'co_present', ruta: '/docentes', tono: 'dorado' },
    { clave: 'recaudado', titulo: 'Total recaudado', icono: 'payments', ruta: '/finanzas', moneda: true, tono: 'verde',
      detalle: (k) => `$${k.porCobrar.toLocaleString('es-EC', { minimumFractionDigits: 2 })} por cobrar` },
    { clave: 'deudasEnMora', titulo: 'Deudas en mora', icono: 'warning_amber', ruta: '/finanzas', tono: 'rojo',
      detalle: (k) => `$${k.montoEnMora.toLocaleString('es-EC', { minimumFractionDigits: 2 })} vencidos` }
  ];

  ngOnInit() {
    this.cargar();
  }

  protected cargar() {
    this.error.set(false);
    this.resumen.set(null);
    this.dashboardService.obtenerResumen().subscribe({
      next: (r) => this.resumen.set(r),
      error: () => this.error.set(true)
    });
  }

  protected ir(ruta: string) {
    this.router.navigate([ruta]);
  }

  protected recaudacion(r: ResumenDashboard) {
    return r.recaudacionMensual.map((m) => ({ etiqueta: m.etiqueta, valor: m.total }));
  }

  protected sinRecaudacion(r: ResumenDashboard) {
    return r.recaudacionMensual.every((m) => m.total === 0);
  }

  protected sinCartera(r: ResumenDashboard) {
    return r.estadoCartera.every((p) => p.valor === 0);
  }
}
