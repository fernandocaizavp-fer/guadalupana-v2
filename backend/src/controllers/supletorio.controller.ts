import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calcularDisciplinaAnual } from '../lib/disciplina';
import { notaALetras } from '../lib/numeroALetras';
import { primeraPalabra } from '../lib/curso-nombre';
import { getConfiguracion, ventanaSupletorioAbierta, notaEnRango, vigenteHasta } from '../lib/configuracion';
import path from 'path';
import fs from 'fs';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const fmt = (valor: number | null | undefined): string => {
  if (valor === null || valor === undefined) return '';
  return valor % 1 === 0 ? String(valor) : valor.toFixed(1);
};

// Formato numérico con dos decimales para el certificado AL16 (p. ej. 8.50, 9.00).
const fmt2 = (valor: number | null | undefined): string => {
  if (valor === null || valor === undefined) return '';
  return valor.toFixed(2);
};

// Estado de aprobación: nota >= notaAprobacion configurada (7 por defecto).
const estadoAprobacion = (valor: number | null | undefined, aprob: number = 7): string => {
  if (valor === null || valor === undefined) return '';
  return valor >= aprob ? 'APROBADO' : 'NO APROBADO';
};

const MESES_MAYUS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const MESES_CAP = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Promedio de las notas de tarea de una materia en un semestre (usado por AL15 y AL16).
const getNota = (matricula: any, nombreMateria: string, semestre: number): number | null => {
  const notas = matricula.notasTarea.filter((n: any) =>
    n.tarea.materia.nombre.toLowerCase().includes(nombreMateria.toLowerCase()) &&
    n.tarea.semestre === semestre && n.valor !== null
  );
  if (notas.length === 0) return null;
  return notas.reduce((a: number, b: any) => a + b.valor, 0) / notas.length;
};

// Nota del supletorio de una materia, si existe.
const getSupletorio = (matricula: any, nombreMateria: string): number | null => {
  const sup = matricula.supletorios.find((s: any) =>
    s.materia.nombre.toLowerCase().includes(nombreMateria.toLowerCase())
  );
  return sup?.valor ?? null;
};

const formatearNombre = (texto: string): string => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

const calcularSuma = (n1: number | null, n2: number | null): string => {
  if (n1 === null || n2 === null) return '';
  const suma = (n1 + n2) / 2;
  return fmt(suma);
};

const calcularPfNum = (n1: number | null, n2: number | null, sup: number | null): number | null => {
  if (n1 === null || n2 === null) return null;
  const suma = (n1 + n2) / 2;
  if (sup !== null) return (suma + sup) / 2;
  return suma;
};

const calcularPf = (n1: number | null, n2: number | null, sup: number | null): string => {
  return fmt(calcularPfNum(n1, n2, sup));
};

export const guardarSupletorio = async (req: Request, res: Response) => {
  const { matriculaId, materiaId, valor } = req.body;
  try {
    const config = await getConfiguracion();
    const valorNum = valor !== null && valor !== '' ? Number(valor) : null;

    // Validación del rango de notas configurado
    if (valorNum !== null && !notaEnRango(valorNum, config)) {
      return res.status(400).json({
        error: `La nota debe estar entre ${config.notaMinima} y ${config.notaMaxima}`
      });
    }

    // Control de habilitación: ventana general del admin o permiso individual
    const matricula = await prisma.matricula.findUnique({
      where: { id: Number(matriculaId) },
      select: { supletorioHabilitadoHasta: true }
    });
    const permisoIndividual = vigenteHasta(matricula?.supletorioHabilitadoHasta);
    if (!ventanaSupletorioAbierta(config) && !permisoIndividual) {
      return res.status(403).json({
        error: 'Los supletorios no están habilitados en este momento'
      });
    }

    const supletorio = await prisma.supletorio.upsert({
      where: {
        materiaId_matriculaId: {
          materiaId: Number(materiaId),
          matriculaId: Number(matriculaId)
        }
      },
      update: { valor: valorNum },
      create: {
        materiaId: Number(materiaId),
        matriculaId: Number(matriculaId),
        valor: valorNum
      }
    });
    res.json({ message: 'Supletorio guardado', supletorio });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar supletorio' });
  }
};

