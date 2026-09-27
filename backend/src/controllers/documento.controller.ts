import { Request, Response } from 'express';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { primeraPalabra, terceraPalabra } from '../lib/curso-nombre';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const mesesMayusculas = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto.toLowerCase().split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

const generarWord = (templateName: string, datos: any): Buffer => {
  const templatePath = path.join(process.cwd(), 'templates', templateName);
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' }
  });
  doc.render(datos);
  return doc.getZip().generate({ type: 'nodebuffer' });
};

export const descargarMatricula = async (req: Request, res: Response) => {
  try {
    const matricula = await prisma.matricula.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        curso: true,
        datosPersonales: true,
        datosFamiliares: true,
        datosAcademicos: true
      }
    });
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });

    const dp = matricula.datosPersonales;
    const df = matricula.datosFamiliares;
    const da = matricula.datosAcademicos;

    const fecha = dp?.fechaNacimiento ? new Date(dp.fechaNacimiento) : null;

    const anio1 = `${mesesMayusculas[matricula.curso.fechaInicio.getMonth()]} ${matricula.curso.fechaInicio.getFullYear()}`;
    const anio2 = `${mesesMayusculas[matricula.curso.fechaFin.getMonth()]} ${matricula.curso.fechaFin.getFullYear()}`;

    const datos = {
      matriculaNo: matricula.matriculaNo || '',
      anio1, anio2,
      tomo: (matricula.tomo || '').toUpperCase(),
      pagina: (matricula.pagina || '').toUpperCase(),
      raArt: primeraPalabra(matricula.curso.ramaArtesanal).toUpperCase(),
      cursora: terceraPalabra(matricula.curso.ramaArtesanal).toUpperCase(),
      apellidos: (matricula.apellidos || '').toUpperCase(),
      nombres: (matricula.nombres || '').toUpperCase(),
      pais: (dp?.pais || '').toUpperCase(),
      provincia: (dp?.provincia || '').toUpperCase(),
      canton: (dp?.canton || '').toUpperCase(),
      parroquia: (dp?.parroquia || '').toUpperCase(),
      PARROQUIA: (dp?.parroquia || '').toUpperCase(),
      ciudad: (dp?.ciudad || '').toUpperCase(),
      anio: fecha ? String(fecha.getFullYear()) : '',
      mes: fecha ? String(fecha.getMonth() + 1).padStart(2, '0') : '',
      dia: fecha ? String(fecha.getDate()).padStart(2, '0') : '',
      nacionalidad: (dp?.nacionalidad || '').toUpperCase(),
      cedula: matricula.cedula || '',
      calle: (dp?.calle || '').toUpperCase(),
      num: (dp?.num || '').toUpperCase(),
      transversal: (dp?.transversal || '').toUpperCase(),
      telefono: dp?.telefono || '',
      cursoanterior: (da?.cursoanterior || '').toUpperCase(),
      unidadeducativa: (da?.unidadeducativa || '').toUpperCase(),
      centroformacionanterior: (da?.centroformacionanterior || '').toUpperCase(),
      nombrepapa: (df?.nombrepapa || '').toUpperCase(),
      profesionpapa: (df?.profesionpapa || '').toUpperCase(),
      ocupacionpapa: (df?.ocupacionpapa || '').toUpperCase(),
      nombremama: (df?.nombremama || '').toUpperCase(),
      profesionmama: (df?.profesionmama || '').toUpperCase(),
      ocupacionmama: (df?.ocupacionmama || '').toUpperCase(),
      nombrerepresentante: (df?.nombrerepresentante || '').toUpperCase(),
      ocupacionrepresentante: (df?.ocupacionrepresentante || '').toUpperCase(),
      domiciliorepresentante: (df?.domiciliorepresentante || '').toUpperCase(),
      telefonorepresentante: df?.telefonorepresentante || '',
      correoestudiante: (df?.correoestudiante || '').toLowerCase(),
      lugarfechamatricula: (matricula.lugarfechamatricula || '').toUpperCase()
    };

    const buffer = generarWord('MATRICULAL12.docx', datos);
    res.setHeader('Content-Disposition', `attachment; filename=matricula_${matricula.cedula}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar documento' });
  }
};

export const descargarCertificado = async (req: Request, res: Response) => {
  try {
    const matricula = await prisma.matricula.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        curso: true,
        datosPersonales: true,
        datosFamiliares: true,
        datosAcademicos: true
      }
    });
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });

    const dp = matricula.datosPersonales;
    const da = matricula.datosAcademicos;

    const anio1 = `${meses[matricula.curso.fechaInicio.getMonth()]} ${matricula.curso.fechaInicio.getFullYear()}`;
    const anio2 = `${meses[matricula.curso.fechaFin.getMonth()]} ${matricula.curso.fechaFin.getFullYear()}`;

    const sexo = matricula.sexo || '';
    const prefijo = sexo === 'Masculino' ? 'El' : sexo === 'Femenino' ? 'La' : '';
    const tratamiento = sexo === 'Masculino' ? 'Sr.' : sexo === 'Femenino' ? 'Srta.' : '';
    const elLa = sexo === 'Masculino' ? 'el' : sexo === 'Femenino' ? 'la' : '';
    const matriculado = sexo === 'Masculino' ? 'matriculado' : sexo === 'Femenino' ? 'matriculada' : 'matriculado/a';

    const nivelEstudio = matricula.nivelEstudio || '';
    const tipoBachiller = da?.tipoBachiller || '';

    const xA1 = nivelEstudio === 'a1' ? 'X' : '';
    const xA2 = nivelEstudio === 'a2' ? 'X' : '';
    const xBachiller = nivelEstudio === 'a4' && tipoBachiller === 'Bachiller' ? 'X' : '';
    const xSuperior = nivelEstudio === 'a4' && tipoBachiller === 'Superior' ? 'X' : '';
    const xOtro = nivelEstudio === 'a4' && tipoBachiller === 'Otro' ? 'X' : '';

    const datos = {
      AF1: anio1, AF2: anio2,
      prefijo, tratamiento, elLa, matriculado,
      nombres: (matricula.nombres || '').toUpperCase(),
      apellidos: (matricula.apellidos || '').toUpperCase(),
      raArt: formatearNombre(primeraPalabra(matricula.curso.ramaArtesanal)),
      matriculaNo: matricula.matriculaNo || '',
      tomo: matricula.tomo || '',
      pagina: matricula.pagina || '',
      Especialidad: formatearNombre(da?.especialidad || ''),
      unidadeducativa: formatearNombre(da?.unidadeducativa || ''),
      PARROQUIA: formatearNombre(dp?.parroquia || ''),
      lugarfechacertificado: formatearNombre(da?.lugarfechacertificado || ''),
      xA1, xA2, xBachiller, xSuperior, xOtro,
      conferidoPorA1: formatearNombre(da?.conferidoPorA1 || ''),
      conferidoPorA2: formatearNombre(da?.conferidoPorA2 || ''),
      conferidoPorA4: formatearNombre(da?.unidadeducativa || '')
    };

    const buffer = generarWord('CERTIFICADOMATRICULAL13.docx', datos);
    res.setHeader('Content-Disposition', `attachment; filename=certificado_${matricula.cedula}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar certificado' });
  }
};