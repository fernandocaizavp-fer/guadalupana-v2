import { esCedulaEcuatoriana, normalizarDocumento, PATRON_DOCUMENTO } from './documento-identidad';

describe('documento-identidad', () => {
  it('quita espacios y pasa a mayúsculas', () => {
    expect(normalizarDocumento(' fb 603825 ')).toBe('FB603825');
    expect(normalizarDocumento('0604123456')).toBe('0604123456');
    expect(normalizarDocumento(undefined)).toBe('');
  });

  it('solo acepta letras y números', () => {
    expect(PATRON_DOCUMENTO.test('FB603825')).toBe(true);
    expect(PATRON_DOCUMENTO.test('FB-603825')).toBe(false);
  });

  it('la lupa solo consulta cédulas ecuatorianas de 10 dígitos', () => {
    expect(esCedulaEcuatoriana('0604123456')).toBe(true);
    expect(esCedulaEcuatoriana('FB603825')).toBe(false);
  });
});
