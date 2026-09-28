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
test('entrada inválida no invoca Groq', async () => {
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
    for (const [status, esperado] of [[429, 429], [403, 503], [404, 503], [503, 503], [408, 504], [504, 504], [500, 502]]) {
      generar = async () => { throw { status, message: 'CLAVE_PRIVADA_Y_DATOS' }; };
      const response = await request({ texto: 'Ana' });
      assert.equal(response.status, esperado);
      assert.equal(JSON.stringify(response.body).includes('CLAVE_PRIVADA_Y_DATOS'), false);
    }
  } finally { generar = anterior; }
});
test('el marcador de API Key devuelve 503 sin llamar a Groq', async () => {
  const anterior = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'REEMPLAZA_ESTE_TEXTO_CON_TU_CLAVE';
  try {
    const response = await request({ texto: 'Ana' }, 'ADMIN', '/configuracion-ausente');
    assert.equal(response.status, 503);
    assert.match(response.body.error, /GROQ_API_KEY/);
  } finally { if (anterior === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = anterior; }
});

test('el SDK de Groq envia el prompt y esquema originales en modo JSON', async () => {
  const { PROMPT_EXTRACCION, ESQUEMA_EXTRACCION } = require('../src/lib/matricula-extraccion');
  const fetchOriginal = globalThis.fetch;
  const claveAnterior = process.env.GROQ_API_KEY;
  const modeloAnterior = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = 'clave-ficticia-solo-para-test';
  delete process.env.GROQ_MODEL;
  let peticion;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url || String(input);
    if (!url.startsWith('https://api.groq.com/')) return fetchOriginal(input, init);
    peticion = JSON.parse(init.body);
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer clave-ficticia-solo-para-test');
    return new Response(JSON.stringify({
      id: 'prueba', object: 'chat.completion', created: 0, model: 'openai/gpt-oss-20b',
      choices: [{ index: 0, message: { role: 'assistant', content: '{"nombres":"Ana"}' }, finish_reason: 'stop' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    assert.equal(await controller.generarConGroq('Nombres Ana'), '{"nombres":"Ana"}');
    assert.deepEqual(peticion.response_format, { type: 'json_object' });
    assert.equal(peticion.model, 'openai/gpt-oss-20b');
    assert.equal(peticion.messages[0].content, PROMPT_EXTRACCION);
    assert.ok(peticion.messages[1].content.endsWith(JSON.stringify(ESQUEMA_EXTRACCION)));
    assert.deepEqual(peticion.messages[2], { role: 'user', content: 'Nombres Ana' });
  } finally {
    globalThis.fetch = fetchOriginal;
    if (claveAnterior === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = claveAnterior;
    if (modeloAnterior === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = modeloAnterior;
  }
});
test('el timeout propio del SDK devuelve 504 sin filtrar datos', async () => {
  const anterior = generar;
  try {
    generar = async () => { throw { name: 'APIConnectionTimeoutError', message: 'CLAVE_PRIVADA_Y_DATOS' }; };
    const response = await request({ texto: 'Ana' });
    assert.equal(response.status, 504);
    assert.equal(JSON.stringify(response.body).includes('CLAVE_PRIVADA_Y_DATOS'), false);
  } finally { generar = anterior; }
});
