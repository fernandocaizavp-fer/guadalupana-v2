import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { asignarConceptosFaltantes } from './finanzas.controller';
import { normalizarDocumento, errorDeDocumento } from '../lib/documento-identidad';

// Fuente única de verdad para la numeración de una matrícula dentro de un curso:
// el correlativo es max(matriculaNo)+1 (no un count, para no reutilizar números
// si una matrícula fue borrada físicamente), el tomo por defecto es '1' y la
// página se calcula como (correlativo * 2) - 1 (1, 3, 5, ... impares).
const calcularSiguienteMatricula = async (cursoId: number, tomoActual?: string) => {
  // Solo matrículas activas: al archivar un estudiante (activo=false) su número
  // se libera y vuelve a estar disponible (si no queda ninguno, el próximo es 001).
  const existentes = await prisma.matricula.findMany({
    where: { cursoId, activo: true },
    select: { matriculaNo: true }
  });
  const maxNo = existentes.reduce(
    (max, e) => Math.max(max, parseInt(e.matriculaNo, 10) || 0),
    0
  );
  const numericMatriculaNo = maxNo + 1;
  return {
    matriculaNo: String(numericMatriculaNo).padStart(3, '0'),
    tomo: tomoActual || '1',
    pagina: String((numericMatriculaNo * 2) - 1)
  };
};

