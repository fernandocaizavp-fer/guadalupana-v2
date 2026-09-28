# Llenado inteligente de matrículas: cambios y prueba local

## Formato de datos extraídos: cambio local del 28 de septiembre de 2026

El usuario informó en la nueva versión de `leeyejecuta.txt` que la conexión con Groq funciona y el formulario se llena. Pidió limpiar capitalización y espacios antes de aplicar los datos.

En `frontend/src/app/components/matriculas/nueva-matricula/nueva-matricula.ts` se añadió `normalizarDatosExtraidos`, invocada sobre los cambios aceptados antes de `patchValue`. Capitaliza nombres del estudiante, familiares y representante, además de país, provincia, cantón, parroquia y ciudad; conserva enlaces internos como «de la» y maneja tildes y guiones. Eleva la primera letra de profesiones y ocupaciones conservando las siglas del resto del texto. Recorta extremos y reduce espacios repetidos en todos los textos aplicados.

Ejemplos: «kaiza   VEGA» → «Kaiza Vega», «MIGUEL   ANÍBAL» → «Miguel Aníbal», «mecánico   de CNC» → «Mecánico de CNC». No intenta corregir la escritura de apellidos ni separar nombres fusionados como «aníbalcaiza»: requieren revisión humana. Se mantienen la selección de reemplazo, los campos previos, códigos, fechas y correos, sin disparar consulta de cédula ni guardado automático.

Verificación: 12 pruebas frontend aprobadas, incluidas dos comprobaciones del nuevo filtro y conservación de datos. Cambio local, sin commit, push ni despliegue en esta tarea; último commit publicado sigue siendo `fe675e1`.


## Migración a Groq publicada el 28 de septiembre de 2026

Estado más reciente: commit `fe675e1c15a2a3dfba9f8243301742e34ad93c70` enviado a `origin/main`, posterior a la versión con Gemini. Se instaló `groq-sdk`, se retiró `@google/genai` y el controlador lee `GROQ_API_KEY`. Modelo por defecto: `openai/gpt-oss-20b`, configurable con `GROQ_MODEL`. Los modelos Llama indicados en el TXT fueron retirados; el reemplazo fue explicado antes de publicar.

Se conservan sin cambios el archivo `backend/src/lib/matricula-extraccion.ts`, el System Prompt, el esquema y los validadores de datos. Groq recibe `response_format: { type: 'json_object' }`; el esquema se envía en un segundo mensaje system y se sigue validando la respuesta en el backend. Se mantienen JWT/ADMIN, timeout de 30 segundos y los códigos de error, adaptados al SDK. El aviso del modal ahora dice Groq.

Pruebas: 12 backend y 10 frontend aprobadas; TypeScript backend y build Angular de producción aprobados. La llamada REAL a Groq con la clave local y datos ficticios funcionó: devolvió nombres, apellidos, fecha de nacimiento, correo del estudiante, nivel de estudio, tipo de bachiller, nombre de madre y profesión de madre; todos pasaron la validación. No se guardaron matrículas ni se cambió Prisma.

Vercel confirmó despliegue exitoso del commit. La ruta pública /matriculas/nueva devuelve HTTP 200 y carga main-ELXRUHZT.js (HTTP 200); el bundle contiene Groq, no contiene Google Gemini y conserva /extraer-datos. Render responde 401 `Token requerido` al consultar la ruta sin JWT: está disponible, pero esa respuesta no identifica si ya ejecuta este commit. No hay acceso al panel de Render ni una sesión ADMIN de producción para confirmar su versión y una extracción completa.

Pendiente del entorno de producción: confirmar `GROQ_API_KEY` en Render → Environment, guardarla y desplegar si aún no está. `GROQ_MODEL=openai/gpt-oss-20b` es opcional porque coincide con el predeterminado. La clave de Google no sirve para Groq. Se encontró la clave Groq local configurada, pero no se copia a Git ni demuestra que exista en Render. Se pidió confirmación al usuario. Los textos posteriores que describen Gemini son históricos.


## Producción verificada el 28 de septiembre de 2026

El usuario pidió «subelo a produccion», sustituyendo la restricción anterior de solo pruebas locales. Commit publicado en origin/main: `1c79ca6f9d0862b4652390acbbdda60d5941af4e` (`feat: llenar matriculas por voz y texto con Gemini 3.8 Flash`). Incluye 18 archivos de código y pruebas; `.env`, notas locales y el TXT de instrucciones no se incluyeron.

