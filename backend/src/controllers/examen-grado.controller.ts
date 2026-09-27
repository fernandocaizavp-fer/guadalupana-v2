import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calcularDisciplinaAnual } from '../lib/disciplina';
import { getConfiguracion, primeraNotaFueraDeRango, ventanaExamenGradoAbierta, vigenteHasta } from '../lib/configuracion';
import { primeraPalabra } from '../lib/curso-nombre';
import path from 'path';
import fs from 'fs';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// Obtener estudiantes de una materia con sus notas de examen
export const getEstudiantesExamenGrado = async (req: Request, res: Response) => {
  const { materiaId } = req.params;
  try {
    const materia = await prisma.materia.findUnique({
      where: { id: Number(materiaId) },
      include: {
        curso: {
          include: {
            matriculas: { orderBy: { apellidos: 'asc' } }
          }
        }
      }
    });
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });

    const examenesExistentes = await prisma.examenGrado.findMany({
      where: { materiaId: Number(materiaId) }
    });

    const estudiantes = materia.curso.matriculas.map(m => {
      const examen = examenesExistentes.find(e => e.matriculaId === m.id);
      return {
        id: m.id,
        nombres: m.nombres,
        apellidos: m.apellidos,
        cedula: m.cedula,
        valor: examen?.valor ?? null,
        examenGradoHabilitadoHasta: m.examenGradoHabilitadoHasta
      };
    });

    res.json({
      materia: {
        id: materia.id,
        nombre: materia.nombre,
        esSubmateria: materia.esSubmateria,
        materiaParent: materia.materiaParent
      },
      estudiantes
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
};

// Guardar notas de examen masivamente
export const guardarExamenesGrado = async (req: Request, res: Response) => {
  const { notas } = req.body;
  try {
    const config = await getConfiguracion();

    const fuera = primeraNotaFueraDeRango(
      notas.map((n: any) => (n.valor !== '' && n.valor !== null ? Number(n.valor) : null)),
      config
    );
    if (fuera !== null) {
      return res.status(400).json({
        error: `La nota ${fuera} está fuera del rango permitido (${config.notaMinima} - ${config.notaMaxima})`
      });
    }

    // Control de habilitación: si la ventana general está abierta, se guarda
    // todo. Si está cerrada, solo se guardan los estudiantes con recalificación
    // individual vigente (permiso por reclamo); el resto se ignora.
    let notasAGuardar = notas;
    if (!ventanaExamenGradoAbierta(config)) {
      const ids: number[] = Array.from(new Set(notas.map((n: any) => Number(n.matriculaId))));
      const matriculas = await prisma.matricula.findMany({
        where: { id: { in: ids } },
        select: { id: true, examenGradoHabilitadoHasta: true }
      });
      const permitido = new Map(
        matriculas.map((m) => [m.id, vigenteHasta(m.examenGradoHabilitadoHasta)])
      );
      notasAGuardar = notas.filter((n: any) => permitido.get(Number(n.matriculaId)));
      if (notasAGuardar.length === 0) {
        return res.status(403).json({
          error: 'Los exámenes de grado no están habilitados en este momento'
        });
      }
    }

    const resultados = await Promise.all(
      notasAGuardar.map((n: any) =>
        prisma.examenGrado.upsert({
          where: {
            materiaId_matriculaId: {
              materiaId: Number(n.materiaId),
              matriculaId: Number(n.matriculaId)
            }
          },
          update: { valor: n.valor !== '' ? Number(n.valor) : null },
          create: {
            materiaId: Number(n.materiaId),
            matriculaId: Number(n.matriculaId),
            valor: n.valor !== '' ? Number(n.valor) : null
          }
        })
      )
    );
    res.json({ message: 'Exámenes guardados', total: resultados.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar exámenes' });
  }
};

// Obtener exámenes de un curso (para AL23)
export const getExamenesPorCurso = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  try {
    const materiasPrincipales = await prisma.materia.findMany({
      where: { cursoId: Number(cursoId), esSubmateria: false },
      orderBy: { id: 'asc' }
    });

    const todasMaterias = await prisma.materia.findMany({
      where: { cursoId: Number(cursoId) },
      select: { id: true, nombre: true, esSubmateria: true, materiaParent: true }
    });

    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: Number(cursoId) },
      include: { examenesGrado: true },
      orderBy: { apellidos: 'asc' }
    });

    res.json({ matriculas, materias: materiasPrincipales, todasMaterias });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener exámenes' });
  }
};

