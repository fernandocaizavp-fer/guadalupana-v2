// Reglas de cálculo que alimentan los documentos oficiales AL (AL14, AL15, AL16,
// AL19, AL22, AL23). Un error aquí produce un certificado con una nota falsa, por
// eso cada regla se fija con casos concretos. Sin base de datos: datos ficticios.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcularPfNum, getNota, getSupletorio, estadoAprobacion } = require('../src/controllers/supletorio.controller');
const { calcularDisciplinaPonderada, calcularDisciplinaAnual } = require('../src/lib/disciplina');
const { notaALetras } = require('../src/lib/numeroALetras');
const { claveMateria, notaGlobal, notaGlobalAnual, disciplinaSemestre, disciplinaAnual } = require('../src/lib/registro-global');
const { notaEnRango, primeraNotaFueraDeRango, ventanaAbierta, vigenteHasta } = require('../src/lib/configuracion');

const cerca = (real, esperado) => assert.ok(Math.abs(real - esperado) < 1e-9, `${real} ≠ ${esperado}`);

describe('Nota final de una materia (AL15/AL16/AL22)', () => {
  test('sin supletorio: promedio de los dos semestres', () => {
    cerca(calcularPfNum(8, 9, null), 8.5);
  });

  test('con supletorio: promedio entre la nota anual y el supletorio', () => {
    // (6 + 7) / 2 = 6.5 → (6.5 + 9) / 2 = 7.75
    cerca(calcularPfNum(6, 7, 9), 7.75);
  });

  test('si falta un semestre no hay nota final', () => {
    assert.equal(calcularPfNum(null, 9, null), null);
    assert.equal(calcularPfNum(8, null, 10), null);
  });

  test('aprobación: 7 aprueba, menos de 7 es "NO APROBADO" (nunca "REPROBADO")', () => {
    assert.equal(estadoAprobacion(7), 'APROBADO');
    assert.equal(estadoAprobacion(6.99), 'NO APROBADO');
    assert.equal(estadoAprobacion(null), '');
    assert.equal(estadoAprobacion(7.5, 8), 'NO APROBADO', 'respeta la nota de aprobación configurada');
  });
});

describe('Origen de la nota por semestre', () => {
  const matricula = {
    notasGlobales: [{ materia: 'INGLES', semestre: 1, nota: 9.5 }],
    notasTarea: [
      { valor: 6, tarea: { semestre: 1, materia: { nombre: 'Inglés Técnico' } } },
      { valor: 8, tarea: { semestre: 2, materia: { nombre: 'Inglés Técnico' } } },
      { valor: 10, tarea: { semestre: 2, materia: { nombre: 'Inglés Técnico' } } },
      { valor: null, tarea: { semestre: 2, materia: { nombre: 'Inglés Técnico' } } },
      { valor: 4, tarea: { semestre: 2, materia: { nombre: 'Contabilidad' } } }
    ],
    supletorios: [{ valor: 8, materia: { nombre: 'Contabilidad General' } }]
  };

  test('el ingreso rápido tiene prioridad sobre las tareas', () => {
    assert.equal(getNota(matricula, 'Inglés', 1), 9.5);
  });

  test('sin valor rápido: promedio de tareas de esa materia y semestre, ignorando las vacías', () => {
    assert.equal(getNota(matricula, 'Inglés', 2), 9);
  });

  test('sin tareas ni valor rápido: null (casilla vacía en el AL)', () => {
    assert.equal(getNota(matricula, 'Legislación', 1), null);
  });

  test('supletorio de la materia, o null si no rindió', () => {
    assert.equal(getSupletorio(matricula, 'Contabilidad'), 8);
    assert.equal(getSupletorio(matricula, 'Inglés'), null);
  });

  test('los nombres de los AL se traducen a la clave del ingreso rápido', () => {
    assert.equal(claveMateria('Inglés Técnico'), 'INGLES');
    assert.equal(claveMateria('Elaboración de Proyectos'), 'PROYECTOS');
    assert.equal(claveMateria('TICs'), 'TICS');
    assert.equal(claveMateria('Materia desconocida'), null);
  });

  test('nota rápida anual: promedio de los semestres registrados', () => {
    const m = { notasGlobales: [{ materia: 'TICS', semestre: 1, nota: 8 }, { materia: 'TICS', semestre: 2, nota: 10 }] };
    assert.equal(notaGlobalAnual(m, 'TICS'), 9);
    assert.equal(notaGlobal(m, 'TICS', 2), 10);
    assert.equal(notaGlobalAnual({ notasGlobales: [] }, 'TICS'), null);
  });
});

