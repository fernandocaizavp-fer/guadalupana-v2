import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Landing } from './components/landing/landing';
import { AuthGuard } from './guards/auth.guard';
import { cambiosSinGuardarGuard } from './shared/cambios-sin-guardar';

// Carga diferida (lazy loading): cada pantalla se descarga solo cuando se visita.
// Landing y Login quedan en el paquete inicial porque son las puertas de entrada.
export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard), canActivate: [AuthGuard] },
  { path: 'cursos', loadComponent: () => import('./components/cursos/lista-cursos/lista-cursos').then(m => m.ListaCursos), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/nuevo', loadComponent: () => import('./components/cursos/nuevo-curso/nuevo-curso').then(m => m.NuevoCurso), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/editar/:id', loadComponent: () => import('./components/cursos/nuevo-curso/nuevo-curso').then(m => m.NuevoCurso), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/:id', loadComponent: () => import('./components/cursos/detalle-curso/detalle-curso').then(m => m.DetalleCurso), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cursos/:id/notas', loadComponent: () => import('./components/notas/notas-curso/notas-curso').then(m => m.NotasCurso), canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'matriculas/nueva', loadComponent: () => import('./components/matriculas/nueva-matricula/nueva-matricula').then(m => m.NuevaMatricula), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'profesor', loadComponent: () => import('./components/profesor/dashboard-profesor/dashboard-profesor').then(m => m.DashboardProfesor), canActivate: [AuthGuard], data: { roles: ['PROFESOR'] } },
  { path: 'estudiante', loadComponent: () => import('./components/estudiante/dashboard-estudiante/dashboard-estudiante').then(m => m.DashboardEstudiante), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'tareas/:materiaId', loadComponent: () => import('./components/tareas/gestionar-tareas/gestionar-tareas').then(m => m.GestionarTareas), canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/notas/:tareaId', loadComponent: () => import('./components/tareas/notas-tarea/notas-tarea').then(m => m.NotasTarea), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/matriz', loadComponent: () => import('./components/tareas/matriz-notas/matriz-notas').then(m => m.MatrizNotas), canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'tareas/:materiaId/detalle/:tareaId', loadComponent: () => import('./components/tareas/detalle-tarea/detalle-tarea').then(m => m.DetalleTarea), canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'docentes', loadComponent: () => import('./components/usuarios/gestion-docentes/gestion-docentes').then(m => m.GestionDocentes), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'estudiante/materia/:materiaId/:semestre', loadComponent: () => import('./components/estudiante/detalle-materia/detalle-materia').then(m => m.DetalleMateria), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'estudiante/tarea/:materiaId/:tareaId/:semestre', loadComponent: () => import('./components/estudiante/detalle-tarea-estudiante/detalle-tarea-estudiante').then(m => m.DetalleTareaEstudiante), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'estudiante/aula-virtual', loadComponent: () => import('./components/estudiante/aula-virtual/aula-virtual').then(m => m.AulaVirtual), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'estudiante/finanzas', loadComponent: () => import('./components/estudiante/mis-finanzas/mis-finanzas').then(m => m.MisFinanzas), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'estudiante/asistencias', loadComponent: () => import('./components/estudiante/mis-asistencias/mis-asistencias').then(m => m.MisAsistencias), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'finanzas', loadComponent: () => import('./components/finanzas/gestionar-finanzas/gestionar-finanzas').then(m => m.GestionarFinanzas), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  // Gestión del Portal Web: lo que ve el público en la landing (solo ADMIN).
  // Se entra desde las cuatro tarjetas del panel; no hay vista intermedia.
  { path: 'portal-web/prospectos', loadComponent: () => import('./components/portal/prospectos/prospectos').then(m => m.Prospectos), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'portal-web/anuncios', loadComponent: () => import('./components/portal/anuncios-publicos/anuncios-publicos').then(m => m.AnunciosPublicos), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'portal-web/galeria', loadComponent: () => import('./components/portal/galeria-publica/galeria-publica').then(m => m.GaleriaPublica), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'portal-web/calendario', loadComponent: () => import('./components/portal/calendario-publico/calendario-publico').then(m => m.CalendarioPublico), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'supletorios/:cursoId', loadComponent: () => import('./components/supletorios/ingresar-supletorios/ingresar-supletorios').then(m => m.IngresarSupletorios), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN'] } },
  { path: 'supletorios/materia/:materiaId', loadComponent: () => import('./components/supletorios/supletorio-docente/supletorio-docente').then(m => m.SupletorioDocente), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'asistencia/materia/:materiaId', loadComponent: () => import('./components/asistencia/registrar-asistencia/registrar-asistencia').then(m => m.RegistrarAsistencia), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'reportes', loadComponent: () => import('./components/reportes/reportes/reportes').then(m => m.Reportes), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'anuncios', loadComponent: () => import('./components/anuncios/gestionar-anuncios/gestionar-anuncios').then(m => m.GestionarAnuncios), canActivate: [AuthGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'estudiante/submaterias/:materiaId/:semestre', loadComponent: () => import('./components/estudiante/submaterias-materia/submaterias-materia').then(m => m.SubmateriasMateria), canActivate: [AuthGuard], data: { roles: ['ESTUDIANTE'] } },
  { path: 'disciplina/materia/:materiaId', loadComponent: () => import('./components/disciplina/ingresar-disciplina/ingresar-disciplina').then(m => m.IngresarDisciplina), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'documentos', loadComponent: () => import('./components/documentos/documentos/documentos').then(m => m.Documentos), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'examen-grado/:materiaId', loadComponent: () => import('./components/examen-grado/ingresar-examen-grado/ingresar-examen-grado').then(m => m.IngresarExamenGrado), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN', 'PROFESOR'] } },
  { path: 'configuracion', loadComponent: () => import('./components/configuracion/configuracion').then(m => m.ConfiguracionComponent), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'ingreso-masivo', loadComponent: () => import('./components/ingreso-masivo/ingreso-masivo').then(m => m.IngresoMasivo), canActivate: [AuthGuard], canDeactivate: [cambiosSinGuardarGuard], data: { roles: ['ADMIN'] } },
  { path: 'auditoria', loadComponent: () => import('./components/auditoria/historial-auditoria').then(m => m.HistorialAuditoria), canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
  { path: 'cambiar-password', loadComponent: () => import('./components/cambiar-password/cambiar-password').then(m => m.CambiarPassword), canActivate: [AuthGuard] },
  { path: 'recuperar-password', loadComponent: () => import('./components/recuperar-password/recuperar-password').then(m => m.RecuperarPassword) },
  // Siempre la última: cualquier ruta no declarada muestra la página 404.
  { path: '**', loadComponent: () => import('./components/no-encontrado/no-encontrado').then(m => m.NoEncontrado) },
];