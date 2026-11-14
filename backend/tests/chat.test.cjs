const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Pruebas unitarias de validación y reglas de negocio del módulo de Chat
describe('Reglas de validación del Chat Institucional', () => {
  const validarContenido = (texto) => {
    const t = String(texto || '').trim();
    if (!t) return { valido: false, error: 'El mensaje no puede estar vacío' };
    if (t.length > 2000) return { valido: false, error: 'El mensaje supera el límite de 2000 caracteres' };
    return { valido: true, texto: t };
  };

  const validarDestinatario = (remitenteId, destinatarioId) => {
    const dest = Number(destinatarioId);
    if (!dest || isNaN(dest)) return { valido: false, error: 'Destinatario inválido' };
    if (dest === Number(remitenteId)) return { valido: false, error: 'No puedes enviarte mensajes a ti mismo' };
    return { valido: true, destinatarioId: dest };
  };

  test('mensaje vacío o con solo espacios es rechazado', () => {
    assert.equal(validarContenido('').valido, false);
    assert.equal(validarContenido('   ').valido, false);
    assert.equal(validarContenido(null).valido, false);
  });

  test('mensaje válido conserva el texto recortado', () => {
    const res = validarContenido('  Hola profesor, tengo una duda sobre la tarea  ');
    assert.equal(res.valido, true);
    assert.equal(res.texto, 'Hola profesor, tengo una duda sobre la tarea');
  });

  test('mensaje de más de 2000 caracteres es rechazado', () => {
    const largo = 'a'.repeat(2001);
    assert.equal(validarContenido(largo).valido, false);
  });

  test('no se permite enviar mensajes a uno mismo', () => {
    assert.equal(validarDestinatario(5, 5).valido, false);
  });

  test('destinatario inválido o no numérico es rechazado', () => {
    assert.equal(validarDestinatario(5, 'abc').valido, false);
    assert.equal(validarDestinatario(5, null).valido, false);
  });

  test('destinatario válido es aceptado', () => {
    assert.equal(validarDestinatario(5, 10).valido, true);
  });
});

describe('Prioridad y ordenación de contactos en Chat', () => {
  test('los contactos con mensajes no leídos se ordenan primero', () => {
    const contactos = [
      { id: 1, nombre: 'Ana', noLeidos: 0, ultimoMensaje: { fecha: '2026-11-14T01:00:00Z' } },
      { id: 2, nombre: 'Carlos', noLeidos: 2, ultimoMensaje: { fecha: '2026-11-14T00:30:00Z' } },
      { id: 3, nombre: 'Beatriz', noLeidos: 0, ultimoMensaje: { fecha: '2026-11-14T02:00:00Z' } }
    ];

    contactos.sort((a, b) => {
      if (a.noLeidos > 0 && b.noLeidos === 0) return -1;
      if (b.noLeidos > 0 && a.noLeidos === 0) return 1;
      const fechaA = a.ultimoMensaje ? new Date(a.ultimoMensaje.fecha).getTime() : 0;
      const fechaB = b.ultimoMensaje ? new Date(b.ultimoMensaje.fecha).getTime() : 0;
      return fechaB - fechaA;
    });

    assert.equal(contactos[0].id, 2, 'El contacto con no leídos debe ir primero');
    assert.equal(contactos[1].id, 3, 'Luego por fecha más reciente');
    assert.equal(contactos[2].id, 1);
  });
});