describe('Disciplina con doble ponderación', () => {
  const nota = (valor, nombre, parent, semestre = 1) => ({
    valor, semestre, materia: { nombre, esSubmateria: parent !== null, materiaParent: parent }
  });

  const semestre1 = [
    nota(8, 'Corte', 'Práctica'),      // Práctica: promedio (8 + 10) = 9
    nota(10, 'Confección', 'Práctica'),
    nota(6, 'Corte', 'Teoría'),        // Teoría: 6
    nota(9, 'Inglés', null),           // materia normal: 9
    nota(1, 'Práctica', null)          // dato antiguo sobre la materia principal: se excluye
  ];

  test('promedio de [Práctica, Teoría, cada materia normal]', () => {
    // (9 + 6 + 9) / 3 = 8; si contara la nota 1 de la materia principal saldría otra cifra
    assert.equal(calcularDisciplinaPonderada(semestre1), 8);
  });

  test('una submateria pesa lo mismo que una materia normal solo a través de su grupo', () => {
    // Tres submaterias de Práctica no "valen triple": su grupo cuenta una vez.
    const notas = [nota(10, 'A', 'Práctica'), nota(10, 'B', 'Práctica'), nota(10, 'C', 'Práctica'), nota(4, 'Inglés', null)];
    assert.equal(calcularDisciplinaPonderada(notas), 7);
  });

  test('sin notas: null', () => {
    assert.equal(calcularDisciplinaPonderada([]), null);
  });

  test('anual: promedio de los semestres que tienen nota', () => {
    const notas = [...semestre1, nota(10, 'Inglés', null, 2)];
    assert.equal(calcularDisciplinaAnual(notas), 9);   // (8 + 10) / 2
    assert.equal(calcularDisciplinaAnual(semestre1), 8); // solo el primer semestre
  });

  test('el valor del ingreso rápido reemplaza solo la ponderación de su semestre', () => {
    const m = { notasGlobales: [{ materia: 'DISCIPLINA', semestre: 2, nota: 6 }], notasDisciplina: semestre1 };
    assert.equal(disciplinaSemestre(m, 1), 8);
    assert.equal(disciplinaSemestre(m, 2), 6);
    assert.equal(disciplinaAnual(m), 7);
  });
});

describe('Notas en letras (certificados)', () => {
  test('formato "coma" con la primera letra en mayúscula', () => {
    assert.equal(notaALetras(8.5), 'Ocho coma cincuenta');
    assert.equal(notaALetras(7.25), 'Siete coma veinticinco');
    assert.equal(notaALetras(9), 'Nueve');
    assert.equal(notaALetras(10), 'Diez');
  });

  test('redondeo que desborda a la unidad siguiente', () => {
    assert.equal(notaALetras(9.999), 'Diez');
  });

  test('mayúsculas para disciplina y promedio general', () => {
    assert.equal(notaALetras(8.5, true), 'OCHO COMA CINCUENTA');
  });

  test('sin nota: texto vacío', () => {
    assert.equal(notaALetras(null), '');
    assert.equal(notaALetras(undefined), '');
  });
});

describe('Rango de notas y ventanas de fechas', () => {
  const rango = { notaMinima: 0, notaMaxima: 10 };

  test('rango inclusivo en ambos extremos', () => {
    assert.ok(notaEnRango(0, rango));
    assert.ok(notaEnRango(10, rango));
    assert.ok(!notaEnRango(10.01, rango));
    assert.ok(!notaEnRango(-1, rango));
  });

  test('devuelve la primera nota fuera de rango e ignora las vacías', () => {
    assert.equal(primeraNotaFueraDeRango([5, null, 11, -2], rango), 11);
    assert.equal(primeraNotaFueraDeRango([5, undefined, 10], rango), null);
  });

  // Días en hora de Ecuador (UTC-5) guardados como medianoche UTC, igual que la configuración.
  const dia = (desplazamiento) => {
    const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const d = new Date(hoy + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + desplazamiento);
    return d;
  };

  test('ventana abierta si hoy está entre inicio y fin (inclusivos)', () => {
    assert.ok(ventanaAbierta(dia(-1), dia(1)));
    assert.ok(ventanaAbierta(dia(0), dia(0)), 'el último día cuenta completo');
    assert.ok(!ventanaAbierta(dia(1), dia(3)), 'aún no empieza');
    assert.ok(!ventanaAbierta(dia(-3), dia(-1)), 'ya terminó');
    assert.ok(!ventanaAbierta(null, null), 'sin período definido está cerrada');
  });

  test('permiso individual vigente hasta el día indicado, inclusive', () => {
    assert.ok(vigenteHasta(dia(0)));
    assert.ok(!vigenteHasta(dia(-1)));
    assert.ok(!vigenteHasta(null));
  });
});