// Vista previa del próximo número de matrícula/tomo/página para un curso,
// para que el formulario los muestre autollenados antes de guardar.
export const siguienteMatricula = async (req: Request, res: Response) => {
  try {
    const cursoId = Number(req.params.cursoId);
    if (!cursoId) return res.status(400).json({ error: 'Curso inválido' });
    const preview = await calcularSiguienteMatricula(cursoId);
    res.json(preview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular el número de matrícula' });
  }
};

// Las transacciones interactivas de Prisma se cortan a los 5 s por defecto. Con
// Supabase lento (recién despertado, o desde una red lenta) matricular fallaba con
// P2028 "Transaction not found". 20 s da margen sin afectar el caso normal (<1 s).
const OPCIONES_TX = { maxWait: 20000, timeout: 20000 };

export const crearMatricula = async (req: Request, res: Response) => {
  const {
    tomo, pagina, apellidos, nombres, cedula, sexo,
    fechaNacimiento, anioNacimiento, mesNacimiento, diaNacimiento,
    pais, provincia, canton, parroquia, ciudad,
    nacionalidad, calle, num, transversal, telefono, correo,
    nivelEstudio, tipoBachiller, conferidoPorA1, conferidoPorA2,
    cursoanterior, unidadeducativa, centroformacionanterior,
    nombrepapa, profesionpapa, ocupacionpapa,
    nombremama, profesionmama, ocupacionmama,
    nombrerepresentante, ocupacionrepresentante,
    domiciliorepresentante, telefonorepresentante,
    correoestudiante, lugarfechamatricula,
    especialidad, lugarfechacertificado, cursoId
  } = req.body;

  // Campos mínimos para crear el usuario y la matrícula. Sin esta validación un
  // dato faltante terminaba en un 500 opaco (p. ej. toLowerCase sobre el correo).
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const correoFinal = texto(correoestudiante) || texto(correo);
  if (!texto(apellidos) || !texto(nombres)) {
    return res.status(400).json({ error: 'Los apellidos y los nombres son obligatorios' });
  }
  // Cédula o pasaporte sin espacios y en mayúsculas: es también la contraseña inicial.
  const documento = normalizarDocumento(cedula);
  const errorDocumento = errorDeDocumento(documento);
  if (errorDocumento) return res.status(400).json({ error: errorDocumento });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoFinal)) {
    return res.status(400).json({ error: 'El correo del estudiante es obligatorio y debe ser válido' });
  }
  if (!Number.isInteger(Number(cursoId)) || Number(cursoId) <= 0) {
    return res.status(400).json({ error: 'Selecciona un curso válido' });
  }

  try {
    const curso = await prisma.curso.findUnique({ where: { id: Number(cursoId) }, select: { id: true } });
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const hash = await bcrypt.hash(documento, 10);

    // Numeración (correlativo, tomo, página) desde la fuente única de verdad.
    const { matriculaNo, tomo: tomoFinal, pagina: paginaCalculada } =
      await calcularSiguienteMatricula(Number(cursoId), tomo);

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: nombres.toUpperCase(),
          apellido: apellidos.toUpperCase(),
          correo: correoFinal.toLowerCase(),
          password: hash,
          rol: 'ESTUDIANTE'
        }
      });

      const matricula = await tx.matricula.create({
        data: {
          matriculaNo,
          tomo: tomoFinal,
          pagina: paginaCalculada,
          apellidos: apellidos.toUpperCase(),
          nombres: nombres.toUpperCase(),
          cedula: documento,
          sexo,
          nivelEstudio,
          lugarfechamatricula: lugarfechamatricula?.toUpperCase(),
          cursoId: Number(cursoId),
          usuarioId: usuario.id,

          // Datos personales en tabla separada
          datosPersonales: {
            create: {
              fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
              anioNacimiento,
              mesNacimiento,
              diaNacimiento,
              pais: pais?.toUpperCase(),
              provincia: provincia?.toUpperCase(),
              canton: canton?.toUpperCase(),
              parroquia: parroquia?.toUpperCase(),
              ciudad: ciudad?.toUpperCase(),
              nacionalidad: nacionalidad?.toUpperCase(),
              calle: calle?.toUpperCase(),
              num,
              transversal,
              telefono,
              correo: correoFinal.toLowerCase()
            }
          },

          // Datos familiares en tabla separada
          datosFamiliares: {
            create: {
              nombrepapa: nombrepapa?.toUpperCase(),
              profesionpapa: profesionpapa?.toUpperCase(),
              ocupacionpapa: ocupacionpapa?.toUpperCase(),
              nombremama: nombremama?.toUpperCase(),
              profesionmama: profesionmama?.toUpperCase(),
              ocupacionmama: ocupacionmama?.toUpperCase(),
              nombrerepresentante: nombrerepresentante?.toUpperCase(),
              ocupacionrepresentante: ocupacionrepresentante?.toUpperCase(),
              domiciliorepresentante: domiciliorepresentante?.toUpperCase(),
              telefonorepresentante,
              correoestudiante: correoFinal.toLowerCase()
            }
          },

          // Datos académicos en tabla separada
          datosAcademicos: {
            create: {
              cursoanterior: cursoanterior?.toUpperCase(),
              unidadeducativa: unidadeducativa?.toUpperCase(),
              centroformacionanterior: centroformacionanterior?.toUpperCase(),
              tipoBachiller,
              conferidoPorA1: conferidoPorA1?.toUpperCase(),
              conferidoPorA2: conferidoPorA2?.toUpperCase(),
              especialidad: especialidad?.toUpperCase(),
              lugarfechacertificado: lugarfechacertificado?.toUpperCase()
            }
          }
        },
        include: {
          curso: true,
          datosPersonales: true,
          datosFamiliares: true,
          datosAcademicos: true
        }
      });

      // Finanzas: el estudiante nuevo recibe todos los conceptos de pago de su
      // curso, aunque se hayan creado antes de su matrícula (ver
      // asignarConceptosFaltantes).
      await asignarConceptosFaltantes(tx, { id: usuario.id });

      return { usuario, matricula };
    }, OPCIONES_TX);

    res.json({
      message: 'Matrícula creada exitosamente',
      matricula: resultado.matricula,
      credenciales: {
        correo: resultado.usuario.correo,
        passwordDefault: `Su cédula o pasaporte: ${documento}`
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const campos = Array.isArray(target) ? target.join(',') : String(target ?? '');
      // Si la cédula o el correo son de un estudiante dado de baja, se avisa con 409
      // para que la pantalla ofrezca reactivarlo en lugar de un simple "duplicado".
      if (campos.includes('cedula') || campos.includes('correo')) {
        const archivada = await prisma.matricula.findFirst({
          where: { activo: false, OR: [{ cedula: documento }, { usuario: { correo: correoFinal.toLowerCase() } }] },
          select: { id: true, nombres: true, apellidos: true, curso: { select: { ramaArtesanal: true } } }
        }).catch(() => null);
        if (archivada) {
          return res.status(409).json({
            error: `${archivada.nombres} ${archivada.apellidos} tiene una matrícula archivada (${archivada.curso.ramaArtesanal})`,
            archivada
          });
        }
      }
      if (campos.includes('cedula')) {
        return res.status(400).json({ error: 'Ya existe un estudiante matriculado con esa cédula' });
      }
      if (campos.includes('correo')) {
        return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });
      }
      if (campos.includes('matriculaNo')) {
        return res.status(400).json({ error: 'El número de matrícula ya existe en este curso' });
      }
      return res.status(400).json({ error: 'Registro duplicado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear matrícula' });
  }
};

