import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { formularioValido } from '../../../shared/validacion';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { UsuarioService } from '../../../services/usuario';
import { CursoService } from '../../../services/curso';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';
import { DialogService } from '../../../services/dialog';
import { NotificacionService } from '../../../services/notificacion';
import { EstadoVacio } from '../../../shared/estado-vacio/estado-vacio';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-gestion-docentes',
  imports: [MatTooltipModule, EstadoVacio, FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatTableModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatSelectModule, MatDividerModule, FotoPerfil],
  templateUrl: './gestion-docentes.html',
  styleUrl: './gestion-docentes.scss'
})
export class GestionDocentes implements OnInit {
  private dialogService = inject(DialogService);
  private notificacion = inject(NotificacionService);

  docentes: any[] = [];
  cursos: any[] = [];
  loading = true;
  guardando = false;
  editando: any = null;
  columnas = ['nombre', 'apellido', 'correo', 'cedula', 'acciones'];

  nuevoDocente = { nombre: '', apellido: '', correo: '', cedula: '' };

  // Materias normales
  asignacion = { cursoId: '', materiaId: '', profesorId: '' };
  materiasCurso: any[] = [];

  // Submaterias
  asignacionSub = { cursoId: '', submateriaNombre: '', profesorId: '' };
  submateriasCurso: any[] = [];

  // Profesor principal
  asignacionPrincipal = { cursoId: '', profesorId: '' };
  cursosConMaterias: any[] = [];

