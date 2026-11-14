import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import cursoRoutes from './routes/curso.routes';
import matriculaRoutes from './routes/matricula.routes';
import documentoRoutes from './routes/documento.routes';
import notaRoutes from './routes/nota.routes';
import usuarioRoutes from './routes/usuario.routes';
import tareaRoutes from './routes/tarea.routes';
import suplетorioRoutes from './routes/supletorio.routes';
import asistenciaRoutes from './routes/asistencia.routes';
import anuncioRoutes from './routes/anuncio.routes';
import disciplinaRoutes from './routes/disciplina.routes';
import reporteRoutes from './routes/reporte.routes';
import examenGradoRoutes from './routes/examen-grado.routes';
import cedulaRoutes from './routes/cedula.routes';
import configuracionRoutes from './routes/configuracion.routes';
import finanzasRoutes from './routes/finanzas.routes';
import academicoRoutes from './routes/academico.routes';
import portalRoutes from './routes/portal.routes';
import dashboardRoutes from './routes/dashboard.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import chatRoutes from './routes/chat.routes';
import helmet from 'helmet';
import compression from 'compression';
import { defensaDoS } from './middlewares/defensa.middleware';
import { manejadorErrores } from './middlewares/errores.middleware';
import { opcionesCors, avisosDeSeguridad } from './lib/seguridad';

dotenv.config();
avisosDeSeguridad();

const app = express();
// Render pone un proxy delante: sin esto req.ip sería la IP del proxy y el
// límite anti-DoS (por IP) se repartiría entre todos los usuarios a la vez.
app.set('trust proxy', 1);
// Cabeceras de seguridad estándar. CORP en cross-origin para que el frontend
// (otro dominio) pueda seguir mostrando las imágenes antiguas de /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors(opcionesCors()));
app.use(express.json());
app.use(defensaDoS);


app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/matriculas', matriculaRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/notas', notaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/supletorios', suplетorioRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/disciplina', disciplinaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/examen-grado', examenGradoRoutes);
app.use('/api/cedula', cedulaRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/academico', academicoRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend CF Guadalupana funcionando' });
});

// Siempre al final: rutas inexistentes y errores no capturados responden JSON.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});
app.use(manejadorErrores);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  // PID del proceso: se usa para medir CPU/RAM por PID con JMeter + PerfMon
  // (pruebas de eficiencia ISO/IEC 25010). Ver jmeter/analizar_perfmon.py.
  console.log(`PID del servidor: ${process.pid}`);
});