// Cálculo de la nota de disciplina con doble ponderación (espejo del backend):
// Nivel 1: promedio de las notas de submaterias agrupadas por parent (Práctica y Teoría).
// Nivel 2: promedio de [dPráctica, dTeoría, nota de cada materia normal].
// Las notas guardadas sobre las materias principales 'Práctica'/'Teoría' (datos antiguos)
// se excluyen del cálculo. Recibe notas de UN semestre, con su materia incluida.

const promedio = (valores: number[]): number | null =>
  valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

export function calcularDisciplinaPonderada(notas: any[]): number | null {
  const validas = (notas || []).filter(n =>
    n.valor !== null &&
    n.materia &&
    !(!n.materia.esSubmateria && (n.materia.nombre === 'Práctica' || n.materia.nombre === 'Teoría'))
  );

  const dPractica = promedio(
    validas.filter(n => n.materia.esSubmateria && n.materia.materiaParent === 'Práctica').map(n => n.valor)
  );
  const dTeoria = promedio(
    validas.filter(n => n.materia.esSubmateria && n.materia.materiaParent === 'Teoría').map(n => n.valor)
  );
  const normales = validas.filter(n => !n.materia.esSubmateria).map(n => n.valor);

  const componentes = [dPractica, dTeoria, ...normales].filter(v => v !== null) as number[];
  return promedio(componentes);
}
