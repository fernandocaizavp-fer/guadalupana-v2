import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth';
import { AcademicoService, MateriaAula } from '../../../services/academico';
import { LoadingService } from '../../../services/loading';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CLAVE_SEMESTRE = 'aulaVirtualSemestre';

@Component({
  selector: 'app-aula-virtual',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatSnackBarModule, FotoPerfil],
  templateUrl: './aula-virtual.html',
  styleUrl: './aula-virtual.scss'
})
export class AulaVirtual implements OnInit {
  usuario: any;
  cargado = false;
  error = '';
  curso: { ramaArtesanal: string; anioFormativo: string } | null = null;
  materias: MateriaAula[] = [];
  disciplina: number | null = null;
  // Se recuerda el semestre elegido para que al volver de una materia no se pierda.
  semestre = sessionStorage.getItem(CLAVE_SEMESTRE) === '2' ? 2 : 1;

  constructor(
    private authService: AuthService,
    private academicoService: AcademicoService,
    private loadingService: LoadingService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loadingService.mostrar();
    this.academicoService.aulaVirtual(this.usuario.id, this.semestre)
      .pipe(finalize(() => this.loadingService.ocultar()))
      .subscribe({
        next: (res) => {
          this.curso = res.curso;
          this.materias = res.materias;
          this.disciplina = res.disciplina;
          this.error = '';
          this.cargado = true;
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.error = e?.error?.error || 'No se pudo cargar el aula virtual';
          this.cargado = true;
          this.cdr.detectChanges();
        }
      });
  }

  cambiarSemestre(semestre: number) {
    if (semestre === this.semestre) return;
    this.semestre = semestre;
    sessionStorage.setItem(CLAVE_SEMESTRE, String(semestre));
    this.cargar();
  }

  // Práctica y Teoría agrupan submaterias: primero se elige la submateria y de
  // ahí se entra a sus tareas. Una materia normal abre sus tareas directamente.
  abrirMateria(materia: MateriaAula) {
    const destino = materia.tieneSubmaterias ? '/estudiante/submaterias' : '/estudiante/materia';
    this.router.navigate([destino, materia.id, this.semestre]);
  }

  nombreDocente(materia: MateriaAula): string {
    if (!materia.docente) return 'Docente por asignar';
    return `${materia.docente.nombre} ${materia.docente.apellido}`;
  }

  // ISO → '20-Oct'. Se arma a mano para tener los meses en español sin depender
  // del locale de DatePipe; se lee en UTC porque la fecha se guardó sin hora.
  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    const fecha = new Date(iso);
    return `${String(fecha.getUTCDate()).padStart(2, '0')}-${MESES[fecha.getUTCMonth()]}`;
  }

  notaDisciplina(): string {
    if (this.disciplina === null) return '—';
    return this.disciplina % 1 === 0 ? String(this.disciplina) : this.disciplina.toFixed(1);
  }

  volver() {
    this.router.navigate(['/estudiante']);
  }
}
