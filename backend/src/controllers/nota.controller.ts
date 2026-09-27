import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calcularDisciplinaPonderada, calcularDisciplinaAnual } from '../lib/disciplina';
import { primeraPalabra } from '../lib/curso-nombre';

const formatearNota = (valor: number | string): string => {
  if (valor === '' || valor === null || valor === undefined) return '';
  const num = Number(valor);
  if (isNaN(num)) return '';
  return num % 1 === 0 ? String(num) : num.toFixed(1);
};

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

export const descargarAL14 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, semestre } = req.query;
  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) },
      include: {
        materias: {
          orderBy: { id: 'asc' },
          include: {
            tareas: {
              where: semestre ? { semestre: Number(semestre) } : undefined,
              orderBy: { fecha: 'asc' }
            }
          }
        },
        matriculas: {
          include: {
            notasTarea: {
              include: {
                tarea: { include: { materia: true } }
              },
              where: semestre ? {
                tarea: { semestre: Number(semestre) }
              } : undefined
            },
            notasDisciplina: {
              where: semestre ? { semestre: Number(semestre) } : undefined,
              include: { materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } } }
            }
          },
          orderBy: { apellidos: 'asc' }
        }
      }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const fs = require('fs');
    const path = require('path');
    const PizZip = require('pizzip');
    const Docxtemplater = require('docxtemplater');

    const templatePath = path.join(process.cwd(), 'templates', 'AL14CUADRODECALIFICACIONES.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    // Separar materias principales y submaterias
    const submateriasPractica = curso.materias.filter(m => m.esSubmateria && m.materiaParent === 'Práctica');
    const submateriasTeoria = curso.materias.filter(m => m.esSubmateria && m.materiaParent === 'Teoría');

    const estudiantes = curso.matriculas.map((m, index) => {

      // Promedio de submaterias de Práctica
      const getPromedioSubmaterias = (submaterias: any[]): string => {
        if (submaterias.length === 0) {
          // Sin submaterias — usar notas directas de la materia principal
          return '';
        }
        const todasNotas: number[] = [];
        submaterias.forEach(sub => {
          const notasSub = m.notasTarea.filter(n =>
            n.tarea.materiaId === sub.id && n.valor !== null
          );
          notasSub.forEach(n => todasNotas.push(n.valor || 0));
        });
        if (todasNotas.length === 0) return '';
        return formatearNota(todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length);
      };

      // Promedio materia normal (sin submaterias)
      const getPromedioPorMateria = (nombreMateria: string): string => {
        const notasMateria = m.notasTarea.filter(n =>
          n.tarea.materia.nombre.toLowerCase().includes(nombreMateria.toLowerCase()) &&
          !n.tarea.materia.esSubmateria &&
          n.valor !== null
        );
        if (notasMateria.length === 0) return '';
        const suma = notasMateria.reduce((a, b) => a + (b.valor || 0), 0);
        return formatearNota(suma / notasMateria.length);
      };

      // Disciplina — doble ponderación (submaterias → Práctica/Teoría, luego con materias normales)
      const getPromedioDisciplina = (): string => {
        const notas = (m as any).notasDisciplina || [];
        const valor = semestre
          ? calcularDisciplinaPonderada(notas)
          : calcularDisciplinaAnual(notas);
        return valor !== null ? formatearNota(valor) : '';
      };

      // Promedio general (excluye submaterias)
      const teoria = submateriasPractica.length > 0
        ? getPromedioSubmaterias(submateriasTeoria)
        : getPromedioPorMateria('Teoría');

      const practica = submateriasPractica.length > 0
        ? getPromedioSubmaterias(submateriasPractica)
        : getPromedioPorMateria('Práctica');

      const administracion = getPromedioPorMateria('Administración');
      const contabilidad = getPromedioPorMateria('Contabilidad');
      const tics = getPromedioPorMateria('TICs');
      const ingles = getPromedioPorMateria('Inglés');
      const desarrollo = getPromedioPorMateria('Desarrollo Humano');
      const proyect = getPromedioPorMateria('Elaboración');
      const legislacion = getPromedioPorMateria('Legislación');
      const disciplina = getPromedioDisciplina();

      const notasParaPromedio = [teoria, practica, administracion, contabilidad,
        tics, ingles, desarrollo, proyect, legislacion, disciplina]
        .filter(n => n !== '')
        .map(n => parseFloat(n));

      const promedioGeneral = notasParaPromedio.length > 0
        ? formatearNota(notasParaPromedio.reduce((a, b) => a + b, 0) / notasParaPromedio.length)
        : '';

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
        proyect,
        legislacion,
        disciplina,
        promedio: promedioGeneral,
        observaciones: ''
      };
    });

    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaInicio = `${meses[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const fechaFin = `${meses[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    doc.render({
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      fechaInicio,
      fechaFin,
      lugarFecha: lugarFecha || '',
      semestre: Number(semestre) === 1 ? 'PRIMER SEMESTRE' : 'SEGUNDO SEMESTRE',
      estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    const semestreLabel = semestre ? `_semestre${semestre}` : '';
    res.setHeader('Content-Disposition', `attachment; filename=AL14_${curso.ramaArtesanal}${semestreLabel}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar documento' });
  }
};