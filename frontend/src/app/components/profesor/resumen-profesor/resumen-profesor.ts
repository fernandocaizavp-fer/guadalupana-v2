import { Component, OnInit, inject, signal } from '@angular/core';
import { DashboardService, ResumenProfesor } from '../../../services/dashboard';
import { TarjetaKpi } from '../../../shared/graficos/tarjeta-kpi';

// Indicadores del panel del docente. Si la consulta falla no se muestra nada:
// el panel sigue funcionando con la lista de cursos.
@Component({
  selector: 'app-resumen-profesor',
  imports: [TarjetaKpi],
  template: `
    @if (resumen(); as r) {
      <div class="kpis">
        <app-tarjeta-kpi icono="menu_book" titulo="Mis materias" [valor]="r.materias"
                         [detalle]="r.cursos + (r.cursos === 1 ? ' curso' : ' cursos')" />
        <app-tarjeta-kpi icono="groups" titulo="Estudiantes" [valor]="r.estudiantes" tono="dorado"
                         detalle="Con matrícula activa" />
        <app-tarjeta-kpi icono="assignment_late" titulo="Por calificar" [valor]="r.porCalificar"
                         [tono]="r.porCalificar > 0 ? 'ambar' : 'verde'"
                         [detalle]="r.porCalificar > 0 ? 'Entregas sin nota' : 'Todo calificado'" />
        <app-tarjeta-kpi icono="fact_check" titulo="Asistencia" [valor]="r.asistenciasSemana" tono="verde"
                         detalle="Registros esta semana" />
      </div>
    } @else if (cargando()) {
      <div class="kpis" aria-hidden="true">
        @for (i of [1, 2, 3, 4]; track i) { <div class="esqueleto"></div> }
      </div>
    }
  `,
  styles: [`
    :host { display: block; margin-bottom: 24px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .esqueleto {
      height: 82px;
      border-radius: 14px;
      background: linear-gradient(90deg, #f1f3f8 25%, #fafbfd 50%, #f1f3f8 75%);
      background-size: 200% 100%;
      animation: brillo 1.3s linear infinite;
    }
    @keyframes brillo { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (max-width: 1024px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `]
})
export class ResumenProfesorComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  protected resumen = signal<ResumenProfesor | null>(null);
  protected cargando = signal(true);

  ngOnInit() {
    this.dashboardService.obtenerResumenProfesor().subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }
}
