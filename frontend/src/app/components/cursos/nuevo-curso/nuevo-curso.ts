import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { CursoService } from '../../../services/curso';
import { NotificacionService } from '../../../services/notificacion';
import { formularioValido } from '../../../shared/validacion';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-nuevo-curso',
  imports: [MatTooltipModule, FormsModule, MatToolbarModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, MatSnackBarModule],
  templateUrl: './nuevo-curso.html',
  styleUrl: './nuevo-curso.scss'
})
export class NuevoCurso implements OnInit {
  private notificacion = inject(NotificacionService);
  @ViewChild('formulario') formulario?: NgForm;

  loading = false;
  cursoId: number | null = null; // null = modo crear; con valor = modo editar

  datos = {
    ramaArtesanal: '',
    anioFormativo: '',
    fechaInicio: '',
    fechaFin: ''
  };

  constructor(
    private cursoService: CursoService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cursoId = Number(id);
      this.cargarCurso();
    }
  }

  private cargarCurso() {
    this.cursoService.obtenerCurso(this.cursoId!).subscribe({
      next: (curso) => {
        this.datos = {
          ramaArtesanal: curso.ramaArtesanal,
          anioFormativo: curso.anioFormativo,
          fechaInicio: this.formatearFecha(curso.fechaInicio),
          fechaFin: this.formatearFecha(curso.fechaFin)
        };
      },
      error: () => this.notificacion.error('Error al cargar el curso')
    });
  }

  // Convierte una fecha ISO a 'yyyy-MM-dd' para el input type="date"
  private formatearFecha(valor: string): string {
    if (!valor) return '';
    const f = new Date(valor);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  }

  guardar() {
    if (!formularioValido(this.formulario, this.notificacion)) return;
    this.loading = true;

    const peticion = this.cursoId
      ? this.cursoService.actualizarCurso(this.cursoId, this.datos)
      : this.cursoService.crearCurso(this.datos);

    peticion.subscribe({
      next: () => {
        this.notificacion.exito(
          this.cursoId ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente');
        this.router.navigate(['/cursos']);
      },
      error: () => {
        this.loading = false;
        this.notificacion.error(
          this.cursoId ? 'Error al actualizar curso' : 'Error al crear curso');
      }
    });
  }

  volver() {
    this.router.navigate(['/cursos']);
  }
}