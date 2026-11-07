// Autenticación, autorización por rol y por materia, y manejo de errores de la API.
// Las rutas de prueba se montan con los middlewares reales; no hay base de datos.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { verificarToken, soloAdmin, soloRoles } = require('../src/middlewares/auth.middleware');
const { propioOAdmin, decidirMateriasPermitidas } = require('../src/middlewares/permisos.middleware');
const { manejadorErrores } = require('../src/middlewares/errores.middleware');
const { opcionesCors } = require('../src/lib/seguridad');

const SECRETO = process.env.JWT_SECRET || 'secreto';
const token = (datos, opciones = { expiresIn: '5m' }, secreto = SECRETO) => jwt.sign(datos, secreto, opciones);

let server, base;
before(async () => {
  const app = express();
  app.use(express.json());
  const ok = (req, res) => res.json({ ok: true, usuario: req.usuario });
  app.get('/privada', verificarToken, ok);
  app.get('/admin', verificarToken, soloAdmin, ok);
  app.get('/docencia', verificarToken, soloRoles('ADMIN', 'PROFESOR'), ok);
  app.get('/perfil/:id', verificarToken, propioOAdmin('id'), ok);
  app.post('/eco', ok);
  app.get('/falla', () => { throw new Error('error interno con datos sensibles'); });
  app.use(manejadorErrores);
  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });

async function pedir(ruta, { jwtToken, metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: {
      ...(jwtToken ? { Authorization: 'Bearer ' + jwtToken } : {}),
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: cuerpo
  });
  return { status: respuesta.status, body: await respuesta.json() };
}

describe('Autenticación con JWT', () => {
  test('sin token: 401', async () => {
    assert.equal((await pedir('/privada')).status, 401);
  });

  test('token firmado con otro secreto (manipulado): 401', async () => {
    const r = await pedir('/privada', { jwtToken: token({ id: 1, rol: 'ADMIN' }, {}, 'otro-secreto') });
    assert.equal(r.status, 401);
  });

  test('token caducado: 401', async () => {
    const caducado = token({ id: 1, rol: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 }, {});
    assert.equal((await pedir('/privada', { jwtToken: caducado })).status, 401);
  });

  test('token válido: pasa y expone el usuario del token', async () => {
    const r = await pedir('/privada', { jwtToken: token({ id: 7, rol: 'PROFESOR' }) });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.id, 7);
  });
});

describe('Autorización por rol', () => {
  test('soloAdmin rechaza a docentes y estudiantes', async () => {
    assert.equal((await pedir('/admin', { jwtToken: token({ id: 2, rol: 'PROFESOR' }) })).status, 403);
    assert.equal((await pedir('/admin', { jwtToken: token({ id: 3, rol: 'ESTUDIANTE' }) })).status, 403);
    assert.equal((await pedir('/admin', { jwtToken: token({ id: 1, rol: 'ADMIN' }) })).status, 200);
  });

  test('soloRoles(ADMIN, PROFESOR) deja fuera al estudiante', async () => {
    assert.equal((await pedir('/docencia', { jwtToken: token({ id: 2, rol: 'PROFESOR' }) })).status, 200);
    assert.equal((await pedir('/docencia', { jwtToken: token({ id: 3, rol: 'ESTUDIANTE' }) })).status, 403);
  });

  test('un estudiante solo consulta su propio id; el admin, cualquiera', async () => {
    const estudiante = token({ id: 3, rol: 'ESTUDIANTE' });
    assert.equal((await pedir('/perfil/3', { jwtToken: estudiante })).status, 200);
    assert.equal((await pedir('/perfil/4', { jwtToken: estudiante })).status, 403);
    assert.equal((await pedir('/perfil/4', { jwtToken: token({ id: 1, rol: 'ADMIN' }) })).status, 200);
  });
});

describe('Autorización por materia (docentes)', () => {
  const DOCENTE = 10;
  const materia = (id, nombre, extra = {}) => ({
    id, nombre, cursoId: 1, esSubmateria: false, profesorId: null, profesorPrincipalId: null, ...extra
  });
  const materias = [
    materia(1, 'Inglés', { profesorId: DOCENTE }),                                  // su materia
    materia(2, 'Contabilidad', { profesorId: 99 }),                                 // de otro docente
    materia(3, 'Corte', { esSubmateria: true, profesorId: 99 }),                    // gemela de una suya
    materia(4, 'Bordado', { esSubmateria: true, profesorId: 99 }),                  // submateria ajena
    materia(5, 'Práctica', {}),                                                     // contenedora
    materia(6, 'TICs', { cursoId: 2, profesorPrincipalId: DOCENTE })                // principal de esa materia
  ];

  test('docente común: solo sus materias y la gemela de su submateria', () => {
    const permitidas = decidirMateriasPermitidas(DOCENTE, materias, [{ cursoId: 1, nombre: 'Corte' }], []);
    assert.deepEqual([...permitidas].sort(), [1, 3, 6]);
  });

  test('no puede escribir en la materia de otro docente', () => {
    const permitidas = decidirMateriasPermitidas(DOCENTE, materias, [], []);
    assert.ok(!permitidas.has(2));
    assert.ok(!permitidas.has(4));
  });

  test('docente principal del curso: también Práctica/Teoría y todas las submaterias', () => {
    const permitidas = decidirMateriasPermitidas(DOCENTE, materias, [], [1]);
    assert.deepEqual([...permitidas].sort(), [1, 3, 4, 5, 6]);
    assert.ok(!permitidas.has(2), 'ser principal no da acceso a las materias normales de otros');
  });

  test('la gemela solo cuenta en el mismo curso', () => {
    const permitidas = decidirMateriasPermitidas(DOCENTE, materias, [{ cursoId: 2, nombre: 'Corte' }], []);
    assert.ok(!permitidas.has(3));
  });
});

describe('Errores y CORS', () => {
  test('JSON mal formado: 400 en JSON, sin traza', async () => {
    const r = await pedir('/eco', { metodo: 'POST', cuerpo: '{malo' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /JSON/);
  });

  test('error no controlado: 500 genérico, sin filtrar el mensaje interno', async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const r = await pedir('/falla');
      assert.equal(r.status, 500);
      assert.equal(r.body.error, 'Error interno del servidor');
    } finally {
      console.error = original;
    }
  });

  test('CORS_ORIGINS limita los orígenes; sin Origin (curl, JMeter) se permite', () => {
    const anterior = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://guadalupana.vercel.app/';
    try {
      const { origin } = opcionesCors();
      const decidir = (o) => new Promise((resolve) => origin(o, (_e, permitido) => resolve(permitido)));
      return Promise.all([
        decidir('https://guadalupana.vercel.app').then((p) => assert.equal(p, true)),
        decidir('https://sitio-malicioso.com').then((p) => assert.equal(p, false)),
        decidir('http://localhost:4200').then((p) => assert.equal(p, true)),
        decidir(undefined).then((p) => assert.equal(p, true))
      ]);
    } finally {
      if (anterior === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = anterior;
    }
  });
});
