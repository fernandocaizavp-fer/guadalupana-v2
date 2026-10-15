import { calcularDisciplinaPonderada, NotaDisciplinaConMateria } from './disciplina';

// Ingreso rápido masivo: las notas que el administrador escribe a mano en
// Configuración tienen prioridad, casilla por casilla, sobre lo calculado desde
// tareas, listas de asistencia o exámenes por materia. Donde no hay registro
// rápido, los AL siguen usando el flujo normal sin cambios.

export const MATERIAS_GLOBALES = [
  'TEORIA', 'PRACTICA', 'ADMINISTRACION', 'CONTABILIDAD', 'TICS',
  'INGLES', 'DESARROLLO', 'PROYECTOS', 'LEGISLACION', 'DISCIPLINA'
] as const;

export type ClaveMateria = typeof MATERIAS_GLOBALES[number];

// Materias del AL23 (examen de grado): todas menos Elaboración de Proyectos.
export const MATERIAS_EXAMEN: ClaveMateria[] = MATERIAS_GLOBALES.filter((m) => m !== 'PROYECTOS');

interface ConNotasGlobales {
  notasGlobales?: { materia: string; semestre: number; nota: number }[];
}

interface ConExamenesGlobales {
  examenesGlobales?: { materia: string; nota: number }[];
}

// Los AL buscan las materias por fragmentos de nombre ('Inglés', 'Elaboración'...).
// Este mapa traduce esos fragmentos a la clave fija del ingreso rápido.
const FRAGMENTOS: [string, ClaveMateria][] = [
  ['teoría', 'TEORIA'],
  ['práctica', 'PRACTICA'],
  ['administración', 'ADMINISTRACION'],
  ['contabilidad', 'CONTABILIDAD'],
  ['tics', 'TICS'],
  ['inglés', 'INGLES'],
  ['desarrollo', 'DESARROLLO'],
  ['elaboración', 'PROYECTOS'],
  ['legislación', 'LEGISLACION'],
  ['disciplina', 'DISCIPLINA']
];

export const claveMateria = (nombre: string): ClaveMateria | null => {
  const texto = nombre.toLowerCase();
  return FRAGMENTOS.find(([fragmento]) => texto.includes(fragmento))?.[1] ?? null;
};

// Nota rápida de una materia en un semestre, o null si no se registró.
export const notaGlobal = (
  matricula: ConNotasGlobales, clave: ClaveMateria | null, semestre: number
): number | null => {
  if (!clave) return null;
  const registro = matricula.notasGlobales?.find((n) => n.materia === clave && n.semestre === semestre);
  return registro ? registro.nota : null;
};

// Promedio de las notas rápidas de ambos semestres (AL14 sin semestre elegido).
export const notaGlobalAnual = (matricula: ConNotasGlobales, clave: ClaveMateria | null): number | null => {
  const valores = [notaGlobal(matricula, clave, 1), notaGlobal(matricula, clave, 2)]
    .filter((v) => v !== null) as number[];
  return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
};

export const examenGlobal = (matricula: ConExamenesGlobales, clave: ClaveMateria): number | null => {
  const registro = matricula.examenesGlobales?.find((e) => e.materia === clave);
  return registro ? registro.nota : null;
};

// Disciplina de un semestre: la nota rápida si existe; si no, la doble ponderación normal.
export const disciplinaSemestre = (
  matricula: ConNotasGlobales & { notasDisciplina?: NotaDisciplinaConMateria[] }, semestre: number
): number | null => {
  const rapida = notaGlobal(matricula, 'DISCIPLINA', semestre);
  if (rapida !== null) return rapida;
  return calcularDisciplinaPonderada(
    (matricula.notasDisciplina || []).filter((n) => (n.semestre || 1) === semestre)
  );
};

// Disciplina anual (AL15, AL16, AL23): promedio de los semestres presentes,
// igual que calcularDisciplinaAnual pero respetando las notas rápidas.
export const disciplinaAnual = (
  matricula: ConNotasGlobales & { notasDisciplina?: NotaDisciplinaConMateria[] }
): number | null => {
  const presentes = [disciplinaSemestre(matricula, 1), disciplinaSemestre(matricula, 2)]
    .filter((v) => v !== null) as number[];
  return presentes.length > 0 ? presentes.reduce((a, b) => a + b, 0) / presentes.length : null;
};
