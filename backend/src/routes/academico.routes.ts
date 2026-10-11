import { Router } from 'express';
import {
  getMateriasCurso,
  guardarProgramacion,
  getAulaVirtual,
  getAsistenciasEstudiante,
  getTareasPendientes
} from '../controllers/academico.controller';
import { verificarToken, soloAdmin, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/cursos/:id/materias', verificarToken, soloAdmin, getMateriasCurso);
router.post('/programacion', verificarToken, soloAdmin, guardarProgramacion);

// El controlador verifica además que un estudiante solo acceda a lo suyo.
const estudiante = [verificarToken, soloRoles('ADMIN', 'ESTUDIANTE')];
router.get('/estudiante/:id/aula-virtual', estudiante, getAulaVirtual);
router.get('/estudiante/:id/asistencias', estudiante, getAsistenciasEstudiante);
router.get('/estudiante/:id/tareas-pendientes', estudiante, getTareasPendientes);

export default router;
