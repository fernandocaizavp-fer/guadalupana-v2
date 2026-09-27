import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

/**
 * Seed de bootstrap del primer administrador.
 *
 * Diseño:
 * - Idempotente: solo crea un ADMIN si NO existe ya ningún usuario con rol ADMIN.
 *   Si ya hay uno, no hace nada (nunca duplica).
 * - Credenciales por variables de entorno (ADMIN_CORREO, ADMIN_PASSWORD); nunca
 *   se escriben en el código.
 * - Nunca tumba el arranque: ante credenciales faltantes o errores, registra el
 *   motivo y termina con exit(0). El endpoint /api/auth/crear-admin (protegido con
 *   soloAdmin) sigue siendo la vía para crear administradores adicionales.
 */
async function main() {
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE?.trim() || 'Admin';
  const apellido = process.env.ADMIN_APELLIDO?.trim() || 'Principal';

  if (!correo || !password) {
    console.warn(
      '[seed] ADMIN_CORREO y/o ADMIN_PASSWORD no están definidos. Se omite la creación del admin de bootstrap.'
    );
    return;
  }

  const adminsExistentes = await prisma.usuario.count({ where: { rol: 'ADMIN' } });
  if (adminsExistentes > 0) {
    console.log(`[seed] Ya existe(n) ${adminsExistentes} administrador(es). No se crea nada.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      correo,
      password: hash,
      rol: 'ADMIN',
      debeCambiarPassword: false,
    },
  });

  console.log(`[seed] Administrador de bootstrap creado: ${usuario.correo} (id ${usuario.id}).`);
}

main()
  .catch((error) => {
    // No interrumpimos el despliegue: registramos el problema y dejamos que el
    // servidor arranque igualmente.
    console.error('[seed] Error al ejecutar el seed de bootstrap:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
