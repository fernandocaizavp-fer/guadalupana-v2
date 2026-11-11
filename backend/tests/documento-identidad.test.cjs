// Cédula o pasaporte del estudiante: normalización y validación (sin base de datos).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizarDocumento, errorDeDocumento } = require('../src/lib/documento-identidad');

describe('Documento de identidad (cédula o pasaporte)', () => {
  test('una cédula ecuatoriana de 10 dígitos no cambia', () => {
    assert.equal(normalizarDocumento('0604123456'), '0604123456');
    assert.equal(errorDeDocumento('0604123456'), null);
  });

  test('quita espacios al inicio, al final y en medio', () => {
    assert.equal(normalizarDocumento(' 0604123456 '), '0604123456');
    assert.equal(normalizarDocumento('FB 603825'), 'FB603825');
    assert.equal(normalizarDocumento('\tFB603825\n'), 'FB603825');
  });

  test('un pasaporte se guarda en mayúsculas', () => {
    assert.equal(normalizarDocumento('fb603825'), 'FB603825');
    assert.equal(normalizarDocumento(' fb 603825 '), 'FB603825');
    assert.equal(errorDeDocumento('FB603825'), null);
  });

  test('vacío u otro tipo de dato es obligatorio', () => {
    assert.equal(normalizarDocumento(undefined), '');
    assert.equal(normalizarDocumento(603825), '');
    assert.match(errorDeDocumento(normalizarDocumento('   ')), /obligatoria/);
  });

  test('máximo 10 caracteres', () => {
    assert.equal(errorDeDocumento('AB12345678'), null);
    assert.match(errorDeDocumento('AB123456789'), /máximo 10/);
  });

  test('solo letras y números: guiones y símbolos se rechazan', () => {
    assert.match(errorDeDocumento(normalizarDocumento('FB-603825')), /letras y números/);
    assert.match(errorDeDocumento(normalizarDocumento('060412345.6')), /máximo 10|letras y números/);
    assert.match(errorDeDocumento('FB#60382'), /letras y números/);
  });
});
