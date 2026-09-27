import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verificarToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const soloAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.usuario.rol !== 'ADMIN') return res.status(403).json({ error: 'Solo administradores' });
  next();
};

// Permite el acceso solo a los roles indicados (ej: soloRoles('ADMIN', 'PROFESOR'))
export const soloRoles = (...roles: string[]) => (req: any, res: Response, next: NextFunction) => {
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'No autorizado para esta operación' });
  }
  next();
};