export const guardarSupletoriosMasivo = async (req: Request, res: Response) => {
  const { supletorios } = req.body;
  try {
    const config = await getConfiguracion();

    // Validación del rango de notas configurado para todo el lote
    const fueraDeRango = supletorios.find((s: any) => {
      const v = s.valor !== null && s.valor !== '' ? Number(s.valor) : null;
      return v !== null && !notaEnRango(v, config);
    });
    if (fueraDeRango) {
      return res.status(400).json({
        error: `Hay notas fuera del rango permitido (${config.notaMinima} - ${config.notaMaxima})`
      });
    }

    // Control de habilitación. Si la ventana general está cerrada, cada
    // estudiante del lote debe tener permiso individual vigente.
    if (!ventanaSupletorioAbierta(config)) {
      const ids: number[] = Array.from(new Set(supletorios.map((s: any) => Number(s.matriculaId))));
      const matriculas = await prisma.matricula.findMany({
        where: { id: { in: ids } },
        select: { id: true, supletorioHabilitadoHasta: true }
      });
      const permitido = new Map(
        matriculas.map((m) => [m.id, vigenteHasta(m.supletorioHabilitadoHasta)])
      );
      const bloqueado = supletorios.find((s: any) => !permitido.get(Number(s.matriculaId)));
      if (bloqueado) {
        return res.status(403).json({
          error: 'Los supletorios no están habilitados (plazo cerrado y sin permiso individual para algún estudiante)'
        });
      }
    }

    const resultados = await Promise.all(
      supletorios.map((s: any) =>
        prisma.supletorio.upsert({
          where: {
            materiaId_matriculaId: {
              materiaId: Number(s.materiaId),
              matriculaId: Number(s.matriculaId)
            }
          },
          update: { valor: s.valor !== null ? Number(s.valor) : null },
          create: {
            materiaId: Number(s.materiaId),
            matriculaId: Number(s.matriculaId),
            valor: s.valor !== null ? Number(s.valor) : null
          }
        })
      )
    );
    res.json({ message: 'Supletorios guardados', total: resultados.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar supletorios' });
  }
};

export const generarAL15 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada } = req.query;

  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) },
      include: {
        materias: {
          include: {
            profesor: { select: { cedula: true, nombre: true, apellido: true } },
            profesorPrincipal: { select: { cedula: true, nombre: true, apellido: true } }
          },
          orderBy: { id: 'asc' }
        },
        matriculas: {
          include: {
            notasTarea: {
              include: { tarea: { include: { materia: true } } }
            },
            supletorios: { include: { materia: true } },
            notasDisciplina: {
              include: { materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } } }
            }
          },
          orderBy: { apellidos: 'asc' }
        }
      }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const getN1 = (m: any, nombre: string) => getNota(m, nombre, 1);
    const getN2 = (m: any, nombre: string) => getNota(m, nombre, 2);
    const getSup = getSupletorio;

    const getCedula = (nombreMateria: string): string => {
      const materia = curso.materias.find(m =>
        m.nombre.toLowerCase().includes(nombreMateria.toLowerCase()) && !m.esSubmateria
      );
      return materia?.profesor?.cedula || '';
    };

    const materiaPrincipal = curso.materias.find(
      m => (m.nombre === 'Práctica' || m.nombre === 'Teoría') && !m.esSubmateria
    );
    const cc_tp = materiaPrincipal?.profesorPrincipal?.cedula || '';

    const anio1 = `${MESES_MAYUS[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const anio2 = `${MESES_MAYUS[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const estudiantes = curso.matriculas.map((m, index) => {
      const teoria_n1 = getN1(m, 'Teoría');
      const teoria_n2 = getN2(m, 'Teoría');
      const teoria_sup = getSup(m, 'Teoría');

      const practica_n1 = getN1(m, 'Práctica');
      const practica_n2 = getN2(m, 'Práctica');
      const practica_sup = getSup(m, 'Práctica');

      const adm_n1 = getN1(m, 'Administración');
      const adm_n2 = getN2(m, 'Administración');
      const adm_sup = getSup(m, 'Administración');

      const cont_n1 = getN1(m, 'Contabilidad');
      const cont_n2 = getN2(m, 'Contabilidad');
      const cont_sup = getSup(m, 'Contabilidad');

      const tics_n1 = getN1(m, 'TICs');
      const tics_n2 = getN2(m, 'TICs');
      const tics_sup = getSup(m, 'TICs');

      const ingles_n1 = getN1(m, 'Inglés');
      const ingles_n2 = getN2(m, 'Inglés');
      const ingles_sup = getSup(m, 'Inglés');

      const desarrollo_n1 = getN1(m, 'Desarrollo');
      const desarrollo_n2 = getN2(m, 'Desarrollo');
      const desarrollo_sup = getSup(m, 'Desarrollo');

      const legislacion_n1 = getN1(m, 'Legislación');
      const legislacion_n2 = getN2(m, 'Legislación');
      const legislacion_sup = getSup(m, 'Legislación');

      const proy_n1 = getN1(m, 'Elaboración');
      const proy_n2 = getN2(m, 'Elaboración');
      const proy_sup = getSup(m, 'Elaboración');

      // Disciplina anual: doble ponderación por semestre y promedio de ambos
      const disciplinaVal = calcularDisciplinaAnual(m.notasDisciplina || []);

      const promediosPf = [
        calcularPfNum(teoria_n1, teoria_n2, teoria_sup),
        calcularPfNum(practica_n1, practica_n2, practica_sup),
        calcularPfNum(adm_n1, adm_n2, adm_sup),
        calcularPfNum(cont_n1, cont_n2, cont_sup),
        calcularPfNum(tics_n1, tics_n2, tics_sup),
        calcularPfNum(ingles_n1, ingles_n2, ingles_sup),
        calcularPfNum(desarrollo_n1, desarrollo_n2, desarrollo_sup),
        calcularPfNum(legislacion_n1, legislacion_n2, legislacion_sup),
        calcularPfNum(proy_n1, proy_n2, proy_sup),
        disciplinaVal
      ].filter(n => n !== null) as number[];

      const promedioNum = promediosPf.length > 0
        ? promediosPf.reduce((a, b) => a + b, 0) / promediosPf.length
        : null;

      const promedio = fmt(promedioNum);
      const nomenclatura = promedioNum !== null && promedioNum > 9
        ? 'Supera el Aprendizaje'
        : '';

      return {
        num: String(index + 1),
        nombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,

        teoria_n1: fmt(teoria_n1), teoria_n2: fmt(teoria_n2),
        teoria_suma: calcularSuma(teoria_n1, teoria_n2),
        teoria_sup: fmt(teoria_sup),
        teoria_pf: calcularPf(teoria_n1, teoria_n2, teoria_sup),

        practica_n1: fmt(practica_n1), practica_n2: fmt(practica_n2),
        practica_suma: calcularSuma(practica_n1, practica_n2),
        practica_sup: fmt(practica_sup),
        practica_pf: calcularPf(practica_n1, practica_n2, practica_sup),

        adm_n1: fmt(adm_n1), adm_n2: fmt(adm_n2),
        adm_suma: calcularSuma(adm_n1, adm_n2),
        adm_sup: fmt(adm_sup),
        adm_pf: calcularPf(adm_n1, adm_n2, adm_sup),

        cont_n1: fmt(cont_n1), cont_n2: fmt(cont_n2),
        cont_suma: calcularSuma(cont_n1, cont_n2),
        cont_sup: fmt(cont_sup),
        cont_pf: calcularPf(cont_n1, cont_n2, cont_sup),

        tics_n1: fmt(tics_n1), tics_n2: fmt(tics_n2),
        tics_suma: calcularSuma(tics_n1, tics_n2),
        tics_sup: fmt(tics_sup),
        tics_pf: calcularPf(tics_n1, tics_n2, tics_sup),

        ingles_n1: fmt(ingles_n1), ingles_n2: fmt(ingles_n2),
        ingles_suma: calcularSuma(ingles_n1, ingles_n2),
        ingles_sup: fmt(ingles_sup),
        ingles_pf: calcularPf(ingles_n1, ingles_n2, ingles_sup),

        desarrollo_n1: fmt(desarrollo_n1), desarrollo_n2: fmt(desarrollo_n2),
        desarrollo_suma: calcularSuma(desarrollo_n1, desarrollo_n2),
        desarrollo_sup: fmt(desarrollo_sup),
        desarrollo_pf: calcularPf(desarrollo_n1, desarrollo_n2, desarrollo_sup),

        legislacion_n1: fmt(legislacion_n1), legislacion_n2: fmt(legislacion_n2),
        legislacion_suma: calcularSuma(legislacion_n1, legislacion_n2),
        legislacion_sup: fmt(legislacion_sup),
        legislacion_pf: calcularPf(legislacion_n1, legislacion_n2, legislacion_sup),

        proy_n1: fmt(proy_n1), proy_n2: fmt(proy_n2),
        proy_suma: calcularSuma(proy_n1, proy_n2),
        proy_sup: fmt(proy_sup),
        proy_pf: calcularPf(proy_n1, proy_n2, proy_sup),

        disciplina: fmt(disciplinaVal),
        promedio,
        nomenclatura
      };
    });

    const templatePath = path.join(process.cwd(), 'templates', 'AL15CUADROFINALNOTAS.docx');
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
      jornada: (String(jornada || 'MATUTINA')).toUpperCase(),
      lugarFecha: lugarFecha || '',
      cc_tp,
      cc_adm: getCedula('Administración'),
      cc_cont: getCedula('Contabilidad'),
      cc_tics: getCedula('TICs'),
      cc_ingles: getCedula('Inglés'),
      cc_desarollo: getCedula('Desarrollo'),
      cc_legislacion: getCedula('Legislación'),
      estudiantes,
      estudiantes2: estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL15_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL15' });
  }
};

