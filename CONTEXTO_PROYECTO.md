# Guadalupana — contexto para retomar el proyecto

Actualizado: **28 de septiembre de 2026**. La sección 1 resume el estado actual. Las secciones históricas conservan decisiones anteriores; no deben usarse para volver a configurar Gemini ni repetir operaciones sobre la base.

## 1. Leer esto primero al retomar

### Cambios locales más recientes: panel flotante y entrevistas

- Se atendió la nueva versión de `leeyejecuta.txt`: el diálogo se abre a la derecha, sin backdrop, con `scrollStrategy: this.overlay.scrollStrategies.noop()`, ancho 420 px y altura máxima adaptada al viewport. Mantiene foco manual y evita abrir varias copias. Al salir del componente se cierra y se detiene el dictado.
- Estilos: sombra y borde en `frontend/src/styles.scss`; contenido flexible con scroll y acciones visibles en `llenado-inteligente-dialog.scss`.
- `PROMPT_EXTRACCION` ahora contempla entrevistas informales, preguntas/respuestas, muletillas, errores de escritura, negaciones y correcciones. Atribuye datos por parentesco y contexto; no convierte automáticamente a padres en representantes ni usa correos de familiares como correos del estudiante. Mantiene el esquema y los validadores existentes.
- Pruebas: 13 frontend y 12 backend aprobadas; build Angular de desarrollo y TypeScript backend aprobados. En Chrome local se comprobó panel sin backdrop, scroll del formulario, edición de nombres detrás del panel, conservación de esa edición al aplicar IA y ausencia de errores JavaScript o guardado automático.
- También se revisó la vista móvil: el panel cabe en el viewport visual. El formulario existente ensancha el viewport móvil; no se modificó el diseño general del formulario.
- Con el prompt final, tres casos ficticios de Groq devolvieron lo esperado: preguntas con correcciones y parentesco; preguntas sin respuestas (sin datos); entrevista a una madre (nombre materno y de la hija, sin suplantar representante ni correo del estudiante). Un intento intermedio encontró el límite temporal 429; se repitió el caso después, sin cambiar de plan ni habilitar cobros.
- Estos cambios están locales, sin commit ni despliegue en esta tarea. El último commit observado sigue siendo `c16bb88`. El TXT del usuario y la actualización documental previa se conservan.

### Estado del código y de producción

- Sistema: Angular 21 en Vercel, Express 4 + TypeScript en Render y Prisma 6 sobre PostgreSQL/Supabase.
- Sitio estable: https://guadalupana-v2.vercel.app. API: https://guadalupana-v2.onrender.com/api.
- Repositorio: https://github.com/fernandocaizavp-fer/guadalupana-v2, rama `main`.
- Último commit observado: **`c16bb880c1239c0a2917cd5a593977e14801ee8a` — `Configuracion del api grok`**. `main` y la referencia local `origin/main` apuntan a él. Incluye el filtro de formato, sus pruebas, los dos Markdown de contexto y el TXT actualizado.
- Antes de esta actualización documental, `git status --short` estaba limpio. El filtro ya está registrado en Git; no volver a describirlo como un cambio sin commit.
- Última versión cuyo frontend verificó el asistente en producción: **`fe675e1`**, migración a Groq, con bundle `main-ELXRUHZT.js`. El despliegue de `c16bb88` no se comprobó en esta actualización; la coincidencia de referencias Git no prueba que haya terminado.
- El usuario informó que Groq funciona y el formulario se llena. El asistente también comprobó una extracción real desde el entorno local. No tuvo acceso al panel de Render ni verificó personalmente una extracción autenticada en producción.
- El widget Voiceflow de la landing es independiente del llenado inteligente de matrículas.

### Llenado inteligente actual

- Proveedor **Groq**, SDK `groq-sdk` 1.6.0. Modelo predeterminado **`openai/gpt-oss-20b`**, configurable mediante `GROQ_MODEL`.
- Credencial: **`GROQ_API_KEY`** en el backend. La clave local estaba configurada y funcionó en la prueba real. El `.env` no se transfiere a Render con Git; no copiar secretos a este documento.
- Gemini se sustituyó por sus errores 503. El SDK `@google/genai` se retiró; `GEMINI_API_KEY` y `GEMINI_MODEL` ya no controlan esta funcionalidad.
- `POST /api/matriculas/extraer-datos` exige JWT y rol ADMIN; recibe `{ texto }` y devuelve JSON plano. No guarda matrículas ni consulta cédulas.
- Conserva el prompt, el esquema y los validadores en `backend/src/lib/matricula-extraccion.ts`. Solicita `response_format: { type: 'json_object' }`, envía el esquema en otro mensaje system y valida la respuesta antes de devolverla.
- Timeout de 30 segundos y sin reintentos automáticos del SDK. Errores controlados de entrada, formato, cuota, configuración, disponibilidad y tiempo de espera.
- Nueva matrícula usa FormGroup con 41 controles; 37 son extraíbles. `cursoId`, `matriculaNo`, `tomo` y `pagina` mantienen el flujo administrativo existente.
- El modal «Llenar por voz o texto» permite dictado nativo, texto manual, vista previa y aplicación con `patchValue`. Por defecto conserva valores existentes; reemplazarlos exige marcar la opción correspondiente. Guardar sigue siendo una acción manual.

