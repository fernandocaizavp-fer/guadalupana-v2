import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { primeraPalabra } from '../lib/curso-nombre';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

// Crear registro de asistencia con todos los estudiantes
export const crearAsistencia = async (req: Request, res: Response) => {
  const { fecha, materiaId, detalles } = req.body;
  try {
    // Parsear como fecha local para evitar desfase UTC
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia, 12, 0, 0);

    const asistencia = await prisma.asistencia.create({
      data: {
        fecha: fechaLocal,
        materiaId: Number(materiaId),
        detalles: {
          create: detalles.map((d: any) => ({
            matriculaId: Number(d.matriculaId),
            presente: d.presente
          }))
        }
      },
      include: { detalles: true }
    });
    res.json({ message: 'Asistencia registrada', asistencia });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

// Listar asistencias de una materia
export const getAsistenciasPorMateria = async (req: Request, res: Response) => {
  const { materiaId } = req.params;
  try {
    const asistencias = await prisma.asistencia.findMany({
      where: { materiaId: Number(materiaId) },
      include: {
        detalles: {
          include: { matricula: true }
        }
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
};

// Obtener resumen de asistencia por curso
export const getResumenAsistenciaCurso = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  try {
    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: Number(cursoId) },
      include: {
        observacionAsistencia: true,
        asistenciaDetalles: {
          include: { asistencia: true }
        }
      },
      orderBy: { apellidos: 'asc' }
    });

    const totalClases = await prisma.asistencia.count({
      where: { materia: { cursoId: Number(cursoId) } }
    });

    const resumen = matriculas.map(m => {
      const totalPresente = m.asistenciaDetalles.filter(d => d.presente).length;
      const porcentaje = totalClases > 0
        ? Math.round((totalPresente / totalClases) * 100)
        : 0;

      return {
        id: m.id,
        apellidos: formatearNombre(m.apellidos),
        nombres: formatearNombre(m.nombres),
        cedula: m.cedula,
        totalClases,
        totalPresente,
        totalFaltas: totalClases - totalPresente,
        porcentaje,
        observacion: m.observacionAsistencia?.observacion || ''
      };
    });

    res.json({ resumen, totalClases });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

// Guardar observación de asistencia por estudiante
export const guardarObservacion = async (req: Request, res: Response) => {
  const { matriculaId, cursoId, observacion } = req.body;
  try {
    await prisma.observacionAsistencia.upsert({
      where: { matriculaId: Number(matriculaId) },
      update: { observacion },
      create: {
        matriculaId: Number(matriculaId),
        cursoId: Number(cursoId),
        observacion
      }
    });
    res.json({ message: 'Observación guardada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar observación' });
  }
};

// Actualizar registro de asistencia (fecha y/o estado de cada estudiante)
export const actualizarAsistencia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fecha, detalles } = req.body;
  try {
    const asistenciaId = Number(id);

    // Actualizar la fecha si se envió (parseada como fecha local, igual que al crear)
    const data: any = {};
    if (fecha) {
      const [anio, mes, dia] = fecha.split('-').map(Number);
      data.fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
    }
    if (Object.keys(data).length > 0) {
      await prisma.asistencia.update({ where: { id: asistenciaId }, data });
    }

    // Actualizar (o crear si faltara) el estado presente/ausente de cada estudiante
    if (Array.isArray(detalles)) {
      await Promise.all(
        detalles.map((d: any) =>
          prisma.asistenciaDetalle.upsert({
            where: {
              asistenciaId_matriculaId: {
                asistenciaId,
                matriculaId: Number(d.matriculaId)
              }
            },
            update: { presente: d.presente },
            create: {
              asistenciaId,
              matriculaId: Number(d.matriculaId),
              presente: d.presente
            }
          })
        )
      );
    }

    res.json({ message: 'Asistencia actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
};

// Eliminar registro de asistencia
export const eliminarAsistencia = async (req: Request, res: Response) => {
  try {
    await prisma.asistencia.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Asistencia eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar asistencia' });
  }
};

// Generar AL18
export const generarAL18 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada } = req.query;

  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: Number(cursoId) },
      include: {
        observacionAsistencia: true,
        asistenciaDetalles: true
      },
      orderBy: { apellidos: 'asc' }
    });

    const totalClases = await prisma.asistencia.count({
      where: { materia: { cursoId: Number(cursoId) } }
    });

    const estudiantes = matriculas.map((m, index) => {
      const totalPresente = m.asistenciaDetalles.filter(d => d.presente).length;
      const porcentaje = totalClases > 0
        ? Math.round((totalPresente / totalClases) * 100)
        : 0;

      return {
        num: String(index + 1),
        nombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,
        cedula: m.cedula,
        porcentaje: `${porcentaje}%`,
        observacion: m.observacionAsistencia?.observacion || ''
      };
    });

      const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      const anio1 = `${meses[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
      const anio2 = `${meses[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const templatePath = path.join(process.cwd(), 'templates', 'AL18CUADRODEASISTENCIA.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render({
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      anio1,
      anio2,
      jornada: jornada || 'MATUTINA',
      lugarFecha: lugarFecha || '',
      estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL18_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL18' });
  }
};