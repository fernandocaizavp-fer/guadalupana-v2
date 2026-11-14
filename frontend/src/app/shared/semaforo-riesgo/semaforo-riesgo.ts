import { Component, OnInit, input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { AcademicoService, RiesgoAcademico } from '../../services/academico';

@Component({
  selector: 'app-semaforo-riesgo',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule],
  templateUrl: './semaforo-riesgo.html',
  styleUrls: ['./semaforo-riesgo.scss']
})
export class SemaforoRiesgoComponent implements OnInit {
  private academicoService = inject(AcademicoService);

  usuarioId = input<number | undefined>();
  datosDirectos = input<RiesgoAcademico | null>(null);
  modoCompacto = input<boolean>(false);

  cargando = signal(false);
  riesgo = signal<RiesgoAcademico | null>(null);
  mostrarDetalle = signal(false);

  ngOnInit() {
    if (this.datosDirectos()) {
      this.riesgo.set(this.datosDirectos());
      return;
    }

    const uid = this.usuarioId();
    if (uid) {
      this.cargando.set(true);
      this.academicoService.riesgoEstudiante(uid).subscribe({
        next: (data) => {
          this.riesgo.set(data);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        }
      });
    }
  }

  toggleDetalle() {
    this.mostrarDetalle.update((v) => !v);
  }

  claseSemaforo = computed(() => {
    const r = this.riesgo();
    if (!r || r.nivel === 'PENDIENTE') return 'semaforo-pendiente';
    if (r.nivel === 'ROJO') return 'semaforo-rojo';
    if (r.nivel === 'AMARILLO') return 'semaforo-amarillo';
    return 'semaforo-verde';
  });

  iconoNivel = computed(() => {
    const r = this.riesgo();
    if (!r || r.nivel === 'PENDIENTE') return 'help_outline';
    if (r.nivel === 'ROJO') return 'warning';
    if (r.nivel === 'AMARILLO') return 'report_problem';
    return 'check_circle';
  });

  etiquetaNivel = computed(() => {
    const r = this.riesgo();
    if (!r || r.nivel === 'PENDIENTE') return 'Sin registros';
    if (r.nivel === 'ROJO') return 'Riesgo Crítico';
    if (r.nivel === 'AMARILLO') return 'En Observación';
    return 'Rendimiento Óptimo';
  });
}
