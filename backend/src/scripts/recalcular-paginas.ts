// Script único (idempotente) para recalcular la PÁGINA de las matrículas ya
// existentes con la fórmula oficial: pagina = (matriculaNo * 2) - 1  -> 1,3,5,...
// El tomo NO se modifica. Ejecutar apuntando al DATABASE_URL correspondiente:
//   npx ts-node src/scripts/recalcular-paginas.ts
// (para producción, exportar temporalmente el DATABASE_URL de Railway).
import prisma from '../lib/prisma';

async function main() {
  const matriculas = await prisma.matricula.findMany({
    select: { id: true, matriculaNo: true, pagina: true }
  });

  let actualizadas = 0;
  for (const m of matriculas) {
    const n = parseInt(m.matriculaNo, 10) || 0;
    if (!n) continue;
    const nuevaPagina = String(n * 2 - 1);
    if (m.pagina !== nuevaPagina) {
      await prisma.matricula.update({
        where: { id: m.id },
        data: { pagina: nuevaPagina }
      });
      actualizadas++;
    }
  }

  console.log(`Páginas recalculadas: ${actualizadas} de ${matriculas.length} matrículas.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
