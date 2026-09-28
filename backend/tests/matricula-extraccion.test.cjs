const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const { validarTextoExtraccion, validarDatosExtraidos, CAMPOS_EXTRACCION } = require('../src/lib/matricula-extraccion');
const controller = require('../src/controllers/matricula-extraccion.controller');
const { verificarToken, soloAdmin } = require('../src/middlewares/auth.middleware');

// Solo datos ficticios, proveedor simulado y ningún acceso a la base.
let llamadas = 0;
let generar = async () => '{"nombres":"Ana","cedula":"0012345678","nombrepapa":"Luis"}';
controller.extraerDatosMatricula = controller.crearExtraerDatosMatricula(async texto => { llamadas++; return generar(texto); });
const matriculaRoutes = require('../src/routes/matricula.routes').default;
let server, base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/matriculas', matriculaRoutes);
  app.post('/configuracion-ausente', verificarToken, soloAdmin, controller.crearExtraerDatosMatricula());
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const token = rol => jwt.sign({ id: 1, rol }, process.env.JWT_SECRET || 'secreto', { expiresIn: '5m' });
async function request(body, rol = 'ADMIN', url = '/api/matriculas/extraer-datos') {
  const response = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(rol ? { Authorization: 'Bearer ' + token(rol) } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
test('contrato: los campos extraíbles existen en el formulario y sus tablas Prisma', () => {
  const form = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/services/matricula-datos.ts'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');
  assert.equal(Object.keys(CAMPOS_EXTRACCION).length, 37);
  for (const campo of Object.keys(CAMPOS_EXTRACCION)) {
    assert.match(form, new RegExp('\\b' + campo + ':'));
    assert.match(schema, new RegExp('\\b' + campo + '\\s+'));
  }
});
test('texto vacío, no textual o excesivo devuelve error 400', () => {
  for (const body of [null, {}, { texto: 5 }, { texto: '  ' }, { texto: 'x'.repeat(12001) }]) {
    assert.throws(() => validarTextoExtraccion(body), e => e.status === 400);
  }
});
test('filtra claves no autorizadas, nulls y conserva ceros iniciales', () => {
  const result = validarDatosExtraidos(JSON.parse('{"cedula":"0012345678","telefono":"0990000000","cursoId":7,"rol":"ADMIN","nombres":null,"__proto__":{"polluted":true}}'));
  assert.deepEqual(result, { cedula: '0012345678', telefono: '0990000000' });
  assert.equal({}.polluted, undefined);
});
test('rechaza fechas imposibles, opciones inválidas, tipos y longitudes', () => {
  for (const data of [{ fechaNacimiento: '2023-02-29' }, { fechaNacimiento: '03/04/2001' }, { sexo: 'inventado' }, { nivelEstudio: 'bachiller' }, { correoestudiante: 'no-es-correo' }, { nombres: 123 }, { cedula: '12345678901' }, { nombres: 'x'.repeat(101) }]) {
    assert.throws(() => validarDatosExtraidos(data), e => e.status === 502);
  }
  assert.deepEqual(validarDatosExtraidos({ fechaNacimiento: '2004-02-29' }), { fechaNacimiento: '2004-02-29' });
  assert.throws(() => validarDatosExtraidos({ nombres: null }), e => e.status === 422);
});
test('la ruta real requiere JWT y rol ADMIN antes de usar el proveedor', async () => {
  const antes = llamadas;
  assert.equal((await request({ texto: 'Ana' }, null)).status, 401);
  assert.equal((await request({ texto: 'Ana' }, 'PROFESOR')).status, 403);
  assert.equal((await request({ texto: 'Ana' }, 'ESTUDIANTE')).status, 403);
  assert.equal(llamadas, antes);
});
test('la ruta real devuelve el JSON plano, sin persistir matrícula', async () => {
  const response = await request({ texto: 'La estudiante Ana tiene cédula 0012345678. Su padre es Luis.' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { nombres: 'Ana', cedula: '0012345678', nombrepapa: 'Luis' });
});
test('entrada inválida no invoca Gemini', async () => {
  const antes = llamadas;
  assert.equal((await request({ texto: '  ' })).status, 400);
  assert.equal(llamadas, antes);
});
test('JSON inválido y respuesta vacía no llegan al formulario', async () => {
  const anterior = generar;
  try {
    generar = async () => 'no-json';
    assert.equal((await request({ texto: 'datos' })).status, 502);
    generar = async () => '{}';
    assert.equal((await request({ texto: 'datos' })).status, 422);
  } finally { generar = anterior; }
});
test('cuota, modelo inaccesible y timeout dan errores controlados sin filtrar secretos', async () => {
  const anterior = generar;
  try {
    for (const [status, esperado] of [[429, 429], [403, 503], [404, 503], [503, 503], [504, 504], [500, 502]]) {
      generar = async () => { throw { status, message: 'CLAVE_PRIVADA_Y_DATOS' }; };
      const response = await request({ texto: 'Ana' });
      assert.equal(response.status, esperado);
      assert.equal(JSON.stringify(response.body).includes('CLAVE_PRIVADA_Y_DATOS'), false);
    }
  } finally { generar = anterior; }
});
test('el marcador de API Key devuelve 503 sin llamar a Google', async () => {
  const anterior = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'REEMPLAZA_ESTE_TEXTO_CON_TU_CLAVE';
  try {
    const response = await request({ texto: 'Ana' }, 'ADMIN', '/configuracion-ausente');
    assert.equal(response.status, 503);
    assert.match(response.body.error, /GEMINI_API_KEY/);
  } finally { if (anterior === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = anterior; }
});
