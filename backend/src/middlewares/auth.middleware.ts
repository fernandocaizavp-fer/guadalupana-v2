import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../lib/seguridad';
import { contextoAuditoria } from '../lib/auditoria';

export const verificarToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret());
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
  req.usuario = decoded;
  // El resto de la petición corre dentro de este contexto: así la auditoría
  // sabe quién hizo cada cambio sin pasar el usuario a cada controlador.
  contextoAuditoria.run({ usuarioId: decoded?.id ?? null, rol: decoded?.rol ?? null, ip: req.ip ?? null }, () => next());
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