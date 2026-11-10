// Validación de crear/editar tarea (sin base de datos).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { errorDeTarea } = require('../src/controllers/tarea.controller');

describe('Validación de tareas', () => {
  const valida = { nombre: 'Speaking', fechaInicio: '2026-11-10', semestre: 1 };

  test('una tarea completa es válida', () => {
    assert.equal(errorDeTarea(valida, true), null);
  });

  test('nombre obligatorio y máximo 150 caracteres', () => {
    assert.match(errorDeTarea({ ...valida, nombre: '  ' }, true), /obligatorio/);
    assert.match(errorDeTarea({ ...valida, nombre: 'x'.repeat(151) }, true), /demasiado largo/);
    assert.equal(errorDeTarea({ ...valida, nombre: 'x'.repeat(150) }, true), null);
  });

  test('fecha de inicio obligatoria y válida al crear', () => {
    assert.match(errorDeTarea({ ...valida, fechaInicio: '' }, true), /fecha de inicio/);
    assert.match(errorDeTarea({ ...valida, fechaInicio: 'mañana' }, true), /fecha de inicio/);
  });

  test('la fecha límite no puede ser anterior a la de inicio', () => {
    assert.match(errorDeTarea({ ...valida, fechaFin: '2026-11-01' }, true), /anterior/);
    assert.equal(errorDeTarea({ ...valida, fechaFin: '2026-11-20' }, true), null);
  });

  test('semestre 1 o 2 al crear', () => {
    assert.match(errorDeTarea({ ...valida, semestre: 3 }, true), /semestre/);
    assert.match(errorDeTarea({ ...valida, semestre: undefined }, true), /semestre/);
  });

  test('al editar solo se validan los campos enviados', () => {
    assert.equal(errorDeTarea({ descripcion: 'nueva' }, false), null);
    assert.match(errorDeTarea({ nombre: '' }, false), /obligatorio/);
  });
});
