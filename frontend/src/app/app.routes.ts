import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { NuevaMatricula } from './components/matriculas/nueva-matricula/nueva-matricula';
import { ListaCursos } from './components/cursos/lista-cursos/lista-cursos';
import { NuevoCurso } from './components/cursos/nuevo-curso/nuevo-curso';
import { DetalleCurso } from './components/cursos/detalle-curso/detalle-curso';
import { Landing } from './components/landing/landing';
import { NotasCurso } from './components/notas/notas-curso/notas-curso';
import { AuthGuard } from './guards/auth.guard';
import { DashboardProfesor } from './components/profesor/dashboard-profesor/dashboard-profesor';
import { DashboardEstudiante } from './components/estudiante/dashboard-estudiante/dashboard-estudiante';
import { GestionDocentes } from './components/usuarios/gestion-docentes/gestion-docentes';
import { GestionarTareas } from './components/tareas/gestionar-tareas/gestionar-tareas';
import { NotasTarea } from './components/tareas/notas-tarea/notas-tarea';
import { MatrizNotas } from './components/tareas/matriz-notas/matriz-notas';
import { DetalleMateria } from './components/estudiante/detalle-materia/detalle-materia';
import { IngresarSupletorios } from './components/supletorios/ingresar-supletorios/ingresar-supletorios';
import { SupletorioDocente } from './components/supletorios/supletorio-docente/supletorio-docente';
import { RegistrarAsistencia } from './components/asistencia/registrar-asistencia/registrar-asistencia';
import { Reportes } from './components/reportes/reportes/reportes';
import { GestionarAnuncios } from './components/anuncios/gestionar-anuncios/gestionar-anuncios';
import { SubmateriasMateria } from './components/estudiante/submaterias-materia/submaterias-materia';
import { IngresarDisciplina } from './components/disciplina/ingresar-disciplina/ingresar-disciplina';
import { Documentos } from './components/documentos/documentos/documentos';
import { IngresarExamenGrado } from './components/examen-grado/ingresar-examen-grado/ingresar-examen-grado';
import { CambiarPassword } from './components/cambiar-password/cambiar-password';
import { RecuperarPassword } from './components/recuperar-password/recuperar-password';
import { ConfiguracionComponent } from './components/configuracion/configuracion';
import { DetalleTarea } from './components/tareas/detalle-tarea/detalle-tarea';
import { DetalleTareaEstudiante } from './components/estudiante/detalle-tarea-estudiante/detalle-tarea-estudiante';



export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },
  { path: 'cursos', component: ListaCursos, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/nuevo', component: NuevoCurso, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/editar/:id', component: NuevoCurso, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/:id', component: DetalleCurso, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/:id/notas', component: NotasCurso, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'matriculas/nueva', component: NuevaMatricula, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'profesor', component: DashboardProfesor, canActivate: [AuthGuard], data: { roles: ['PROFESOR'] } },
  { path: 'estudiante', component: DashboardEstudiante, canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'tareas/:materiaId', component: GestionarTareas, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/notas/:tareaId', component: NotasTarea, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/matriz', component: MatrizNotas, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/detalle/:tareaId', component: DetalleTarea, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'docentes', component: GestionDocentes, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'estudiante/materia/:materiaId/:semestre', component: DetalleMateria, canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'estudiante/tarea/:materiaId/:tareaId/:semestre', component: DetalleTareaEstudiante, canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'supletorios/:cursoId', component: IngresarSupletorios, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'supletorios/materia/:materiaId', component: SupletorioDocente, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'asistencia/materia/:materiaId', component: RegistrarAsistencia, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'reportes', component: Reportes, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'anuncios', component: GestionarAnuncios, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'estudiante/submaterias/:materiaId/:semestre', component: SubmateriasMateria, canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'disciplina/materia/:materiaId', component: IngresarDisciplina, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'documentos', component: Documentos, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'examen-grado/:materiaId', component: IngresarExamenGrado, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'configuracion', component: ConfiguracionComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cambiar-password', component: CambiarPassword, canActivate: [AuthGuard] },
  { path: 'recuperar-password', component: RecuperarPassword },
  
];