export const actualizarMatricula = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    tomo, pagina, apellidos, nombres, cedula, sexo,
    nivelEstudio, lugarfechamatricula,
    fechaNacimiento, anioNacimiento, mesNacimiento, diaNacimiento,
    pais, provincia, canton, parroquia, ciudad,
    nacionalidad, calle, num, transversal, telefono, correo,
    nombrepapa, profesionpapa, ocupacionpapa,
    nombremama, profesionmama, ocupacionmama,
    nombrerepresentante, ocupacionrepresentante,
    domiciliorepresentante, telefonorepresentante, correoestudiante,
    cursoanterior, unidadeducativa, centroformacionanterior,
    tipoBachiller, conferidoPorA1, conferidoPorA2,
    especialidad, lugarfechacertificado
  } = req.body;

  // Validación previa: antes un dato inválido terminaba en un 500 genérico
  // ("Error al actualizar matrícula") sin decir qué estaba mal.
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if ((apellidos !== undefined && !texto(apellidos)) || (nombres !== undefined && !texto(nombres))) {
    return res.status(400).json({ error: 'Los apellidos y los nombres no pueden quedar vacíos' });
  }
  const cedulaNueva = cedula !== undefined ? normalizarDocumento(cedula) : undefined;
  if (cedulaNueva !== undefined) {
    const errorDocumento = errorDeDocumento(cedulaNueva);
    if (errorDocumento) return res.status(400).json({ error: errorDocumento });
  }
  // El correo del estudiante es también su usuario de acceso (Usuario.correo).
  const correoNuevo = texto(correoestudiante).toLowerCase();
  if (correoestudiante !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNuevo)) {
    return res.status(400).json({ error: 'El correo del estudiante es obligatorio y debe ser válido' });
  }
  if (fechaNacimiento && isNaN(new Date(fechaNacimiento).getTime())) {
    return res.status(400).json({ error: 'La fecha de nacimiento no es válida' });
  }
  const correoPersonal = correo !== undefined ? texto(correo).toLowerCase() : (correoNuevo || undefined);

  try {
    const actual = await prisma.matricula.findUnique({
      where: { id: Number(id) },
      select: { cedula: true, usuarioId: true, usuario: { select: { debeCambiarPassword: true } } }
    });
    if (!actual) return res.status(404).json({ error: 'Matrícula no encontrada' });

    // La contraseña inicial es la cédula: si se corrige la cédula y el estudiante
    // aún no cambió su contraseña, la inicial pasa a ser la cédula corregida.
    // Si ya la cambió, se respeta la suya. (Se cifra fuera de la transacción.)
    const nuevaPassword = cedulaNueva && cedulaNueva !== actual.cedula && actual.usuario.debeCambiarPassword
      ? await bcrypt.hash(cedulaNueva, 10)
      : null;

    // Matrícula y cuenta de acceso se actualizan juntas: antes solo cambiaba la
    // ficha y el estudiante seguía entrando con el correo/nombre antiguos.
    const matricula = await prisma.$transaction(async (tx) => {
      const datosUsuario: any = {};
      if (nombres !== undefined) datosUsuario.nombre = texto(nombres).toUpperCase();
      if (apellidos !== undefined) datosUsuario.apellido = texto(apellidos).toUpperCase();
      if (correoestudiante !== undefined) datosUsuario.correo = correoNuevo;
      if (nuevaPassword) datosUsuario.password = nuevaPassword;
      if (Object.keys(datosUsuario).length > 0) {
        await tx.usuario.update({ where: { id: actual.usuarioId }, data: datosUsuario });
      }

      return tx.matricula.update({
      where: { id: Number(id) },
      data: {
        tomo, pagina,
        apellidos: apellidos !== undefined ? texto(apellidos).toUpperCase() : undefined,
        nombres: nombres !== undefined ? texto(nombres).toUpperCase() : undefined,
        cedula: cedulaNueva, sexo, nivelEstudio,
        lugarfechamatricula: lugarfechamatricula?.toUpperCase(),

        datosPersonales: {
          upsert: {
            create: {
              fechaNacimiento: fechaNacimiento === undefined ? undefined : (fechaNacimiento ? new Date(fechaNacimiento) : null),
              anioNacimiento, mesNacimiento, diaNacimiento,
              pais: pais?.toUpperCase(),
              provincia: provincia?.toUpperCase(),
              canton: canton?.toUpperCase(),
              parroquia: parroquia?.toUpperCase(),
              ciudad: ciudad?.toUpperCase(),
              nacionalidad: nacionalidad?.toUpperCase(),
              calle: calle?.toUpperCase(),
              num, transversal, telefono,
              correo: correoPersonal
            },
            update: {
              fechaNacimiento: fechaNacimiento === undefined ? undefined : (fechaNacimiento ? new Date(fechaNacimiento) : null),
              anioNacimiento, mesNacimiento, diaNacimiento,
              pais: pais?.toUpperCase(),
              provincia: provincia?.toUpperCase(),
              canton: canton?.toUpperCase(),
              parroquia: parroquia?.toUpperCase(),
              ciudad: ciudad?.toUpperCase(),
              nacionalidad: nacionalidad?.toUpperCase(),
              calle: calle?.toUpperCase(),
              num, transversal, telefono,
              correo: correoPersonal
            }
          }
        },

        datosFamiliares: {
          upsert: {
            create: {
              nombrepapa: nombrepapa?.toUpperCase(),
              profesionpapa: profesionpapa?.toUpperCase(),
              ocupacionpapa: ocupacionpapa?.toUpperCase(),
              nombremama: nombremama?.toUpperCase(),
              profesionmama: profesionmama?.toUpperCase(),
              ocupacionmama: ocupacionmama?.toUpperCase(),
              nombrerepresentante: nombrerepresentante?.toUpperCase(),
              ocupacionrepresentante: ocupacionrepresentante?.toUpperCase(),
              domiciliorepresentante: domiciliorepresentante?.toUpperCase(),
              telefonorepresentante,
              correoestudiante: correoestudiante !== undefined ? correoNuevo : undefined
            },
            update: {
              nombrepapa: nombrepapa?.toUpperCase(),
              profesionpapa: profesionpapa?.toUpperCase(),
              ocupacionpapa: ocupacionpapa?.toUpperCase(),
              nombremama: nombremama?.toUpperCase(),
              profesionmama: profesionmama?.toUpperCase(),
              ocupacionmama: ocupacionmama?.toUpperCase(),
              nombrerepresentante: nombrerepresentante?.toUpperCase(),
              ocupacionrepresentante: ocupacionrepresentante?.toUpperCase(),
              domiciliorepresentante: domiciliorepresentante?.toUpperCase(),
              telefonorepresentante,
              correoestudiante: correoestudiante !== undefined ? correoNuevo : undefined
            }
          }
        },

        datosAcademicos: {
          upsert: {
            create: {
              cursoanterior: cursoanterior?.toUpperCase(),
              unidadeducativa: unidadeducativa?.toUpperCase(),
              centroformacionanterior: centroformacionanterior?.toUpperCase(),
              tipoBachiller,
              conferidoPorA1: conferidoPorA1?.toUpperCase(),
              conferidoPorA2: conferidoPorA2?.toUpperCase(),
              especialidad: especialidad?.toUpperCase(),
              lugarfechacertificado: lugarfechacertificado?.toUpperCase()
            },
            update: {
              cursoanterior: cursoanterior?.toUpperCase(),
              unidadeducativa: unidadeducativa?.toUpperCase(),
              centroformacionanterior: centroformacionanterior?.toUpperCase(),
              tipoBachiller,
              conferidoPorA1: conferidoPorA1?.toUpperCase(),
              conferidoPorA2: conferidoPorA2?.toUpperCase(),
              especialidad: especialidad?.toUpperCase(),
              lugarfechacertificado: lugarfechacertificado?.toUpperCase()
            }
          }
        }
      },
      include: {
        curso: true,
        datosPersonales: true,
        datosFamiliares: true,
        datosAcademicos: true
      }
    });
    }, OPCIONES_TX);
    res.json({ message: 'Matrícula actualizada', matricula });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const campos = Array.isArray(target) ? target.join(',') : String(target ?? '');
      if (campos.includes('correo')) {
        return res.status(400).json({ error: 'Ya existe otra cuenta con ese correo' });
      }
      if (campos.includes('cedula')) {
        return res.status(400).json({ error: 'Ya existe otro estudiante con esa cédula' });
      }
      return res.status(400).json({ error: 'Registro duplicado' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Matrícula no encontrada' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar matrícula' });
  }
};

