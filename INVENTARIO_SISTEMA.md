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
| **Mensajería Interna / Chat** | Comunicación bidireccional entre Estudiantes, Docentes y Administradores con identidad institucional (Azul Marino `#1a2a5e` y Oro `#c8a84b`), directorio seguro de contactos, contador de no leídos y filtros por rol. |
| **Buscador Global (`Ctrl + K`)** | *(Nuevo)* Búsqueda universal instantánea de estudiantes y especialidades con autocompletado y acceso directo a carnet digital y ficha del curso. |
| **Semáforo de Riesgo Académico** | *(Nuevo)* Sistema de alerta temprana basado en la normativa legal artesanal (mínimo legal de 80% de asistencia y 7.00/10 en promedio general) con alertas visuales en panel estudiantil y tabla docente. |
| **Repositorio de Recursos de Taller** | *(Nuevo)* Biblioteca digital didáctica organizada por tipo (Guías de taller en PDF, Listas de materiales e insumos, Videos tutoriales, Documentos técnicos) con permisos de publicación para docentes/administración y consulta/descarga para estudiantes. |
| **Reportes y Documentos** | Generación de formularios oficiales en Word (.docx): AL9, AL12, AL13, AL14, AL15, **AL16**, AL18, AL19, **AL20**, **AL22**, AL23, certificados y ficha de matrícula. |
| **Dashboards por rol** | Paneles diferenciados para Admin, Profesor y Estudiante. |

### Funcionalidades NUEVAS / RECIENTES (a destacar)

- **Buscador Global Rápido (`Ctrl + K`)** — Diálogo accesible por atajo de teclado o botón en la cabecera que busca en tiempo real estudiantes activos (por apellido, nombre, cédula o N.º matrícula) y especialidades de taller, permitiendo abrir directamente el Carnet Digital 3D o navegar al curso.
- **Semáforo de Riesgo Académico y de Asistencia (Diseño Institucional Armónico)** — Indicador en tiempo real que evalúa la permanencia y titulación artesanal con diseño sobrio y profesional (tarjetas métricas con referencias normativas y diagnóstico institucional):
  - 🟢 **Verde (Rendimiento Óptimo)**: Asistencia $\ge 85\%$ y promedio general $\ge 7.00$.
  - 🟡 **Amarillo (En Observación)**: Asistencia $80\% - 84\%$ (margen legal estrecho) o promedio en zona de supletorio ($5.00 - 6.99$).
  - 🔴 **Rojo (Riesgo Crítico)**: Asistencia $< 80\%$ (reprobación automática por inasistencia según normativa) o promedio insuficiente ($< 5.00$).
- **Repositorio de Recursos y Guías Didácticas de Taller** — Espacio centralizado para compartir material técnico de taller clasificado en: Guías prácticas en PDF, Listas de materiales e insumos, Videos tutoriales/demostraciones y Documentos de normativa, integrado en el Aula Virtual y en la gestión de cursos.
- **Segmentación de Anuncios y Avisos (Centro vs. Docentes)** — Clasificación automática y pestañas de filtrado en paneles de Estudiante, Profesor y Gestor de Anuncios (`Todos`, `🏛️ Comunicados del Centro`, `👨‍🏫 Avisos de Docentes por Materia`) para una comunicación institucional clara y ordenada.
- **Gestión Segura de Base de Datos y Migraciones Versionadas** — La base de datos vive en PostgreSQL (Supabase). No se ejecutan comandos destructivos locales (`db push` ni `migrate reset`). Los cambios de esquema (`MensajeInterno`, `RecursoDidactico`) se gestionan mediante migraciones SQL idempotentes versionadas en `backend/prisma/migrations/`, desplegadas automáticamente en el servidor con `prisma migrate deploy`.
- **Módulo de Chat y Mensajería Institucional Guadalupana** — Comunicación directa Estudiante ↔ Docente ↔ Administrador con diseño corporativo institucional, badges de mensajes no leídos y filtros por rol.
- **Campana de Notificaciones y Avisos** en las cabeceras de todos los dashboards con alertas en vivo de mensajes, anuncios y tareas.
- **Carnet Digital Estudiantil Visual Ampliado** con simulación de credencial física y rotación 3D interactiva (frente y reverso con foto, tipografía institucional ampliada, dirección institucional completa sin recortes, vigencia y código de barras).
- **Reporte Oficial AL20** (listado de participantes a titularse, exclusivo para alumnos aprobados $\ge 7.00$) con plantilla Word oficial de la Junta Nacional de Defensa del Artesano.
- **Reportes AL16** (certificado de promoción, por estudiante) y **AL22** (cuadro de aprobados/no aprobados, por curso).
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
| **Mensaje Interno (Chat)** | ✅ | ✅ | ✅* | ❌ | Comunicación interna; *actualización automática de estado `leido`. |

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

**Noviembre 14 (lo más nuevo):**

- **Módulo de Chat y Mensajería Institucional Guadalupana:**
  - Sistema de comunicación bidireccional Estudiante ↔ Docente ↔ Administrador.
  - Modelo `MensajeInterno` con relaciones para remitente, destinatario y materia referenciada.
  - Migración SQL `20261114120000_mensajeria_institucional` lista para aplicación automática en producción.
  - Controlador `/api/chat` con directorio seguro contextual por rol, paginación, envío de mensajes y recuento de no leídos.
  - Componente Angular standalone `/chat` con interfaz corporativa Guadalupana (Azul Marino `#1a2a5e` y Dorado `#c8a84b`), autoscroll, badges en tiempo real y filtros rápidos por rol.
  - Integración de accesos directos en los tres dashboards (Administrador, Profesor y Estudiante).
  - Suite de pruebas de backend ampliada a 71 pruebas exitosas (0 fallos).
- **Campana de Notificaciones Institucional:**
  - Componente compartido `CampanaNotificaciones` integrado en las barras superiores de Admin, Profesor y Estudiante.
  - Indicador numérico (badge rojo) en tiempo real de mensajes internos no leídos, tareas pendientes con fecha límite próxima, anuncios del centro y prospectos web.
  - Menú desplegable interactivo con acceso directo en un clic al Chat o módulo correspondiente.
  - Endpoint `GET /api/notificaciones/resumen` y sondeo automático en segundo plano.
- **Carnet Digital Estudiantil Visual Guadalupana:**
  - Credencial digital oficial de alta fidelidad con acabado Azul Marino (`#1a2a5e`) y Dorado (`#c8a84b`).
  - Animación 3D interactiva de rotación (Flip Card) para alternar entre el anverso (foto del estudiante, datos académicos, rama artesanal, cédula, código de barras) y el reverso (reglamento institucional, período, firma y contacto).
  - Accesible para el estudiante desde su panel personal y para el administrador desde la lista de alumnos de cada curso.
- **Reporte Oficial AL20 (`LISTADO PARTICIPANTES A TITULARSE`):**
  - Plantilla oficial Word (.docx) basada en el formato físico de la Junta Nacional de Defensa del Artesano.
  - Cuatro columnas: No., Apellidos y Nombres (mayúsculas), Nro. de Cédula de Ciudadanía, Nacionalidad.
  - Filtro estricto de aprobación: solo incluye estudiantes que superaron todas las materias con nota $\ge 7.00$.
  - Endpoint `GET /api/supletorios/al20/:cursoId` y tarjeta de descarga en el módulo de Reportes.

**Junio 14:**

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
