import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export const login = async (req: Request, res: Response) => {
  const { correo, password } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, debeCambiarPassword: usuario.debeCambiarPassword } });
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