// AL16: Certificado de Promoción del año formativo (individual, por estudiante).
// Reutiliza el mismo cálculo de notas finales del AL15 (promedio final con supletorios,
// disciplina anual y promedio general).
export const generarAL16 = async (req: Request, res: Response) => {
  const { matriculaId } = req.params;
  const { lugarFecha, jornada } = req.query;

  try {
    const config = await getConfiguracion();
    const aprob = config.notaAprobacion;
    const matricula = await prisma.matricula.findUnique({
      where: { id: Number(matriculaId) },
      include: {
        curso: true,
        notasTarea: { include: { tarea: { include: { materia: true } } } },
        supletorios: { include: { materia: true } },
        notasDisciplina: {
          include: { materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } } }
        }
      }
    });

    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });

    const m = matricula;
    const pf = (nombre: string) =>
      calcularPfNum(getNota(m, nombre, 1), getNota(m, nombre, 2), getSupletorio(m, nombre));

    const teoriaPf = pf('Teoría');
    const practicaPf = pf('Práctica');
    const admPf = pf('Administración');
    const contPf = pf('Contabilidad');
    const ticsPf = pf('TICs');
    const inglesPf = pf('Inglés');
    const desarrolloPf = pf('Desarrollo');
    const proyPf = pf('Elaboración');
    const legislacionPf = pf('Legislación');
    const disciplinaVal = calcularDisciplinaAnual(m.notasDisciplina || []);

    // El promedio general NO incluye disciplina: solo las materias (teoría,
    // práctica, administración, contabilidad, inglés, desarrollo TICS, proyecto,
    // legislación). disciplina/disciplinaL se muestran aparte, sin promediarse.
    const componentes = [
      teoriaPf, practicaPf, admPf, contPf, ticsPf, inglesPf,
      desarrolloPf, legislacionPf, proyPf
    ].filter(n => n !== null) as number[];
    const promedioNum = componentes.length > 0
      ? componentes.reduce((a, b) => a + b, 0) / componentes.length
      : null;

    const sexo = m.sexo || '';
    const prefijo = sexo === 'Masculino' ? 'El' : sexo === 'Femenino' ? 'La' : 'El/La';
    const tratamiento = sexo === 'Masculino' ? 'Sr.' : sexo === 'Femenino' ? 'Srta.' : 'Sr./Srta.';
    const loLa = sexo === 'Masculino' ? 'lo' : sexo === 'Femenino' ? 'la' : 'lo/la';

    const anio1 = `${MESES_CAP[m.curso.fechaInicio.getMonth()]} ${m.curso.fechaInicio.getFullYear()}`;
    const anio2 = `${MESES_CAP[m.curso.fechaFin.getMonth()]} ${m.curso.fechaFin.getFullYear()}`;

    const datos = {
      prefijo, tratamiento, loLa,
      nombres: formatearNombre(m.nombres || ''),
      apellidos: formatearNombre(m.apellidos || ''),
      AF1: anio1,
      AF2: anio2,
      jornada: (String(jornada || 'MATUTINA')).toUpperCase(),
      raArt: primeraPalabra(m.curso.ramaArtesanal).toUpperCase(),

      teoria: fmt2(teoriaPf), teoriaL: notaALetras(teoriaPf), teoE: estadoAprobacion(teoriaPf, aprob),
      practica: fmt2(practicaPf), practicaL: notaALetras(practicaPf), pracE: estadoAprobacion(practicaPf, aprob),
      administracion: fmt2(admPf), administracionL: notaALetras(admPf), admE: estadoAprobacion(admPf, aprob),
      contabilidad: fmt2(contPf), contabilidadL: notaALetras(contPf), conE: estadoAprobacion(contPf, aprob),
      ingles: fmt2(inglesPf), inglesL: notaALetras(inglesPf), ingE: estadoAprobacion(inglesPf, aprob),
      desarrollo: fmt2(desarrolloPf), desarrolloL: notaALetras(desarrolloPf), desE: estadoAprobacion(desarrolloPf, aprob),
      tics: fmt2(ticsPf), ticsL: notaALetras(ticsPf), ticsE: estadoAprobacion(ticsPf, aprob),
      proyect: fmt2(proyPf), proyectL: notaALetras(proyPf), proyectE: estadoAprobacion(proyPf, aprob),
      legislacion: fmt2(legislacionPf), legislacionL: notaALetras(legislacionPf), legisE: estadoAprobacion(legislacionPf, aprob),

      disciplina: fmt2(disciplinaVal), disciplinaL: notaALetras(disciplinaVal, true),
      promedio: fmt2(promedioNum), promedioL: notaALetras(promedioNum, true),
      lugarfecha: lugarFecha || ''
    };

    const templatePath = path.join(process.cwd(), 'templates', 'AL16CERTIFICADOPROMOCION.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render(datos);

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL16_${m.cedula}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL16' });
  }
};

