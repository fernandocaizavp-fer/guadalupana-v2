// Cálculo de la nota de disciplina con doble ponderación:
// Nivel 1: promedio de las notas de submaterias agrupadas por parent (Práctica y Teoría).
// Nivel 2: promedio de [dPráctica, dTeoría, nota de cada materia normal].
// Las notas guardadas sobre las materias principales 'Práctica'/'Teoría' (datos antiguos
// del esquema anterior, compartidas entre profesores) se excluyen del cálculo.

export interface NotaDisciplinaConMateria {
  valor: number;
  semestre: number;
  materia: {
    nombre: string;
    esSubmateria: boolean;
    materiaParent: string | null;
  };
}

const promedio = (valores: number[]): number | null =>
  valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

// Doble ponderación sobre un conjunto de notas (de un mismo semestre)
export const calcularDisciplinaPonderada = (notas: NotaDisciplinaConMateria[]): number | null => {
  const validas = notas.filter(n =>
    n.valor !== null &&
    n.materia &&
    // Excluir materias principales Práctica/Teoría (datos antiguos compartidos)
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
};

// Para documentos anuales (AL15, AL23): pondera cada semestre y promedia los presentes
export const calcularDisciplinaAnual = (notas: NotaDisciplinaConMateria[]): number | null => {
  const sem1 = calcularDisciplinaPonderada(notas.filter(n => (n.semestre || 1) === 1));
  const sem2 = calcularDisciplinaPonderada(notas.filter(n => (n.semestre || 1) === 2));
  const presentes = [sem1, sem2].filter(v => v !== null) as number[];
  return promedio(presentes);
};
