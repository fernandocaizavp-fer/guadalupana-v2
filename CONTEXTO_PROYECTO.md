# Guadalupana — contexto para retomar el proyecto

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


## Estado más reciente: llenado inteligente local (28 de septiembre de 2026)

Esta sección actualiza el estado histórico descrito más abajo. Hay cambios locales pendientes; la funcionalidad nueva NO está en producción y NO se hizo commit, push ni despliegue.

- Implementado el prompt actual de `leeyejecuta.txt`: FormGroup de 41 controles, modal de voz/texto, vista previa, `patchValue`, servicio JWT y endpoint ADMIN `POST /api/matriculas/extraer-datos` sin persistencia.
- SDK oficial `@google/genai` 2.24.0. Modelo actual `gemini-3.8-flash`, solicitado después por el usuario; no usar la referencia antigua a 1.5 del TXT ni el intento anterior con 2.5.
- `backend/.env` ya contiene la clave Gemini configurada y `GEMINI_MODEL="gemini-3.8-flash"`. No copiar la clave aquí ni reemplazarla por el marcador.
- Verificación: 10 pruebas backend + 10 frontend aprobadas, TypeScript backend y build Angular de desarrollo aprobados. Chrome local comprobó modal y aplicación de datos con API simulada, sin guardar matrículas.
- Integración real pendiente de éxito: Gemini 3.8 respondió 503 por alta demanda en dos intentos; se maneja con mensaje específico y se conserva el texto. Falta probar micrófono físico.
- No se modificó el esquema Prisma ni se crearon matrículas ficticias. Se mantienen el puerto dinámico `process.env.PORT || 3000`, escucha en `0.0.0.0` y CORS temporal `origin: "*"` ya existentes.
- Leer [PRUEBA_LLENADO_INTELIGENTE.md](PRUEBA_LLENADO_INTELIGENTE.md) para mapa exacto de campos, archivos, pruebas y pasos de arranque. Backend: `cd backend` y `npm run dev`; frontend: `cd frontend` y `npm start`.

---

Actualizado: **27 de septiembre de 2026**. Este documento resume el código revisado y el trabajo de la sesión; no implica que los servicios externos sigan en el mismo estado en una fecha posterior.

## 1. Leer esto primero mañana

- El sistema ya está desplegado. **No hay que repetir los cambios anteriores ni recrear la base de datos.**
- Sitio público estable: **https://guadalupana-v2.vercel.app**.
- API de producción: **https://guadalupana-v2.onrender.com/api**.
- Frontend en **Vercel**, backend en **Render**, PostgreSQL en **Supabase**.
- El chatbot de Voiceflow se comprobó visualmente en producción: botón azul **“Talk to AI”**, abajo a la derecha de la landing.
- Último commit de aplicación comprobado y publicado: **`beac5cb` — `fix: cargar Voiceflow desde la landing de Angular`**.
- Antes de crear este documento, `git status --short` estaba limpio. Este Markdown se creó después de ese commit; su creación no implica commit ni publicación automática.
- Para retomar, leer este MD y comprobar `git status --short` y `git log -5 --oneline`. Abrir solamente los archivos relacionados con la nueva tarea.
- `leeyejecuta.txt` es un archivo de instrucciones que el usuario cambia con frecuencia. Leer su contenido actual cuando el usuario lo pida; no volver a ejecutar sus versiones antiguas.
- `INVENTARIO_SISTEMA.md` contiene información funcional útil, pero su sección de infraestructura está desactualizada: menciona Railway/Netlify. Para el estado de despliegue de esta sesión, usar este documento.

## 2. Visión general del sistema

Aplicación de gestión académica del Centro de Formación Artesanal Particular Guadalupana, en Riobamba, Ecuador. Ofrece una landing pública y paneles para administración, profesores y estudiantes.

