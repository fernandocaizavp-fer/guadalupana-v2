import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Perfil que el usuario eligió en la pantalla de login → rol que le corresponde.
const ROL_DEL_PERFIL: Record<string, { rol: string; nombre: string }> = {
  ESTUDIANTE: { rol: 'ESTUDIANTE', nombre: 'Estudiante' },
  DOCENTE: { rol: 'PROFESOR', nombre: 'Docente' },
  ADMINISTRATIVO: { rol: 'ADMIN', nombre: 'Administrativo' }
};

export const login = async (req: Request, res: Response) => {
  const { correo, password, perfil } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // El usuario debe entrar por el perfil que le corresponde (p. ej. un
    // estudiante no puede usar la entrada de docentes). Se valida después de la
    // contraseña para no revelar a un tercero el rol de una cuenta ajena. Lo que
    // cada rol puede hacer lo siguen decidiendo los middlewares de cada ruta.
    if (perfil !== undefined) {
      const esperado = ROL_DEL_PERFIL[String(perfil)];
      if (!esperado) return res.status(400).json({ error: 'Perfil de acceso no válido' });
      if (usuario.rol !== esperado.rol) {
        return res.status(403).json({
          error: `Por favor, elija el perfil correcto. Usted no es ${esperado.nombre}`
        });
      }
    }

    // Un estudiante eliminado no se borra (borrado lógico: su matrícula queda
    // archivada para conservar notas y certificados), pero ya no puede entrar.
    // Se comprueba después de la contraseña para no revelar a un tercero el
    // estado de una cuenta ajena.
    if (usuario.rol === 'ESTUDIANTE') {
      const matricula = await prisma.matricula.findUnique({
        where: { usuarioId: usuario.id },
        select: { activo: true }
      });
      if (!usuario.activo || !matricula?.activo) {
        return res.status(403).json({
          error: 'Tu matrícula no está activa. Comunícate con la secretaría del centro.'
        });
      }
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, debeCambiarPassword: usuario.debeCambiarPassword, fotoUrl: usuario.fotoUrl } });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

export const crearAdmin = async (req: Request, res: Response) => {
  const { nombre, apellido, correo, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { nombre, apellido, correo, password: hash, rol: 'ADMIN', debeCambiarPassword: false }
    });
    res.json({ message: 'Admin creado', usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear admin' });
  }
};

export const cambiarPassword = async (req: Request, res: Response) => {
  const { usuarioId, passwordActual, passwordNueva } = req.body;

  // Validaciones de seguridad de la nueva contraseña
  if (!passwordNueva || passwordNueva.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!/[A-Z]/.test(passwordNueva)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos una mayúscula' });
  }
  if (!/[0-9]/.test(passwordNueva)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos un número' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: Number(usuarioId) } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valido = await bcrypt.compare(passwordActual, usuario.password);
    if (!valido) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

    const hash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { id: Number(usuarioId) },
      data: { password: hash, debeCambiarPassword: false }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
};

export const solicitarRecuperacion = async (req: Request, res: Response) => {
  const { correo } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } });
    if (!usuario) return res.status(404).json({ error: 'No existe una cuenta con ese correo' });

    // Genera código de 6 dígitos
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.recuperacionPassword.create({
      data: { correo: correo.toLowerCase(), codigo, expira }
    });

    // Devuelve el código y el nombre para que el frontend lo envíe por EmailJS
    res.json({
      message: 'Código generado',
      codigo,
      nombre: usuario.nombre
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al solicitar recuperación' });
  }
};

export const restablecerPassword = async (req: Request, res: Response) => {
  const { correo, codigo, passwordNueva } = req.body;

  // Validaciones de la nueva contraseña
  if (!passwordNueva || passwordNueva.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!/[A-Z]/.test(passwordNueva)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos una mayúscula' });
  }
  if (!/[0-9]/.test(passwordNueva)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos un número' });
  }

  try {
    const registro = await prisma.recuperacionPassword.findFirst({
      where: {
        correo: correo.toLowerCase(),
        codigo,
        usado: false,
        expira: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!registro) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const hash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { correo: correo.toLowerCase() },
      data: { password: hash, debeCambiarPassword: false }
    });

    await prisma.recuperacionPassword.update({
      where: { id: registro.id },
      data: { usado: true }
    });

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};