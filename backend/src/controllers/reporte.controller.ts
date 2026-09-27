import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { primeraPalabra } from '../lib/curso-nombre';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto.toLowerCase().split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const calcularEdad = (fechaNacimiento: Date | null): string => {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const m = hoy.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
  return String(edad);
};

export const generarAL9 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada, regimen } = req.query;

  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) },
      include: {
        matriculas: {
          orderBy: { apellidos: 'asc' },
          include: {
            datosPersonales: true,
            datosAcademicos: true
          }
        }
      }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const mesesMay = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const AF1 = `${mesesMay[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const AF2 = `${mesesMay[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const estudiantes = curso.matriculas.map((m, index) => {
      const dp = m.datosPersonales;
      const da = m.datosAcademicos;
      const fechaNac = dp?.fechaNacimiento ? new Date(dp.fechaNacimiento) : null;
      const lugarFechaNac = fechaNac
        ? `${formatearNombre(dp?.parroquia || dp?.canton || '')}, ${fechaNac.getDate().toString().padStart(2,'0')}/${(fechaNac.getMonth()+1).toString().padStart(2,'0')}/${fechaNac.getFullYear()}`
        : '';

      return {
        num: String(index + 1),
        apellidosnombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,
        matriculaNo: m.matriculaNo || '',
        tomo: m.tomo || '',
        pagina: m.pagina || '',
        lugarFechaNac,
        cedula: m.cedula || '',
        edad: calcularEdad(fechaNac),
        sexo: (m.sexo || '').charAt(0).toUpperCase(),
        provincia: (dp?.provincia || '').toUpperCase(),
        canton: (dp?.canton || '').toUpperCase(),
        plantel: formatearNombre(da?.cursoanterior || da?.unidadeducativa || ''),
        anioEstudio: formatearNombre(
          m.nivelEstudio === 'a1' ? 'Primaria' :
          m.nivelEstudio === 'a2' ? 'Ciclo Básico' :
          m.nivelEstudio === 'a4' ? (da?.tipoBachiller || 'Bachiller') : ''
        )
      };
    });

    const templatePath = path.join(process.cwd(), 'templates', 'AL9NOMINADEPARTICIPANTESMATRICULADOS.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render({
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      jornada: (jornada || 'MATUTINA').toString().toUpperCase(),
      regimen: (regimen || 'SIERRA').toString().toUpperCase(),
      AF1, AF2,
      lugarFecha: lugarFecha || '',
      estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL9_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL9' });
  }
};