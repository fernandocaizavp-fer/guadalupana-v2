import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

export const crearDocente = async (req: Request, res: Response) => {
  const { nombre, apellido, correo, cedula } = req.body;
  try {
    const hash = await bcrypt.hash(cedula, 10);
    const usuario = await prisma.usuario.create({
      data: {
        nombre: nombre.toUpperCase(),
        apellido: apellido.toUpperCase(),
        correo: correo.toLowerCase(),
        cedula,
        password: hash,
        rol: 'PROFESOR'
      }
    });
    res.json({ message: 'Docente creado', usuario });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo o cédula ya está registrado' });
    }
    res.status(500).json({ error: 'Error al crear docente' });
  }
};

export const listarDocentes = async (req: Request, res: Response) => {
  try {
    const docentes = await prisma.usuario.findMany({
      where: { rol: 'PROFESOR' },
      select: { id: true, nombre: true, apellido: true, correo: true, cedula: true, rol: true, createdAt: true },
      orderBy: { apellido: 'asc' }
    });
    res.json(docentes);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar docentes' });
  }
};

export const actualizarDocente = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, apellido, correo, cedula } = req.body;
  try {
    const data: any = {
      nombre: nombre?.toUpperCase(),
      apellido: apellido?.toUpperCase(),
      correo: correo?.toLowerCase(),
      cedula
    };
    if (cedula) data.password = await bcrypt.hash(cedula, 10);
    const usuario = await prisma.usuario.update({ where: { id: Number(id) }, data });
    res.json({ message: 'Docente actualizado', usuario });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo o cédula ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar docente' });
  }
};

export const eliminarDocente = async (req: Request, res: Response) => {
  try {
    await prisma.usuario.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Docente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar docente' });
  }
};

export const asignarProfesor = async (req: Request, res: Response) => {
  const { materiaId, profesorId } = req.body;
  try {
    const materia = await prisma.materia.update({
      where: { id: Number(materiaId) },
      data: { profesorId: Number(profesorId) }
    });
    res.json({ message: 'Profesor asignado', materia });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar profesor' });
  }
};

export const asignarProfesorPrincipalMateria = async (req: Request, res: Response) => {
  const { materiaId, profesorId } = req.body;
  try {
    const materia = await prisma.materia.update({
      where: { id: Number(materiaId) },
      data: { profesorPrincipalId: Number(profesorId) }
    });
    res.json({ message: 'Profesor principal asignado', materia });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar profesor principal' });
  }
};

// Quita el docente de una materia (libera la materia para reasignarla). No borra
// tareas ni notas: esas cuelgan de la materia, no del profesor.
export const desasignarProfesor = async (req: Request, res: Response) => {
  const { materiaId } = req.body;
  try {
    const materia = await prisma.materia.update({
      where: { id: Number(materiaId) },
      data: { profesorId: null }
    });
    res.json({ message: 'Profesor desasignado', materia });
  } catch (error) {
    res.status(500).json({ error: 'Error al desasignar profesor' });
  }
};

// Quita el rol de docente principal de un curso (limpia profesorPrincipalId en
// todas sus materias Práctica/Teoría).
export const desasignarProfesorPrincipal = async (req: Request, res: Response) => {
  const { cursoId } = req.body;
  try {
    await prisma.materia.updateMany({
      where: { cursoId: Number(cursoId) },
      data: { profesorPrincipalId: null }
    });
    res.json({ message: 'Profesor principal desasignado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desasignar profesor principal' });
  }
};

export const getCursosConSubmaterias = async (req: Request, res: Response) => {
  const { profesorId } = req.params;
  try {
    const submaterias = await prisma.materia.findMany({
      where: { profesorId: Number(profesorId), esSubmateria: true },
      include: { curso: true },
      distinct: ['cursoId']
    });
    const cursos = submaterias.map(s => s.curso);
    res.json(cursos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

export const getMisMateria = async (req: Request, res: Response) => {
  const { profesorId } = req.params;
  try {
    const id = Number(profesorId);

      const materias = await prisma.materia.findMany({
        where: { profesorId: id },
        include: { curso: true },
        orderBy: [{ nombre: 'asc' }, { materiaParent: 'asc' }]
      });

    const materiasComoProfesorPrincipal = await prisma.materia.findMany({
      where: { profesorPrincipalId: id },
      select: { cursoId: true }
    });

    const cursosConProfesorPrincipal = new Set(
      materiasComoProfesorPrincipal.map(m => m.cursoId)
    );

    console.log('cursosConProfesorPrincipal:', Array.from(cursosConProfesorPrincipal));

    const primerasSubmaterias: { [cursoId: number]: number } = {};
    if (cursosConProfesorPrincipal.size > 0) {
      const submaterias = await prisma.materia.findMany({
        where: {
          cursoId: { in: Array.from(cursosConProfesorPrincipal) },
          esSubmateria: true,
          profesorId: id
        },
        orderBy: { id: 'asc' }
      });

      console.log('submaterias encontradas:', submaterias.map(s => ({ id: s.id, nombre: s.nombre, cursoId: s.cursoId })));

      submaterias.forEach(s => {
        if (!primerasSubmaterias[s.cursoId]) {
          primerasSubmaterias[s.cursoId] = s.id;
        }
      });
    }

    console.log('primerasSubmaterias:', primerasSubmaterias);

    const materiasConInfo = materias.map(m => ({
      ...m,
      esProfesorPrincipalEnCurso: cursosConProfesorPrincipal.has(m.cursoId),
      tieneDisciplina: primerasSubmaterias[m.cursoId] === m.id
    }));

    res.json(materiasConInfo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener materias' });
  }
};

export const getPerfilEstudiante = async (req: Request, res: Response) => {
  const { usuarioId } = req.params;
  try {
    const matricula = await prisma.matricula.findFirst({
      where: { usuarioId: Number(usuarioId) },
      include: {
        curso: { include: { materias: true } },
        notasTarea: {
          include: { tarea: { include: { materia: true } } }
        },
        notasDisciplina: true
      }
    });
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });
    res.json(matricula);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};