# INVENTARIO DEL SISTEMA — CF "GUADALUPANA"

> Documento de apoyo para la exposición de la asignatura (evaluación del sistema en funcionamiento).
> Sistema de gestión académica del Centro de Formación Artesanal "Guadalupana".

**Arquitectura general:** Aplicación web full-stack (monorepo) con tres capas:

- **Frontend:** Angular 21 (componentes standalone) + Angular Material
- **Backend:** Node.js + Express 4 + TypeScript (API REST)
- **Base de datos:** PostgreSQL gestionada con el ORM Prisma 6
- **Despliegue:** Backend en Railway, Frontend en Netlify (auto-despliegue al hacer push a `main`)

---

## 1. MÓDULOS Y FUNCIONALIDADES

| Módulo | Qué hace |
|---|---|
| **Autenticación** | Login con JWT, cambio obligatorio de contraseña en el primer ingreso, y recuperación de contraseña por código (vía EmailJS). |
| **Gestión de Usuarios/Docentes** | Crear, listar, editar y eliminar docentes; asignar profesores a materias y profesor principal de materia. |
| **Cursos** | Crear cursos (rama artesanal + año formativo). Al crear un curso se generan automáticamente 9 materias por defecto (Teoría, Práctica, Contabilidad, TICs, Inglés Técnico, etc.). |
| **Materias y Submaterias** | Gestión de materias y submaterias (con lógica especial de Disciplina por "gemelas" Práctica/Teoría). |
| **Matrículas** | Registro completo del estudiante: datos personales, familiares y académicos en tablas separadas. *(Nuevo)* Autocompletado de datos desde la cédula vía API externa. Al matricular se crea también su usuario ESTUDIANTE. |
| **Tareas y Calificaciones** | Crear tareas por materia/semestre y registrar notas de los estudiantes. |
| **Asistencia** | Registrar asistencia por materia y fecha, resumen por curso, observaciones, y reporte AL18. |
| **Disciplina** | Calificación de disciplina con **doble ponderación** (Práctica/Teoría) por semestre. |
| **Supletorios** | Registro de notas de recuperación, individual y masivo. |
| **Examen de Grado** | *(Reciente)* Registro de exámenes de grado y generación de documentos AL19 y AL23. |
| **Anuncios** | Publicación de anuncios con imagen para los paneles de profesor y estudiante. |
| **Reportes y Documentos** | Generación de formularios oficiales en Word (.docx): AL9, AL12, AL13, AL14, AL15, **AL16**, AL18, AL19, **AL22**, AL23, certificados y ficha de matrícula. |
| **Dashboards por rol** | Paneles diferenciados para Admin, Profesor y Estudiante. |

### Funcionalidades NUEVAS / RECIENTES (a destacar)

- **Reportes AL16** (certificado de promoción, por estudiante) y **AL22** (cuadro de aprobados/no aprobados, por curso) — el cambio más reciente.
- **Autocompletado de matrícula por cédula** (integración con API ApiConsult).
- **Módulo de Examen de Grado** con documentos AL19 y AL23.
- **Recuperación y cambio obligatorio de contraseña** (EmailJS).
- **Middleware de defensa anti-DoS** (rate limiting).
- **Autorización por roles en el backend** (no solo en el frontend).

---

## 2. OPERACIONES CRUD POR ENTIDAD

> Convención: ✅ implementado / ❌ no existe. "Eliminar" suele ser borrado real (la BD usa `onDelete: Cascade`).

| Entidad | Crear | Leer | Actualizar | Eliminar | Notas |
|---|:---:|:---:|:---:|:---:|---|
| **Usuario / Docente** | ✅ | ✅ | ✅ | ✅ | CRUD completo (solo ADMIN). |
| **Curso** | ✅ | ✅ | ❌ | ✅ | No hay edición; al crear genera 9 materias. |
| **Materia / Submateria** | ✅ | ✅ | ✅* | ✅ | *Actualización vía "asignar profesor". Submaterias: crear + eliminar. |
| **Matrícula** | ✅ | ✅ | ✅ | ✅ | CRUD completo (incluye datos personales/familiares/académicos). |
| **Tarea** | ✅ | ✅ | ❌ | ✅ | Sin edición; se re-crea si se requiere. |
| **Calificaciones (NotaTarea)** | ✅ | ✅ | ✅ | — | Guardado tipo "upsert" (crea o actualiza por restricción única). |
| **Asistencia** | ✅ | ✅ | ✅* | ✅ | *Se actualiza al re-guardar. Reporte y observaciones incluidos. |
| **Disciplina** | ✅ | ✅ | ✅ | — | Guardado individual y masivo (upsert por semestre). |
| **Supletorio** | ✅ | ✅ | ✅ | — | Individual y masivo (upsert). |
| **Examen de Grado** | ✅ | ✅ | ✅ | — | Guardado masivo (upsert). |
| **Anuncio** | ✅ | ✅ | ✅ | ✅ | CRUD completo con subida de imagen (multer). |

