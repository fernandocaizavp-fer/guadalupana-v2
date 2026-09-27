const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. Configura backend/.env antes de ejecutar este script.');
  }

  const prisma = new PrismaClient();
  try {
    const correo = 'admin@guadalupana.com';
    const existente = await prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, rol: true, activo: true },
    });

    if (existente) {
      if (existente.rol !== 'ADMIN' || !existente.activo) {
        throw new Error('El correo ya pertenece a una cuenta sin acceso de administrador activo. Revisa esa cuenta.');
      }
      console.log(`Ya existe el administrador ${correo}. Su clave no se ha modificado.`);
      return;
    }

    const passwordTemporal = `Gua!7${randomBytes(16).toString('hex')}`;
    const hash = await bcrypt.hash(passwordTemporal, 10);
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        apellido: 'Guadalupana',
        correo,
        password: hash,
        rol: 'ADMIN',
        activo: true,
        debeCambiarPassword: true,
      },
      select: { id: true, correo: true },
    });

    console.log(`Administrador creado correctamente (ID: ${admin.id}).`);
    console.log(`Correo: ${admin.correo}`);
    console.log(`Contrasena temporal: ${passwordTemporal}`);
    console.log('Guarda esta clave. El sistema te pedira cambiarla al iniciar sesion.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo crear el administrador:', error.message);
  process.exitCode = 1;
});
