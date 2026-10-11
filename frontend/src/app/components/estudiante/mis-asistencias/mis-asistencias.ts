import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth';
import { AcademicoService, AsistenciaMateria, AsistenciasRespuesta } from '../../../services/academico';
import { LoadingService } from '../../../services/loading';

@Component({
  selector: 'app-mis-asistencias',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './mis-asistencias.html',
  styleUrl: './mis-asistencias.scss'
})
export class MisAsistencias implements OnInit {
  usuario: any;
  cargado = false;
  error = '';
  resumen: AsistenciasRespuesta['resumen'] | null = null;
  materias: AsistenciaMateria[] = [];
  // Materia cuyas fechas de falta están desplegadas.
  abierta: number | null = null;

  constructor(
    private authService: AuthService,
    private academicoService: AcademicoService,
    private loadingService: LoadingService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loadingService.mostrar();
    this.academicoService.asistencias(this.usuario.id)
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: (res) => {
          this.resumen = res.resumen;
          this.materias = res.materias;
          this.error = '';
          this.cargado = true;
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.error = e?.error?.error || 'No se pudieron cargar las asistencias';
          this.cargado = true;
          this.cdr.detectChanges();
        }
      });
  }

  alternar(materia: AsistenciaMateria) {
    if (materia.faltas === 0) return;
    this.abierta = this.abierta === materia.id ? null : materia.id;
  }

  volver() {
    this.router.navigate(['/estudiante']);
  }
}