**Lectura clave para la defensa:** las entidades de "núcleo" (Usuario, Matrícula, Anuncio) tienen **CRUD completo**. Las entidades de calificaciones (Notas, Disciplina, Supletorio, Examen) usan patrón **upsert** (crear/actualizar en una sola operación gracias a restricciones únicas `@@unique` en Prisma), que es la forma correcta para datos que se editan repetidamente.

---

## 3. ROLES Y CONTROL DE ACCESO

**Roles (enum `Rol` en Prisma):** `ADMIN`, `PROFESOR`, `ESTUDIANTE`.

**Autenticación:** **JWT (JSON Web Tokens)**.

- Al hacer login, el backend valida correo/contraseña y emite un token firmado con `JWT_SECRET`, vigencia **8 horas**, que contiene `{ id, rol }`.
- El frontend guarda el token en `localStorage` y lo envía en cada petición como cabecera `Authorization: Bearer <token>`.

**Doble capa de autorización:**

1. **Backend (middlewares en `auth.middleware.ts`):**
   - `verificarToken` → valida el JWT y carga `req.usuario`.
   - `soloAdmin` → restringe a ADMIN.
   - `soloRoles('ADMIN','PROFESOR')` → restringe a una lista de roles.

2. **Frontend (`AuthGuard`):** valida sesión y compara el rol contra `data: { roles: [...] }` de cada ruta; si no coincide, redirige al panel del rol correcto.

**Qué puede hacer cada rol:**

| Acción | ADMIN | PROFESOR | ESTUDIANTE |
|---|:---:|:---:|:---:|
| Gestionar cursos, docentes, matrículas, anuncios | ✅ | ❌ | ❌ |
| Consultar cédula / crear admin | ✅ | ❌ | ❌ |
| Registrar/editar notas, asistencia, disciplina, supletorios, examen | ✅ | ✅ | ❌ |
| Generar reportes oficiales (AL9 solo admin; otros admin/profesor) | ✅ | parcial | ❌ |
| Consultar sus materias / sus notas (lectura) | ✅ | ✅ | ✅ |

> **Detalle defendible:** las rutas de **escritura** de notas están protegidas con `soloRoles('ADMIN','PROFESOR')`; las de **lectura** quedan abiertas a cualquier usuario autenticado porque el panel del estudiante las consume.

---

## 4. MANEJO DE ERRORES Y VALIDACIONES

**Backend:**

- **Patrón uniforme `try/catch`** en cada controlador, devolviendo JSON con `{ error: '...' }` y el código HTTP correcto:
  - `400` datos inválidos · `401` no autenticado / credenciales incorrectas · `403` sin permiso / IP bloqueada · `404` no encontrado · `500` error del servidor · `502` problema con la API externa de cédula.
- **Validaciones explícitas** (ejemplo en contraseñas, `auth.controller.ts`): mínimo 8 caracteres, al menos una mayúscula y un número, con mensajes claros en español.
- **Validación de existencia:** "Usuario no encontrado", "Código inválido o expirado", etc.
- **Restricciones a nivel de base de datos** (Prisma): campos `@unique` (correo, cédula, matrículaNo) y `@@unique` compuestos que impiden duplicados de notas.

**Frontend:**

- Formularios con validación de Angular (campos requeridos, formatos).
- Mensajes de error mostrados al usuario (snackbars/alertas de Angular Material) según la respuesta del backend.

**Seguridad / defensa:**

- **Middleware anti-DoS** (`defensa.middleware.ts`): máx. **50 peticiones/minuto por IP**; tras 3 infracciones, bloqueo de **5 minutos** (lista negra en memoria). Devuelve `429` (rate limit) o `403` (IP bloqueada) con cabeceras `X-RateLimit-*` y `Retry-After`.