```text
Navegador → Angular en Vercel → API Express en Render → Prisma → PostgreSQL/Supabase
                 │                     │
                 └─ Voiceflow          ├─ Cloudinary (archivos)
                    (chat público)     └─ API externa de consulta de cédula
```

| Capa | Tecnología y función |
| --- | --- |
| Frontend | Angular 21, TypeScript, componentes standalone, Angular Material y SCSS |
| Backend | Node.js, Express 4 y TypeScript; rutas REST bajo `/api` |
| Datos | Prisma 6 y PostgreSQL; cliente generado en `@prisma/client` |
| Autenticación | JWT; contraseñas hasheadas con `bcryptjs` |
| Archivos | Multer en memoria y utilidades de Cloudinary; también existe la ruta estática `/uploads` |
| Documentos | Generación de documentos Word mediante Docxtemplater y PizZip |
| Recuperación | Flujo de códigos de recuperación y uso de EmailJS en el frontend |
| Chat público | Widget de Voiceflow, independiente de la API académica |

### Funciones y roles

- **ADMIN:** panel `/dashboard`, gestión de cursos, docentes, matrículas, anuncios y configuración; acceso a operaciones académicas y reportes según las rutas.
- **PROFESOR:** panel `/profesor`, materias, tareas, notas, asistencia y operaciones académicas autorizadas.
- **ESTUDIANTE:** panel `/estudiante`, consulta de materias, tareas, entregas y calificaciones.
- Landing pública en `/`, acceso en `/login`, cambio de contraseña en `/cambiar-password` y recuperación en `/recuperar-password`.
- Otros módulos: disciplina, supletorios, examen de grado, documentos oficiales, consulta de cédula, archivos de tareas y entregas.

El backend valida JWT y roles con `verificarToken`, `soloAdmin` y `soloRoles`. El frontend usa `AuthGuard` y guarda `token` y `usuario` en `localStorage`. El JWT emitido por el login tiene una vigencia de 8 horas. El guard del frontend comprueba presencia del token y rol; la validación criptográfica corresponde al backend.

### Modelo de datos resumido

`Usuario` tiene roles `ADMIN`, `PROFESOR` y `ESTUDIANTE`. `Curso` agrupa `Materia` y `Matricula`; las matrículas tienen datos personales, familiares y académicos. La actividad se registra en `Tarea`, `NotaTarea`, `Asistencia`, `AsistenciaDetalle`, `ObservacionAsistencia`, `NotaDisciplina`, `Supletorio` y `ExamenGrado`. También existen `Anuncio`, `Configuracion`, `RecuperacionPassword`, `ArchivoTarea`, `EntregaTarea` y `ArchivoEntrega`.

## 3. Mapa de archivos para trabajar sin releer todo

Las rutas siguientes son relativas a la raíz del repositorio.