### Cambio incluido en c16bb88: limpieza del formato

En `frontend/src/app/components/matriculas/nueva-matricula/nueva-matricula.ts`, `aplicarDatosExtraidos` pasa los cambios aceptados por `normalizarDatosExtraidos` antes de `patchValue(..., { emitEvent: false })`.

- Capitaliza nombres y apellidos del estudiante, familiares y representante, además de país, provincia, cantón, parroquia y ciudad. Respeta tildes, guiones y enlaces internos como «de la».
- Pone en mayúscula la primera letra de profesiones y ocupaciones; conserva siglas y nombres que aparezcan en el resto del texto.
- Recorta extremos y reduce espacios repetidos a uno en los textos que se aplican.
- Ejemplos: `kaiza   VEGA` → `Kaiza Vega`; `MIGUEL   ANÍBAL` → `Miguel Aníbal`; `mecánico   de CNC` → `Mecánico de CNC`.
- No corrige apellidos por suposición ni separa nombres fusionados como `aníbalcaiza`: requieren revisión humana.
- Conserva correos, códigos, ceros iniciales, fechas y campos existentes no seleccionados para reemplazar. No dispara la consulta de cédula ni guarda automáticamente.

### Verificación y próximos pasos

- Migración a Groq: **12 pruebas backend y 10 frontend aprobadas**, TypeScript backend y build Angular de producción aprobados. Una llamada real con datos ficticios devolvió ocho campos válidos; no se guardaron matrículas.
- Filtro de formato: **12 pruebas frontend aprobadas** (incluye dos nuevas) y TypeScript de la aplicación sin errores. No se volvió a compilar producción tras ese filtro; sí se compiló el código al ejecutar las pruebas.
- No se afirma que toda la suite del proyecto pase: se ejecutaron las pruebas específicas de matrícula. Siguen avisos preexistentes de Sass, iconos Material y presupuesto SCSS.
- Si se necesita confirmar el filtro en producción, comprobar primero el despliegue de `c16bb88` y probar desde una cuenta ADMIN; no repetir automáticamente el push o la migración a Groq.
- Leer `leeyejecuta.txt` cada vez que el usuario lo solicite: cambia entre tareas. Su versión actual pide el panel flotante y el prompt para entrevistas, ya implementados localmente.
- Consultar [PRUEBA_LLENADO_INTELIGENTE.md](PRUEBA_LLENADO_INTELIGENTE.md) para el contrato de campos y la guía detallada. Sus notas de estado anteriores deben contrastarse con esta sección, que prevalece.
- No repetir `db push`, resets, seeds ni creación de administradores al retomar. La conexión local puede apuntar a la base real.

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
| Llenado inteligente | Groq desde Express; dictado/texto y FormGroup en Angular |

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
| `backend/src/controllers/matricula-extraccion.controller.ts` | SDK Groq, modelo, clave y errores de extracción |
| `backend/src/lib/matricula-extraccion.ts` | Prompt, esquema, campos permitidos y validadores |
| `backend/tests/matricula-extraccion.test.cjs` | Pruebas de extracción, autenticación y SDK simulado |
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
| `frontend/src/app/components/matriculas/nueva-matricula/nueva-matricula.ts` | FormGroup, aplicación de datos y normalización de formato |
| `frontend/src/app/components/matriculas/nueva-matricula/llenado-inteligente-dialog.*` | Modal de dictado, texto, vista previa y pruebas |
| `frontend/src/app/services/matricula-datos.ts` | Los 41 controles y etiquetas de los 37 campos extraíbles |
| `frontend/src/app/services/matricula.ts` | Peticiones JWT y llamada a extraer-datos |
| `frontend/tsconfig.matricula.spec.json` | Configuración de pruebas específicas del módulo |
| `frontend/src/environments/environment.ts` | API de desarrollo local |
| `frontend/src/environments/environment.prod.ts` | API Render para producción |
| `frontend/angular.json` | Build, reemplazo del environment y presupuestos de tamaño |
| `frontend/src/app/components/landing/landing.html` | Landing e inclusión `<app-voiceflow-chat />` |
| `frontend/src/app/components/landing/landing.ts` | Carrusel, navegación e importación de `VoiceflowChat` |
| `frontend/src/app/components/landing/voiceflow-chat.ts` | Carga y limpieza del chatbot al entrar/salir de la landing |
| `frontend/src/app/components/landing/landing.scss` | Diseño de la landing y botón flotante de WhatsApp |
| `frontend/netlify.toml`, `frontend/public/_redirects` | Configuración conservada de Netlify; no identifica el proveedor actual |
| `jmeter/` | Escenarios y utilidades de pruebas de carga; no se ejecutaron durante esta adaptación |

