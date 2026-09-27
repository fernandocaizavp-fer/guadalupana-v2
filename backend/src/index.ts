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
import { defensaDoS } from './middlewares/defensa.middleware';




dotenv.config();

const app = express();
app.use(cors());
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



app.get('/', (req, res) => {
  res.json({ message: 'Backend CF Guadalupana funcionando' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  // PID del proceso: se usa para medir CPU/RAM por PID con JMeter + PerfMon
  // (pruebas de eficiencia ISO/IEC 25010). Ver jmeter/analizar_perfmon.py.
  console.log(`PID del servidor: ${process.pid}`);
});