  constructor(
    private usuarioService: UsuarioService,
    private cursoService: CursoService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDocentes();
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => { this.cursos = cursos; this.cdr.detectChanges(); }
    });
  }

  cargarDocentes() {
    this.loading = true;
    this.usuarioService.listarDocentes().subscribe({
      next: (docentes) => {
        this.docentes = docentes;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => {
        // Para cada curso cargamos sus materias
        let pendientes = cursos.length;
        this.cursosConMaterias = [];
        if (cursos.length === 0) return;
        cursos.forEach(curso => {
          this.cursoService.obtenerCurso(curso.id).subscribe({
            next: (c) => {
              this.cursosConMaterias.push(c);
              pendientes--;
              if (pendientes === 0) this.cdr.detectChanges();
            }
          });
        });
      }
    });
  }

  @ViewChild('formulario') formulario?: NgForm;

  crearDocente() {
    if (!formularioValido(this.formulario, this.notificacion)) return;
    this.guardando = true;
    this.cdr.detectChanges();

    const request = this.editando
      ? this.usuarioService.actualizarDocente(this.editando.id, this.nuevoDocente)
      : this.usuarioService.crearDocente(this.nuevoDocente);

    request.subscribe({
      next: () => {
        this.notificacion.exito(this.editando ? 'Docente actualizado' : 'Docente creado');
        this.nuevoDocente = { nombre: '', apellido: '', correo: '', cedula: '' };
        this.formulario?.control.markAsUntouched();
        this.editando = null;
        this.guardando = false;
        this.cargarDocentes();
      },
      error: (err) => {
        this.guardando = false;
        this.notificacion.error(err.error?.error || 'Error al guardar');
        this.cdr.detectChanges();
      }
    });
  }

  editarDocente(docente: any) {
    this.editando = docente;
    this.nuevoDocente = {
      nombre: docente.nombre,
      apellido: docente.apellido,
      correo: docente.correo,
      cedula: docente.cedula || ''
    };
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.editando = null;
    this.nuevoDocente = { nombre: '', apellido: '', correo: '', cedula: '' };
    this.formulario?.control.markAsUntouched();
    this.cdr.detectChanges();
  }

getMateriasDocente(docente: any): any[] {
  const resultado: any[] = [];
  const submateriasPorCurso: { [cursoId: number]: { cursoNombre: string; subs: string[]; ids: number[] } } = {};

  this.cursosConMaterias.forEach(curso => {
    const esPrincipal = (curso.materias || []).some((m: any) =>
      m.profesorPrincipalId === docente.id
    );

    if (esPrincipal) {
      resultado.push({
        tipo: 'principal',
        id: `principal-${curso.id}`,
        cursoId: curso.id,
        cursoNombre: curso.ramaArtesanal
      });
    }

    // Materias normales
    (curso.materias || []).forEach((m: any) => {
      if (m.profesorId !== docente.id) return;
      if (m.esSubmateria) return;
      if (m.nombre === 'Práctica' || m.nombre === 'Teoría') return;
      resultado.push({
        tipo: 'normal',
        id: m.id,
        nombre: m.nombre,
        cursoNombre: curso.ramaArtesanal
      });
    });

    // Submaterias agrupadas por curso
    (curso.materias || []).forEach((m: any) => {
      if (!m.esSubmateria || m.profesorId !== docente.id) return;
      if (!submateriasPorCurso[curso.id]) {
        submateriasPorCurso[curso.id] = { cursoNombre: curso.ramaArtesanal, subs: [], ids: [] };
      }
      if (!submateriasPorCurso[curso.id].subs.includes(m.nombre)) {
        submateriasPorCurso[curso.id].subs.push(m.nombre);
      }
      submateriasPorCurso[curso.id].ids.push(m.id);
    });
  });

  // Agregar grupos de submaterias
  Object.entries(submateriasPorCurso).forEach(([cursoId, grupo]) => {
    resultado.push({
      tipo: 'submateria-grupo',
      id: `sub-grupo-${cursoId}`,
      cursoNombre: grupo.cursoNombre,
      subs: grupo.subs,
      ids: grupo.ids
    });
  });

  return resultado;
}

// ── Quitar asignaciones (libera la materia para reasignarla) ──

async quitarMateria(item: any) {
  const ok = await this.dialogService.confirm({
    titulo: 'Quitar materia',
    mensaje: `¿Quitar "${item.nombre}" (${item.cursoNombre}) de este docente?`,
    confirmText: 'Sí, quitar',
    peligro: true
  });
  if (!ok) return;
  this.usuarioService.desasignarProfesor(item.id).subscribe({
    next: () => {
      this.notificacion.exito('Materia liberada');
      this.cargarDocentes();
    },
    error: () => this.notificacion.error('Error al quitar la materia')
  });
}

async quitarSubmateriaGrupo(item: any) {
  const ok = await this.dialogService.confirm({
    titulo: 'Quitar submaterias',
    mensaje: `¿Quitar las submaterias de "${item.cursoNombre}" de este docente?`,
    confirmText: 'Sí, quitar',
    peligro: true
  });
  if (!ok) return;
  const ids: number[] = item.ids || [];
  let completados = 0;
  let huboError = false;
  ids.forEach((id) => this.usuarioService.desasignarProfesor(id).subscribe({
    next: () => {
      completados++;
      if (completados === ids.length) {
        this.notificacion.exito('Submaterias liberadas');
        this.cargarDocentes();
      }
    },
    error: () => {
      if (!huboError) {
        huboError = true;
        this.notificacion.error('Error al quitar las submaterias');
      }
    }
  }));
}

async quitarPrincipal(item: any) {
  const ok = await this.dialogService.confirm({
    titulo: 'Quitar docente principal',
    mensaje: `¿Quitar el rol de docente principal de "${item.cursoNombre}"?`,
    confirmText: 'Sí, quitar',
    peligro: true
  });
  if (!ok) return;
  this.usuarioService.desasignarProfesorPrincipal(item.cursoId).subscribe({
    next: () => {
      this.notificacion.exito('Rol de docente principal quitado');
      this.cargarDocentes();
    },
    error: () => this.notificacion.error('Error al quitar el rol principal')
  });
}

  async eliminarDocente(id: number) {
    const ok = await this.dialogService.confirm({
      titulo: 'Eliminar docente',
      mensaje: '¿Eliminar este docente?',
      peligro: true
    });
    if (!ok) return;
    this.usuarioService.eliminarDocente(id).subscribe({
      next: () => {
        this.notificacion.exito('Docente eliminado correctamente');
        this.cargarDocentes();
      },
      error: () => this.notificacion.error('Error al eliminar el docente')
    });
  }

  // MATERIAS NORMALES
onCursoChange() {
  this.asignacion.materiaId = '';
  this.materiasCurso = [];
  if (this.asignacion.cursoId) {
    this.cursoService.obtenerCurso(Number(this.asignacion.cursoId)).subscribe({
      next: (curso) => {
        this.materiasCurso = (curso.materias || []).filter((m: any) =>
          !m.esSubmateria &&
          m.nombre !== 'Práctica' &&
          m.nombre !== 'Teoría' &&
          m.nombre !== 'Disciplina' &&
          !m.profesorId  // ← esta línea es la que faltaba
        );
        this.cdr.detectChanges();
      }
    });
  }
}

  asignarProfesor() {
    if (!this.asignacion.cursoId || !this.asignacion.materiaId || !this.asignacion.profesorId) {
      this.notificacion.info('Selecciona curso, materia y docente');
      return;
    }
    this.usuarioService.asignarProfesor(
      Number(this.asignacion.materiaId),
      Number(this.asignacion.profesorId)
    ).subscribe({
      next: () => {
        this.notificacion.exito('Profesor asignado exitosamente');
        this.asignacion = { cursoId: '', materiaId: '', profesorId: '' };
        this.materiasCurso = [];
        this.cdr.detectChanges();
      },
      error: () => this.notificacion.error('Error al asignar')
    });
  }

  // SUBMATERIAS
onCursoSubChange() {
  this.asignacionSub.submateriaNombre = '';
  this.submateriasCurso = [];
  if (this.asignacionSub.cursoId) {
    this.cursoService.obtenerCurso(Number(this.asignacionSub.cursoId)).subscribe({
      next: (curso) => {
        const todasSubmaterias = (curso.materias || []).filter((m: any) => m.esSubmateria);

        const vistas = new Set<string>();
        this.submateriasCurso = todasSubmaterias.filter((m: any) => {
          if (vistas.has(m.nombre)) return false;

          // Verificar que ninguna de las gemelas (mismo nombre) tenga profesor
          const gemelas = todasSubmaterias.filter((g: any) => g.nombre === m.nombre);
          const algunaTieneProfesor = gemelas.some((g: any) => g.profesorId);
          if (algunaTieneProfesor) return false;

          vistas.add(m.nombre);
          return true;
        });
        this.cdr.detectChanges();
      }
    });
  }
}

  asignarProfesorSubmateria() {
    if (!this.asignacionSub.cursoId || !this.asignacionSub.submateriaNombre || !this.asignacionSub.profesorId) {
      this.notificacion.info('Selecciona curso, submateria y docente');
      return;
    }
    this.cursoService.obtenerCurso(Number(this.asignacionSub.cursoId)).subscribe({
      next: (curso) => {
        const gemelas = curso.materias.filter((m: any) =>
          m.esSubmateria && m.nombre === this.asignacionSub.submateriaNombre
        );
        let completados = 0;
        gemelas.forEach((m: any) => {
          this.usuarioService.asignarProfesor(m.id, Number(this.asignacionSub.profesorId)).subscribe({
            next: () => {
              completados++;
              if (completados === gemelas.length) {
                this.notificacion.exito('Profesor asignado a Práctica y Teoría');
                this.asignacionSub = { cursoId: '', submateriaNombre: '', profesorId: '' };
                this.submateriasCurso = [];
                this.cdr.detectChanges();
              }
            },
            error: () => this.notificacion.error('Error al asignar')
          });
        });
      }
    });
  }

  // PROFESOR PRINCIPAL
  asignarProfesorPrincipal() {
    if (!this.asignacionPrincipal.cursoId || !this.asignacionPrincipal.profesorId) {
      this.notificacion.info('Selecciona curso y docente');
      return;
    }
    this.cursoService.obtenerCurso(Number(this.asignacionPrincipal.cursoId)).subscribe({
      next: (curso) => {
        const materiasPT = curso.materias.filter((m: any) =>
          m.nombre === 'Práctica' || m.nombre === 'Teoría'
        );
        let completados = 0;
        materiasPT.forEach((m: any) => {
          this.usuarioService.asignarProfesorPrincipalMateria(
            m.id, Number(this.asignacionPrincipal.profesorId)
          ).subscribe({
            next: () => {
              completados++;
              if (completados === materiasPT.length) {
                this.notificacion.exito('Profesor principal asignado');
                this.asignacionPrincipal = { cursoId: '', profesorId: '' };
                this.cdr.detectChanges();
              }
            },
            error: () => this.notificacion.error('Error al asignar')
          });
        });
      }
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}