import jwt from 'jsonwebtoken';

/**
 * Genera un token JWT de admin para pruebas LOCALES. Usa el mismo secreto que
 * el backend en local (JWT_SECRET o el fallback 'secreto'). Válido 24h.
 * El id 1 corresponde al admin sembrado (admin@cfguadalupana.com).
 */
const token = jwt.sign(
  { id: 1, rol: 'ADMIN' },
  process.env.JWT_SECRET || 'secreto',
  { expiresIn: '24h' }
);

console.log('\nTOKEN LOCAL (admin, 24h):\n');
console.log(token);
console.log('');