| Ruta | Qué contiene / cuándo abrirla |
| --- | --- |
| `backend/src/index.ts` | Arranque Express, CORS, puerto, registro de rutas |
| `backend/package.json` | Comandos de desarrollo, build, seed y arranque |
| `backend/.env` | Conexiones locales; ignorado por Git. No copiar sus valores al MD |
| `backend/prisma/schema.prisma` | Modelos, relaciones, enums y datasource |
| `backend/prisma/migrations/` | Migraciones SQL existentes |
| `backend/src/lib/prisma.ts` | Instancia de Prisma compartida |
| `backend/src/routes/` | Endpoints y middlewares de autorización por módulo |
| `backend/src/controllers/` | Operaciones de negocio y acceso a datos |
| `backend/src/middlewares/auth.middleware.ts` | Validación JWT y autorización por roles |
| `backend/src/middlewares/defensa.middleware.ts` | Límite de peticiones y bloqueo temporal por IP |
| `backend/src/lib/cloudinary.ts` | Subida y eliminación de archivos |
| `backend/src/controllers/cedula.controller.ts` | Consulta externa de cédula; no reintroducir reintentos que generan cargos adicionales |
| `backend/create-admin.cjs` | Creación manual del administrador inicial |
| `backend/src/seed.ts` | Bootstrap alternativo mediante variables `ADMIN_*` |
| `frontend/src/main.ts` | Arranque de Angular |
| `frontend/src/index.html` | Documento HTML principal; actualmente sin script global de Voiceflow |
| `frontend/src/app/app.routes.ts` | Rutas y restricciones por rol |
| `frontend/src/app/app.config.ts` | Providers de router, HTTP, animaciones y notificaciones |
| `frontend/src/app/services/` | Peticiones HTTP; consumen `environment.apiUrl` |
| `frontend/src/app/components/` | Pantallas de cada módulo |
| `frontend/src/environments/environment.ts` | API de desarrollo local |
| `frontend/src/environments/environment.prod.ts` | API Render para producción |
| `frontend/angular.json` | Build, reemplazo del environment y presupuestos de tamaño |
| `frontend/src/app/components/landing/landing.html` | Landing e inclusión `<app-voiceflow-chat />` |
| `frontend/src/app/components/landing/landing.ts` | Carrusel, navegación e importación de `VoiceflowChat` |
| `frontend/src/app/components/landing/voiceflow-chat.ts` | Carga y limpieza del chatbot al entrar/salir de la landing |
| `frontend/src/app/components/landing/landing.scss` | Diseño de la landing y botón flotante de WhatsApp |
| `frontend/netlify.toml`, `frontend/public/_redirects` | Configuración conservada de Netlify; no identifica el proveedor actual |
| `jmeter/` | Escenarios y utilidades de pruebas de carga; no se ejecutaron durante esta adaptación |

## 4. Cambios realizados en la sesión

### Backend preparado para Render

En `backend/src/index.ts` quedó:

```ts
app.use(cors({ origin: "*" })); // Temporal: permitir cualquier origen.

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  // Logs de arranque existentes.
});
```

- `PORT` debe ir en mayúsculas. Se convierte a número, usa el puerto suministrado por Render y tiene `3000` como respaldo.
- Se escucha explícitamente en `0.0.0.0`.
- CORS quedó abierto temporalmente a todos los orígenes, por solicitud del usuario.
- `GET /` devuelve `{ message: 'Backend CF Guadalupana funcionando' }`.
- Prefijos API: `/auth`, `/cursos`, `/matriculas`, `/documentos`, `/notas`, `/usuarios`, `/tareas`, `/supletorios`, `/asistencias`, `/anuncios`, `/disciplina`, `/reportes`, `/examen-grado`, `/cedula` y `/configuracion`, todos precedidos de `/api`.

### Conexión con Supabase

Se actualizaron `DATABASE_URL` y `DIRECT_URL` en `backend/.env` con los valores entregados por el usuario. No se reproducen las credenciales aquí.

- `DATABASE_URL`: endpoint del pooler de Supabase, puerto **6543**, parámetro `pgbouncer=true`.
- `DIRECT_URL`: endpoint de conexión para operaciones de esquema, puerto **5432**; también apunta al pooler indicado por el usuario.
- Datasource actual:

```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Se ejecutó **`npx prisma db push`** desde `backend` y terminó correctamente. Prisma informó que la base estaba sincronizada y generó Prisma Client **6.19.2**. Esto sincroniza el esquema; no demuestra que se haya cargado información académica ni registra por sí solo el historial de migraciones.

### Administrador inicial

Se creó `backend/create-admin.cjs`. Usa Prisma y bcrypt con costo 10; carga `backend/.env` independientemente del directorio desde el que se invoque.

```powershell
# Desde la raíz del repositorio, solo si se necesita crear esa cuenta:
node .\backend\create-admin.cjs
```

- Correo: `admin@guadalupana.com`.
- Rol `ADMIN`, cuenta activa y `debeCambiarPassword: true`.
- Genera una contraseña temporal aleatoria y la muestra en consola después de guardar la cuenta. No hay una contraseña fija documentada.
- Si ya existe un administrador activo con ese correo, no cambia su contraseña ni lo duplica. Si el correo pertenece a otro rol o está inactivo, informa un error.
- **El asistente creó el script y verificó su sintaxis, pero no lo ejecutó. No se confirmó si el usuario lo ejecutó después.**
- El `seed.ts` existente es otro mecanismo: usa `ADMIN_CORREO`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE` y `ADMIN_APELLIDO`; solo crea una cuenta si no hay ningún ADMIN y deja `debeCambiarPassword: false`. No confundir ambos mecanismos.