## 4. Historial de configuración inicial (27 de septiembre de 2026)

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
| `1c79ca6` | FormGroup y llenado inteligente inicial con Gemini; luego sustituido |
| `fe675e1` | Migración a Groq, JSON y actualización del aviso del modal |
| `c16bb88` | Filtro de capitalización/espacios, pruebas y documentación de contexto |

En la publicación inicial del chat se hizo push a `origin/main`. GitHub reportó para `beac5cbc46888b81e84d1f7d79ec936cb3aef473` el estado **Vercel: success / Deployment has completed**, con entorno llamado **Production**. Además se comprobó el sitio público estable en Chrome.

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

### Pruebas del llenado inteligente

Desde `backend`: `npm run test:extraccion`.

Desde `frontend`: `npm run test:matricula`. Para comprobar tipos de la aplicación: `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit`.

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

La conexión local usa `DATABASE_URL` y `DIRECT_URL`. La extracción actual usa `GROQ_API_KEY` y opcionalmente `GROQ_MODEL`. La presencia de valores locales no demuestra su configuración en Render; aquí solo se documentan nombres y funciones.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL usada por Prisma Client |
| `DIRECT_URL` | Conexión de operaciones de esquema en Prisma |
| `PORT` | Puerto HTTP, suministrado por Render o respaldo local 3000 |
| `JWT_SECRET` | Firma y validación de tokens |
| `GROQ_API_KEY` | Clave de Groq, solo en el backend; no se envía al navegador |
| `GROQ_MODEL` | Modelo de extracción; respaldo `openai/gpt-oss-20b` |
| `CLOUDINARY_CLOUD_NAME` | Identificación del almacenamiento Cloudinary |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de archivos |
| `CEDULA_API_TOKEN` | Credencial del proveedor de consulta de cédula |
| `ADMIN_CORREO`, `ADMIN_PASSWORD` | Bootstrap opcional por `seed.ts` |
| `ADMIN_NOMBRE`, `ADMIN_APELLIDO` | Datos opcionales del administrador del seed |

Nunca copiar contraseñas, tokens, cadenas completas de conexión con credenciales o códigos de recuperación a documentación versionada.

## 8. Qué se verificó y qué sigue pendiente

### Comprobaciones históricas de infraestructura y chat

Para las pruebas recientes de Groq y del filtro de formato, consultar la sección 1.

- TypeScript del backend pasó tras los cambios de puerto y CORS.
- `prisma db push` terminó con esquema sincronizado y generación de cliente.
- Sintaxis de `create-admin.cjs` correcta, sin ejecutarlo contra la base.
- Builds de producción Angular completados; los más recientes con paralelismo reducido.
- Comprobaciones aisladas del componente del chat con API simulada: carga única, salida/regreso, salida durante descarga/carga y reintento tras fallo.
- Push y despliegue Vercel del commit `beac5cb` comprobados durante la integración inicial del chat; para los commits posteriores, consultar la sección 1.
- Chrome abrió `https://guadalupana-v2.vercel.app` y mostró la landing con el botón azul “Talk to AI”. Existían `<app-voiceflow-chat>`, `window.voiceflow.chat` y el contenedor `#voiceflow-chat` con Shadow DOM.
- SDK de Voiceflow: HTTP 200; setup público del proyecto: HTTP 204/201; hoja de estilos y fuentes: HTTP 200. No aparecieron errores de carga de Voiceflow en esa comprobación.
- En la comprobación inicial del chat, el bundle era `main-OW4CRS77.js`; ya fue sustituido por versiones posteriores. No usarlo para identificar el despliegue actual.

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

> Lee primero la sección 1 de `CONTEXTO_PROYECTO.md`. El sistema usa Vercel + Render + Supabase, Voiceflow en la landing y Groq para extraer datos de matrícula. El filtro de formato ya existe en `c16bb88`. Comprueba Git y la instrucción actual del usuario; abre solo los archivos necesarios. No vuelvas a Gemini ni repitas configuraciones de base de datos. Distingue código registrado, despliegue comprobado y funcionamiento informado por el usuario. Al terminar, actualiza este MD sin incluir secretos.