- Compilación Angular de producción aprobada antes del push.
- Vercel confirmó `success / Deployment has completed` para ese commit. El dominio estable https://guadalupana-v2.vercel.app sirve el nuevo bundle `main-PQBGLIVR.js` (HTTP 200), que contiene «Llenar por voz o texto», el endpoint de extracción y la URL de la API de Render.
- La ruta pública https://guadalupana-v2.vercel.app/matriculas/nueva devuelve HTTP 200 con la versión actual de Angular; requiere iniciar sesión como ADMIN para usar el formulario.
- Render ya sirve la ruta nueva: POST https://guadalupana-v2.onrender.com/api/matriculas/extraer-datos pasó de 404 durante el despliegue a 401 `Token requerido`, esperado sin autenticación. No se crearon matrículas ni se usaron cuentas ficticias en producción.
- Pendiente: confirmar `GEMINI_API_KEY` en Environment de Render y `GEMINI_MODEL=gemini-3.8-flash` (también es el valor predeterminado del código). La clave local no se transfiere por Git. No hay credenciales del panel de Render disponibles en esta sesión; se pidió al usuario confirmar su configuración.
- No se confirmó una extracción real autenticada en producción. Los intentos locales reales anteriores devolvieron 503 por alta demanda de Google. Las pruebas de interfaz y las 20 pruebas automatizadas anteriores siguen documentadas abajo.

Las referencias posteriores a «solo local / no desplegado» describen el estado anterior a esta publicación. Para el estado actual prevalece esta sección.


Actualizado: 28 de septiembre de 2026. Trabajo local; no se hizo commit, push ni despliegue.

## Estado actual

- SDK oficial instalado en el backend: `@google/genai` 2.24.0.
- Modelo: `gemini-3.8-flash`, por petición posterior del usuario. Se lee de `GEMINI_MODEL` y es también el valor predeterminado del controlador.
- `backend/.env` contiene `GEMINI_API_KEY` y `GEMINI_MODEL`. La clave ya está configurada; no se reproduce en esta guía ni debe sustituirse por el marcador.
- El formulario y el modal funcionan en pruebas locales. Dos solicitudes reales a Gemini 3.8 Flash devolvieron HTTP 503 / UNAVAILABLE por alta demanda. La extracción real queda pendiente de volver a probar cuando Google responda.
- La prueba anterior de Gemini 2.5 Flash devolvió 404 por no estar disponible para nuevos usuarios de ese modelo. No se dejó configurado 2.5 ni 1.5.

## 1. Backend

`POST /api/matriculas/extraer-datos` requiere JWT válido y rol ADMIN, siguiendo los middleware existentes. Recibe `{"texto":"Datos dictados o escritos"}` y devuelve un objeto JSON plano con los campos encontrados.

El controlador usa la clave únicamente en el servidor, solicita salida estructurada y valida la respuesta contra los campos del formulario y las longitudes de Prisma. Omite datos ausentes y claves desconocidas. Valida fechas, correos y opciones; conserva ceros iniciales de cédulas y teléfonos. El texto tiene un límite de 12000 caracteres y la llamada a Gemini, 30 segundos.

Esta ruta no guarda matrículas ni modifica la base de datos. Devuelve errores controlados: entrada inválida 400, sin datos reconocidos 422, cuota 429, respuesta inválida 502, configuración o indisponibilidad 503 y tiempo agotado 504. El mensaje de alta demanda permite reintentar conservando el texto.

Archivos principales:

- `backend/src/lib/matricula-extraccion.ts`: campos permitidos, esquema JSON, prompt y validadores.
- `backend/src/controllers/matricula-extraccion.controller.ts`: SDK, configuración y errores.
- `backend/src/routes/matricula.routes.ts`: ruta autenticada.

## 2. FormGroup y correspondencia de campos

`NuevaMatricula` usa un FormGroup con 41 controles. Los controles usan los nombres originales del contrato de matrícula. El llenado inteligente permite 37 campos; excluye `cursoId`, `matriculaNo`, `tomo` y `pagina`, que conservan el flujo administrativo existente.

| Tabla Prisma | Campos del formulario |
| --- | --- |
| Matricula | matriculaNo, tomo, pagina, cursoId, apellidos, nombres, cedula, sexo, nivelEstudio, lugarfechamatricula |
| DatosPersonalesMatricula | fechaNacimiento, pais, provincia, canton, parroquia, ciudad, nacionalidad, calle, num, transversal, telefono, correo |
| DatosFamiliaresMatricula | nombrepapa, profesionpapa, ocupacionpapa, nombremama, profesionmama, ocupacionmama, nombrerepresentante, ocupacionrepresentante, domiciliorepresentante, telefonorepresentante, correoestudiante |
| DatosAcademicosMatricula | cursoanterior, unidadeducativa, centroformacionanterior, tipoBachiller, conferidoPorA1, conferidoPorA2, especialidad, lugarfechacertificado |

Los IDs, timestamps y campos técnicos no presentes en el formulario no se extraen. `fechaNacimiento` se maneja como YYYY-MM-DD. `sexo` admite Masculino/Femenino/Otro; `nivelEstudio`, a1/a2/a4; `tipoBachiller`, Bachiller/Superior/Otro.