// Generar AL23
export const generarAL23 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada } = req.query;

  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) }
    });
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    // Materias principales y submaterias
    const todasMaterias = await prisma.materia.findMany({
      where: { cursoId: Number(cursoId) },
      select: { id: true, nombre: true, esSubmateria: true, materiaParent: true },
      orderBy: { id: 'asc' }
    });

    const materiasPrincipales = todasMaterias.filter(m => !m.esSubmateria);

    // Helper para obtener id de materia por nombre
    const getMateriaId = (nombre: string) =>
      materiasPrincipales.find(m => m.nombre === nombre)?.id;

    // Submaterias de Práctica y Teoría
    const subsPractica = todasMaterias.filter(m => m.esSubmateria && m.materiaParent === 'Práctica');
    const subsTeoría = todasMaterias.filter(m => m.esSubmateria && m.materiaParent === 'Teoría');

    // Matriculas con exámenes y disciplina
    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: Number(cursoId) },
      include: {
        examenesGrado: true,
        notasDisciplina: {
          include: { materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } } }
        }
      },
      orderBy: { apellidos: 'asc' }
    });

    // Helper para obtener nota de examen de una materia
    const getExamen = (matricula: any, materiaId: number): string => {
      const e = matricula.examenesGrado?.find((eg: any) => eg.materiaId === materiaId);
      if (e?.valor === null || e?.valor === undefined) return '-';
      return e.valor % 1 === 0 ? String(e.valor) : e.valor.toFixed(1);
    };

    // Helper para promedio de submaterias
    const getPromedioSubs = (matricula: any, subs: any[]): string => {
      const notas = subs
        .map(sub => {
          const e = matricula.examenesGrado?.find((eg: any) => eg.materiaId === sub.id);
          return e?.valor ?? null;
        })
        .filter(v => v !== null) as number[];
      if (notas.length === 0) return '-';
      const prom = notas.reduce((a, b) => a + b, 0) / notas.length;
      return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
    };

    // Helper disciplina — anual con doble ponderación
    const getDisciplina = (matricula: any): string => {
      const prom = calcularDisciplinaAnual(matricula.notasDisciplina || []);
      if (prom === null) return '-';
      return prom % 1 === 0 ? String(prom) : prom.toFixed(1);
    };

    // Ids de materias fijas
    const idAdmon = getMateriaId('Administración de Talleres');
    const idContabilidad = getMateriaId('Contabilidad');
    const idTics = getMateriaId('TICs');
    const idIngles = getMateriaId('Inglés Técnico');
    const idDesarrollo = getMateriaId('Desarrollo Humano y Ética Profesional');
    const idLegislacion = getMateriaId('Legislación');

    const estudiantes = matriculas.map((m, index) => {
      const teoria = getPromedioSubs(m, subsTeoría);
      const practica = getPromedioSubs(m, subsPractica);
      const administracion = idAdmon ? getExamen(m, idAdmon) : '-';
      const contabilidad = idContabilidad ? getExamen(m, idContabilidad) : '-';
      const tics = idTics ? getExamen(m, idTics) : '-';
      const ingles = idIngles ? getExamen(m, idIngles) : '-';
      const desarrollo = idDesarrollo ? getExamen(m, idDesarrollo) : '-';
      const legislacion = idLegislacion ? getExamen(m, idLegislacion) : '-';
      const disciplina = getDisciplina(m);

      // Promedio general
      const valoresStr = [teoria, practica, administracion, contabilidad,
                          tics, ingles, desarrollo, legislacion, disciplina];
      const valoresNum = valoresStr
        .filter(v => v !== '-')
        .map(v => Number(v));
      const promedio = valoresNum.length > 0
        ? (valoresNum.reduce((a, b) => a + b, 0) / valoresNum.length)
        : null;

      return {
        num: String(index + 1),
        nombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,
        teoria,
        practica,
        administracion,
        contabilidad,
        tics,
        ingles,
        desarrollo,
        legislacion,
        disciplina,
        promedio: promedio !== null
          ? (promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1))
          : '-',
        observaciones: ''
      };
    });

    // Fechas formateadas
    const fechaInicio = `${meses[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const fechaFin = `${meses[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const templatePath = path.join(process.cwd(), 'templates', 'AL23EXAMENESGRADO.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render({
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      fechaInicio,
      fechaFin,
      jornada: (String(jornada || 'MATUTINA')).toUpperCase(),
      lugarFecha: lugarFecha || '',
      estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL23_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL23' });
  }
};