### URL de API de Angular

```ts
// frontend/src/environments/environment.prod.ts
apiUrl: 'https://guadalupana-v2.onrender.com/api'

// frontend/src/environments/environment.ts
apiUrl: 'http://localhost:3000/api'
```

Se sustituyó la antigua URL de Railway. **Conservar `/api` y no añadir una barra final**: los servicios agregan rutas como `/auth/login`. `angular.json` reemplaza el environment local por el de producción durante el build de producción.

### Voiceflow: implementación final

Inicialmente se pegó el snippet en `frontend/src/index.html`. Luego se trasladó a la landing a petición del usuario. **El script global fue retirado; no volver a insertar una segunda copia.**

En `landing.html` está:

```html
<app-voiceflow-chat />
```

`landing.ts` importa `VoiceflowChat` y lo incluye en `imports`. El componente está en `voiceflow-chat.ts`:

- Usa `afterNextRender` para cargarlo cuando Angular ha renderizado la página.
- Descarga el SDK una sola vez y reutiliza su API.
- Inicializa el widget con los valores suministrados por el usuario:

```ts
verify: { projectID: '6ab894ab6920e1782997de07' },
url: 'https://general-runtime.voiceflow.com',
voice: { url: 'https://runtime-api.voiceflow.com' }
```

SDK: `https://cdn.voiceflow.com/widget-next/bundle.mjs`.