export const eliminarMatricula = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Borrado lógico: la matrícula se archiva (no se pierden notas ni
    // certificados) y, en la misma transacción, la cuenta del estudiante queda
    // inactiva para que no pueda volver a iniciar sesión.
    await prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.update({
        where: { id: Number(id) },
        data: { activo: false },
        select: { usuarioId: true }
      });
      await tx.usuario.update({
        where: { id: matricula.usuarioId },
        data: { activo: false }
      });
    }, OPCIONES_TX);
    res.json({ message: 'Matrícula eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar matrícula' });
  }
};

export const buscarEstudiante = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const matriculas = await prisma.matricula.findMany({
      where: {
        activo: true,
        OR: [
          { nombres: { contains: String(q), mode: 'insensitive' } },
          { apellidos: { contains: String(q), mode: 'insensitive' } },
          { cedula: { contains: String(q), mode: 'insensitive' } }
        ]
      },
      include: {
        curso: true,
        datosPersonales: true,
        datosFamiliares: true,
        datosAcademicos: true
      }
    });
    res.json(matriculas);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar' });
  }
};

export const obtenerMatricula = async (req: Request, res: Response) => {
  try {
    const matricula = await prisma.matricula.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        curso: { include: { materias: true } },
        datosPersonales: true,
        datosFamiliares: true,
        datosAcademicos: true,
        // Correo de acceso, para que el diálogo de edición muestre el real.
        usuario: { select: { correo: true } }
      }
    });
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });
    res.json(matricula);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener matrícula' });
  }
};
// Estudiantes dados de baja (matrícula archivada), de todos los cursos, para
// poder reactivarlos. Filtro opcional por nombre, apellido o cédula.
export const listarArchivadas = async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  try {
    const matriculas = await prisma.matricula.findMany({
      where: {
        activo: false,
        ...(q && {
          OR: [
            { nombres: { contains: q, mode: 'insensitive' } },
            { apellidos: { contains: q, mode: 'insensitive' } },
            { cedula: { contains: q, mode: 'insensitive' } }
          ]
        })
      },
      select: {
        id: true, nombres: true, apellidos: true, cedula: true, matriculaNo: true, updatedAt: true,
        curso: { select: { id: true, ramaArtesanal: true, anioFormativo: true, fechaInicio: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    res.json(matriculas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los estudiantes archivados' });
  }
};

// Vuelve a matricular a un estudiante archivado. La cédula y el correo son únicos y
// un Usuario tiene una sola Matricula (1:1), así que no se crea una matrícula nueva:
// se reactiva la misma fila (y su cuenta), en el mismo curso o en otro.
// - Mismo curso: recupera todas sus notas y asistencias tal como estaban.
// - Otro curso (p. ej. regresa el año siguiente): las notas del curso anterior se
//   conservan ligadas a las materias de ese curso, pero se borran los registros que
//   no dependen del curso (ingreso rápido y observación de asistencia), porque si no
//   aparecerían en los documentos AL del curso nuevo.
// La contraseña no cambia.
export const reactivarMatricula = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const cursoId = Number(req.body?.cursoId);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Matrícula inválida' });
  if (!Number.isInteger(cursoId) || cursoId <= 0) return res.status(400).json({ error: 'Selecciona un curso válido' });

  try {
    const [matricula, curso] = await Promise.all([
      prisma.matricula.findUnique({ where: { id }, select: { activo: true, cursoId: true, matriculaNo: true, tomo: true, usuarioId: true } }),
      prisma.curso.findUnique({ where: { id: cursoId }, select: { id: true, ramaArtesanal: true } })
    ]);
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (matricula.activo) return res.status(409).json({ error: 'Esta matrícula ya está activa' });

    const cambiaDeCurso = matricula.cursoId !== cursoId;

    // Conserva su número si sigue libre en el mismo curso; si no, el siguiente.
    let numeracion = await calcularSiguienteMatricula(cursoId, matricula.tomo ?? undefined);
    if (!cambiaDeCurso) {
      const ocupado = await prisma.matricula.findFirst({
        where: { cursoId, activo: true, matriculaNo: matricula.matriculaNo },
        select: { id: true }
      });
      if (!ocupado) {
        const n = parseInt(matricula.matriculaNo, 10) || 1;
        numeracion = { matriculaNo: matricula.matriculaNo, tomo: matricula.tomo || '1', pagina: String(n * 2 - 1) };
      }
    }

    const reactivada = await prisma.$transaction(async (tx) => {
      if (cambiaDeCurso) {
        await tx.registroNotaGlobal.deleteMany({ where: { matriculaId: id } });
        await tx.registroExamenGlobal.deleteMany({ where: { matriculaId: id } });
        await tx.registroAsistenciaGlobal.deleteMany({ where: { matriculaId: id } });
        await tx.observacionAsistencia.deleteMany({ where: { matriculaId: id } });
      }
      const actualizada = await tx.matricula.update({
        where: { id },
        data: { activo: true, cursoId, ...numeracion },
        select: { id: true, nombres: true, apellidos: true, matriculaNo: true }
      });
      await tx.usuario.update({ where: { id: matricula.usuarioId }, data: { activo: true } });
      await asignarConceptosFaltantes(tx, { id: matricula.usuarioId });
      return actualizada;
    }, OPCIONES_TX);

    res.json({
      message: `Matrícula reactivada en ${curso.ramaArtesanal} (N.º ${reactivada.matriculaNo})`,
      matricula: reactivada,
      cambiaDeCurso
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El número de matrícula se ocupó al mismo tiempo; inténtalo de nuevo' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al reactivar la matrícula' });
  }
};