El correo del estudiante se extrae en `correoestudiante`. El backend existente utiliza `correoestudiante || correo` al guardar. Se mantiene el comportamiento original de consulta de cédula, numeración por curso, representante y documentos.

`patchValue(..., { emitEvent: false })` aplica únicamente campos permitidos, sin disparar una consulta de cédula o borrar otros datos por efectos secundarios. Por defecto se completan campos vacíos o valores predeterminados sin editar. El usuario puede marcar la opción para reemplazar valores existentes. Nunca se guarda automáticamente.

## 3. Modal de voz y texto

El botón «Llenar por voz o texto» abre un modal Angular Material. Incluye dictado con SpeechRecognition/webkitSpeechRecognition, texto editable, extracción, vista previa y confirmación. `MatriculaService.extraerDatos()` envía el JWT con el patrón existente de getHeaders().

El micrófono solo se activa al pulsar «Dictar en español». Si no hay soporte o se rechaza el permiso, se puede escribir. El modal informa del envío de texto a Google y del servicio de voz del navegador. Al cerrar, detiene el micrófono. Los errores mantienen el texto para corregir o reintentar.

Archivos principales:

- `frontend/src/app/components/matriculas/nueva-matricula/nueva-matricula.{ts,html,scss}`.
- `frontend/src/app/components/matriculas/nueva-matricula/llenado-inteligente-dialog.{ts,html,scss}`.
- `frontend/src/app/services/matricula-datos.ts`: controles iniciales, tipos y etiquetas.
- `frontend/src/app/services/matricula.ts`: petición al endpoint.

## 4. Cómo probarlo

Desde la raíz del proyecto, abre una terminal para el backend:

```powershell
cd backend
npm run dev
```

En otra terminal, desde la raíz:

```powershell
cd frontend
$env:NG_BUILD_MAX_WORKERS='1'
$env:GOMAXPROCS='2'
npm start
```

Abre http://localhost:4200, inicia sesión con un administrador existente y entra en `/matriculas/nueva`. El entorno de desarrollo apunta a http://localhost:3000/api. Si modificas `.env`, reinicia el backend. Para desarrollo se utiliza `npm run dev`; `npm start` del backend ejecuta migraciones y seed.

1. Pulsa «Llenar por voz o texto».
2. Escribe este ejemplo ficticio o usa «Dictar en español» y permite el micrófono:

> Nombres Ana María, apellidos Pérez López. Nació el 15 de abril de 2003. Su correo es ana.prueba@example.com. Su madre se llama Carmen López y es docente. Terminó el bachillerato.

3. Pulsa «Extraer datos». Si Gemini devuelve alta demanda, espera y reintenta; el texto permanece.
4. Revisa los datos encontrados y pulsa «Completar formulario».
5. Comprueba los campos y que el curso y la numeración permanezcan como estaban. Solo «Guardar» crea una matrícula.

Para la prueba de voz utiliza un navegador que soporte Web Speech, como Chrome o Edge, con permiso de micrófono y en localhost o HTTPS. El micrófono físico no fue probado en esta sesión. Las pruebas de la interfaz no guardaron datos ficticios; el `.env` puede apuntar a una base real.

## 5. Verificación realizada

- Backend: 10 pruebas aprobadas de contrato, validación, autenticación/roles, JSON y errores del proveedor, incluido 503.
- Frontend: 10 pruebas aprobadas del FormGroup, conservación/reemplazo de valores, consulta de cédula, guardado existente y modal de texto/voz simulada.
- TypeScript del backend: aprobado con `tsc --noEmit`.
- Compilación Angular de desarrollo: aprobada; permanecen avisos preexistentes de Sass y proyección de iconos Material.
- Chrome local: modal, vista previa, petición con JWT y aplicación al formulario aprobados, con API simulada; sin errores JavaScript ni petición de guardado.
- Gemini real: pendiente de éxito; los dos intentos con 3.8 Flash devolvieron 503 por alta demanda de Google. No se presenta una simulación como respuesta real.

Comandos para repetir las comprobaciones, cada uno desde la carpeta indicada:

```powershell
# backend
npm run test:extraccion
node node_modules/typescript/bin/tsc --noEmit

# frontend
$env:NG_BUILD_MAX_WORKERS='1'
$env:GOMAXPROCS='2'
npm run test:matricula
npm run build -- --configuration development
```

`test:matricula` usa `tsconfig.matricula.spec.json` para ejecutar las pruebas de este módulo. Hay especificaciones antiguas de otros servicios con importaciones desactualizadas; no se afirma que la suite global esté corregida.

## 6. Para retomar

Primero vuelve a probar una extracción real con Gemini 3.8 Flash y el dictado con un micrófono físico. La implementación está local y no se ha publicado. No ejecutar push ni desplegar hasta que el usuario autorice esa etapa. El contexto general del sistema está en `CONTEXTO_PROYECTO.md`.