- Al salir de la landing, destruye el widget. Serializa carga y limpieza para evitar conflictos al navegar rápidamente.
- Un fallo al descargar permite reintentar al volver a la landing.
- El `.ts` es intencional: Angular no admite `<script>` en una plantilla de componente. El HTML incluye el componente y TypeScript ejecuta la integración.
- Documentación: [plantillas de Angular](https://angular.dev/guide/templates) y [API del widget de Voiceflow](https://www.voiceflow.com/docs/documentation/deploy/widget/web-chat-api).

## 5. Producción y Git

| Concepto | Valor |
| --- | --- |
| Repositorio | https://github.com/fernandocaizavp-fer/guadalupana-v2 |
| Rama de trabajo/publicación | `main` |
| Remoto | `origin` |
| Frontend estable | https://guadalupana-v2.vercel.app |
| Backend | https://guadalupana-v2.onrender.com |
| API | https://guadalupana-v2.onrender.com/api |
| Salida Angular | `frontend/dist/frontend/browser` |

Historial relevante, del más antiguo al más reciente:

| Commit | Cambio |
| --- | --- |
| `690a224` | Configuración del backend para Render y base de datos Supabase |
| `2a2e94e` | URL Angular hacia Render; también incorporó `create-admin.cjs` y el TXT actualizado |
| `00ae196` | Snippet inicial de Voiceflow en `index.html`; incluyó el documento institucional `gemini-code-1790482289684.txt` |
| `beac5cb` | Integración de Voiceflow desde la landing y retirada del snippet global |

Se hizo push a `origin/main`. GitHub reportó para `beac5cbc46888b81e84d1f7d79ec936cb3aef473` el estado **Vercel: success / Deployment has completed**, con entorno llamado **Production**. Además se comprobó el sitio público estable en Chrome.

No confundir la URL estable con las URLs inmutables de cada despliegue. Algunas direcciones con identificador y `-ikival.vercel.app` solicitan iniciar sesión en Vercel. La dirección escrita por el usuario `guadalupana-v2-mnnzn5ffzh-ikival.vercel.app` devolvió **404** durante la comprobación. Usar el dominio estable de la tabla para visitar el sistema actualizado.

El repositorio conserva configuración de Netlify, pero los despliegues observados fueron de Vercel. Los valores del panel privado de Render/Vercel y sus secretos no se auditaron ni se copiaron a este documento.

## 6. Ejecutar y verificar localmente

Entorno usado: Windows y PowerShell, Node.js **22.19.0**. Las carpetas `backend` y `frontend` tienen su propio `package.json`; los comandos npm se ejecutan en la carpeta correspondiente.

**Conexión de datos:** el `.env` local se dejó apuntando a Supabase. Ejecutar operaciones de escritura desde desarrollo puede afectar esa base. Para un entorno de prueba aislado, usar otras conexiones antes de cargar datos de prueba.

Backend, desde la raíz:

```powershell
cd backend
npm ci
npx prisma generate
npm run dev
```

En otra consola, desde la raíz:

```powershell
cd frontend
npm ci
npm start
```

Angular normalmente escucha en `http://localhost:4200` y la API local en `http://localhost:3000/api`. Si `PORT` está definido con otro valor, ajustar la URL de desarrollo.

Comprobaciones de compilación:

```powershell
# Desde backend: chequeo de tipos sin escribir dist
node node_modules/typescript/bin/tsc --noEmit

# Desde frontend: build de producción con menor consumo de memoria
$env:NG_BUILD_MAX_WORKERS = '1'
$env:GOMAXPROCS = '2'
npm run build -- --configuration production
```

Esas dos variables de paralelismo se aplican a la consola actual; no se modificó la configuración permanente del proyecto. Una compilación anterior falló con `VirtualAlloc`, error 1455 / falta de memoria. El build pasó al reducir el paralelismo.

Backend: `npm run build` ejecuta `prisma generate && tsc`. El comando `npm start` actual es:

```text
prisma migrate deploy && node dist/seed.js; node dist/index.js
```

Ese arranque aplica migraciones y puede crear un administrador por seed; no usarlo como una comprobación de solo lectura. El punto y coma permite intentar arrancar Express incluso si falla la cadena anterior; queda anotado para revisión.

### Publicar un cambio nuevo

1. Revisar el alcance y `git status --short`; no incluir `.env`, claves ni archivos de instrucciones con credenciales.
2. Ejecutar el build y las verificaciones relacionadas con el cambio.
3. Desde la raíz, añadir los archivos concretos y publicar:

```powershell
git add <archivos-del-cambio>
git commit -m "Descripcion del cambio"
git push origin main
```

4. Comprobar el estado de Vercel para ese commit y visitar el dominio público estable. Un push exitoso no prueba por sí solo que el nuevo frontend ya esté publicado.
5. Si se modificó el backend, revisar también el despliegue y los logs de Render. Cambiar el `.env` local no actualiza las variables del panel de Render.
6. Si se modifica el esquema Prisma, revisar migraciones y destino de la conexión antes de aplicar cambios. No repetir `db push`, reset o seeds como parte rutinaria de la publicación.

## 7. Variables de entorno, sin valores secretos

En la última lectura, el `.env` local contenía las claves `DATABASE_URL` y `DIRECT_URL`. Esto no indica qué variables estén configuradas en Render.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL usada por Prisma Client |
| `DIRECT_URL` | Conexión de operaciones de esquema en Prisma |
| `PORT` | Puerto HTTP, suministrado por Render o respaldo local 3000 |
| `JWT_SECRET` | Firma y validación de tokens |
| `CLOUDINARY_CLOUD_NAME` | Identificación del almacenamiento Cloudinary |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de archivos |
| `CEDULA_API_TOKEN` | Credencial del proveedor de consulta de cédula |
| `ADMIN_CORREO`, `ADMIN_PASSWORD` | Bootstrap opcional por `seed.ts` |
| `ADMIN_NOMBRE`, `ADMIN_APELLIDO` | Datos opcionales del administrador del seed |

Nunca copiar contraseñas, tokens, cadenas completas de conexión con credenciales o códigos de recuperación a documentación versionada.

## 8. Qué se verificó y qué sigue pendiente

### Comprobado en esta sesión

- TypeScript del backend pasó tras los cambios de puerto y CORS.
- `prisma db push` terminó con esquema sincronizado y generación de cliente.
- Sintaxis de `create-admin.cjs` correcta, sin ejecutarlo contra la base.
- Builds de producción Angular completados; los más recientes con paralelismo reducido.
- Comprobaciones aisladas del componente del chat con API simulada: carga única, salida/regreso, salida durante descarga/carga y reintento tras fallo.
- Push de los commits listados y despliegue Vercel del último commit confirmado.
- Chrome abrió `https://guadalupana-v2.vercel.app` y mostró la landing con el botón azul “Talk to AI”. Existían `<app-voiceflow-chat>`, `window.voiceflow.chat` y el contenedor `#voiceflow-chat` con Shadow DOM.
- SDK de Voiceflow: HTTP 200; setup público del proyecto: HTTP 204/201; hoja de estilos y fuentes: HTTP 200. No aparecieron errores de carga de Voiceflow en esa comprobación.
- En la comprobación pública, el bundle principal era `main-OW4CRS77.js`. Cambiará cuando se vuelva a compilar código distinto.

### Pendientes / límites de la verificación

- **Credencial expuesta:** una versión anterior de `leeyejecuta.txt` contenía la contraseña de Supabase y quedó en el historial de Git. Ya se informó al usuario que debe rotarla y actualizar los entornos afectados. No se confirmó que lo haya hecho; eliminarla del TXT actual no la elimina del historial.
- **CORS temporal:** sigue con `origin: "*"`; restringirlo cuando se definan los orígenes definitivos.
- **JWT:** el código tiene un secreto de respaldo inseguro si falta `JWT_SECRET`. Confirmar la variable de Render y revisar ese respaldo en una tarea de seguridad.
- **Migraciones:** se aplicó `db push`, mientras que el arranque usa `migrate deploy`. No se comprobó la correspondencia completa entre el historial de migraciones y la base ya sincronizada.
- **Administrador:** no se comprobó la creación efectiva ni el login de `admin@guadalupana.com`.
- **Chatbot:** se comprobó presencia/carga, no la calidad de respuestas ni una conversación completa. La configuración y publicación del agente se gestionan en Voiceflow.
- **Diseño:** el botón flotante verde de WhatsApp y el botón azul del chat están muy próximos y se superponen parcialmente en la captura de escritorio. No se cambió su posición.
- **Build:** siguen advertencias existentes de Sass (`darken`/funciones globales), proyección de `mat-icon` en `nueva-matricula.html` y presupuesto SCSS de `gestionar-tareas.scss` (10.13 kB frente a 10 kB de advertencia). No impidieron la compilación.
- No se ejecutó toda la suite de pruebas ni pruebas completas de cada módulo en producción. No asumir que cargas de archivos, correos, documentos o consulta de cédula quedaron validados por estas comprobaciones.

## 9. Instrucción breve para la próxima sesión

> Lee `CONTEXTO_PROYECTO.md` como contexto inicial. El sistema ya está en Vercel + Render + Supabase y el chatbot está integrado en la landing. Comprueba el estado de Git, conserva los cambios actuales y revisa solo los archivos necesarios para la nueva tarea. No repitas configuraciones ni operaciones sobre la base de datos ya realizadas. Al terminar, actualiza este MD con los cambios, el commit, las verificaciones y los pendientes.