// AL22: Cuadro de participantes aprobados y no aprobados de grados (por curso).
// La observación depende de las notas finales (igual que el AL16): si alguna de las 9
// materias tiene nota final < 7, el participante queda NO APROBADO. La disciplina no cuenta.
export const generarAL22 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada, regimen } = req.query;

  // Materias evaluadas para la promoción (las mismas con columna de estado en el AL16).
  const MATERIAS = ['Teoría', 'Práctica', 'Administración', 'Contabilidad', 'TICs',
    'Inglés', 'Desarrollo', 'Elaboración', 'Legislación'];

  try {
    const config = await getConfiguracion();
    const aprob = config.notaAprobacion;
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) },
      include: {
        matriculas: {
          orderBy: { apellidos: 'asc' },
          include: {
            notasTarea: { include: { tarea: { include: { materia: true } } } },
            supletorios: { include: { materia: true } }
          }
        }
      }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const AF1 = `${MESES_MAYUS[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const AF2 = `${MESES_MAYUS[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const estudiantes = curso.matriculas.map((m, index) => {
      const tieneReprobada = MATERIAS.some(nombre => {
        const pf = calcularPfNum(getNota(m, nombre, 1), getNota(m, nombre, 2), getSupletorio(m, nombre));
        return pf !== null && pf < aprob;
      });
      return {
        num: String(index + 1),
        apellidosnombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,
        cedula: m.cedula || '',
        observacion: tieneReprobada ? 'NO APROBADO' : 'APROBADO'
      };
    });

    const regimenStr = (String(regimen || 'SIERRA')).toUpperCase();

    const datos = {
      xC: regimenStr === 'COSTA' ? 'X' : '',
      xS: regimenStr === 'SIERRA' ? 'X' : '',
      jornada: (String(jornada || 'MATUTINA')).toUpperCase(),
      AF1,
      AF2,
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      lugarFecha: lugarFecha || '',
      estudiantes
    };

    const templatePath = path.join(process.cwd(), 'templates', 'AL22CUADROSAPROBADOSNOAPROBADOS.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render(datos);

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL22_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL22' });
  }
};

export const generarAL19 = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { lugarFecha, jornada } = req.query;

  try {
    const config = await getConfiguracion();
    const aprob = config.notaAprobacion;
    const curso = await prisma.curso.findUnique({
      where: { id: Number(cursoId) },
      include: {
        matriculas: {
          include: {
            notasTarea: {
              include: { tarea: { include: { materia: true } } }
            },
            supletorios: { include: { materia: true } }
          },
          orderBy: { apellidos: 'asc' }
        }
      }
    });

    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const getN = (matricula: any, semestre: number): number | null => {
      const notas = matricula.notasTarea.filter((n: any) =>
        n.tarea.materia.nombre.toLowerCase().includes('elaboración') &&
        n.tarea.semestre === semestre && n.valor !== null
      );
      if (notas.length === 0) return null;
      return notas.reduce((a: number, b: any) => a + b.valor, 0) / notas.length;
    };

    const getSup = (matricula: any): number | null => {
      const sup = matricula.supletorios.find((s: any) =>
        s.materia.nombre.toLowerCase().includes('elaboración')
      );
      return sup?.valor ?? null;
    };

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const anio1 = `${meses[curso.fechaInicio.getMonth()]} ${curso.fechaInicio.getFullYear()}`;
    const anio2 = `${meses[curso.fechaFin.getMonth()]} ${curso.fechaFin.getFullYear()}`;

    const estudiantes = curso.matriculas.map((m, index) => {
      const n1 = getN(m, 1);
      const n2 = getN(m, 2);
      const sup = getSup(m);
      const notaNum = calcularPfNum(n1, n2, sup);
      const nota = fmt(notaNum);
      const observacion = notaNum === null ? '' : notaNum >= aprob ? 'Aprobado' : 'Desaprobado';

      return {
        num: String(index + 1),
        nombres: `${formatearNombre(m.apellidos)} ${formatearNombre(m.nombres)}`,
        cedula: m.cedula || '',
        nota,
        observacion
      };
    });

    const templatePath = path.join(process.cwd(), 'templates', 'AL19NOTASPROYECTOS.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render({
      ramaArtesanal: primeraPalabra(curso.ramaArtesanal).toUpperCase(),
      jornada: (String(jornada || 'MATUTINA')).toUpperCase(),
      anio1,
      anio2,
      lugarFecha: lugarFecha || '',
      estudiantes
    });

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', `attachment; filename=AL19_${curso.ramaArtesanal}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar AL19' });
  }
};