---

## 5. BUENAS PRÁCTICAS IMPLEMENTADAS (reales en el código)

1. **Encriptación de contraseñas:** `bcryptjs` con hash y salt (factor 10) — nunca se guardan en texto plano.
2. **Autenticación con tokens (JWT)** y autorización por roles en el servidor.
3. **ORM (Prisma):** consultas tipadas, migraciones versionadas, prevención de inyección SQL.
4. **Separación en capas:** rutas → controladores → cliente Prisma compartido (singleton). Frontend separado en componentes/servicios.
5. **Modularización:** un archivo por entidad de dominio (rutas, controladores y servicios independientes).
6. **TypeScript** en backend y frontend (tipado estático, menos errores en tiempo de ejecución).
7. **Variables de entorno** (`.env` + Railway) para datos sensibles (`DATABASE_URL`, `JWT_SECRET`, `CEDULA_API_TOKEN`, `PORT`).
8. **Control de versiones con Git** (historial claro con prefijos `feat:`, `fix:`, `chore:`).
9. **Transacciones de base de datos** (`prisma.$transaction`) en operaciones críticas (ej. matrícula crea usuario + matrícula + datos en una sola transacción atómica).
10. **Componentes standalone de Angular** (arquitectura moderna, sin NgModules).
11. **Defensa contra abuso** (rate limiting anti-DoS).
12. **Normalización de datos** (modelo relacional bien normalizado: matrícula con tablas satélite 1:1).

---

## 6. INTEGRACIÓN DE COMPONENTES

```
[ Angular 21 SPA ]  --HTTP/JSON + JWT-->  [ Express API REST ]  --Prisma-->  [ PostgreSQL ]
   (Netlify)                                  (Railway)                         (Railway)
        |                                         |
        |                                         +--> API externa de Cédula (apiconsult.zampisoft.com)
        |                                         +--> Generación de Word (.docx) con docxtemplater + pizzip
        +--> Envío de correos de recuperación (EmailJS, cliente)
```

- **Frontend ↔ Backend:** cada servicio Angular (`*.service.ts`) consume la API REST enviando el token JWT en la cabecera `Authorization`. No hay interceptor: cada servicio arma sus propias cabeceras (`getHeaders()`).
- **Backend ↔ Base de datos:** Prisma Client (singleton en `lib/prisma.ts`) traduce el modelo a SQL sobre PostgreSQL.
- **Servicio externo 1 — API de Cédula:** el backend hace de proxy a `apiconsult.zampisoft.com` para autocompletar datos del estudiante a partir de la cédula ecuatoriana.
- **Servicio externo 2 — Generación de documentos Word:** controladores rellenan plantillas oficiales `.docx` (con marcadores `{placeholder}`) usando `docxtemplater` + `pizzip` y las devuelven como descarga.
- **Servicio externo 3 — EmailJS:** el envío de correos de recuperación de contraseña se hace desde el cliente.
- **Subida de archivos:** imágenes de anuncios vía `multer` a `/uploads` (servido estáticamente).

---

## 7. CAMBIOS RECIENTES (últimas ~3 semanas, según `git log`)

**Junio 14 (lo más nuevo):**

- Reportes **AL16** (certificado de promoción) y **AL22** (cuadro de aprobados/no aprobados de grados).

**Junio 11:**

- Integración con la **API de cédula** corregida al nuevo formato de respuesta (objeto plano).
- **Seguridad:** protección de `crear-admin` y autorización por rol en las rutas de notas.
- Unificación del **encabezado** (flecha "en cuadrito") en pantallas pendientes.
- Corrección de **disciplina por submateria** con semestres y doble ponderación.
- Corrección de **URL de imágenes** de anuncios en paneles de profesor y estudiante.

**Junio 8:**

- **Autocompletado de matrícula por cédula** (API ApiConsult).
- Títulos de pestaña en las pantallas de mediciones.

**Junio 3:**

- **Módulo de Examen de Grado** con documentos AL19 y AL23.
- **Middleware anti-DoS**.
- **Cambio obligatorio y recuperación de contraseña** con EmailJS.
- Opción "Otro" en el campo sexo de matrícula/documentos.
- Preparación para **producción** (Railway/Netlify, scripts de build, migraciones).
