# Especificación: importador de guardias desde el programa de horarios

Proyecto: "Nadie se queda sin cubrir" (IES Río Arba). Node.js + Express + MySQL + JS vanilla.

Antes de tocar nada, lee `database/schema.sql`, `controllers/guardias.controller.js`, `controllers/usuarios.controller.js`, `controllers/auth.controller.js` y `public/pages/admin/guardias.html`. Adapta los nombres de columnas y tramos de esta especificación a los que ya existen en el proyecto; no dupliques conceptos que ya estén.

---

## 1. Objetivo

El equipo directivo exporta cada curso dos archivos desde el programa de horarios (`Guardias_ESO.xls` y `Guardias_Bto.xls`). El sistema debe leerlos y cargar todas las guardias planificadas del curso, resolviendo automáticamente la mayor parte de los nombres y dejando para revisión manual solo lo que no pueda resolver.

Sustituye la importación Excel actual (`POST /guardias/creadas/importar-excel`) por esta nueva. La importación CSV puede quedarse como está.

No hace falta horario de clases: cuando un profesor registra una ausencia ya indica fecha, tramo y aula, y eso es lo que le llega al sustituto.

---

## 2. Formato de los archivos

- Extensión `.xls`, pero no son BIFF válidos: `xlrd` falla. SheetJS (`xlsx`) o una conversión con LibreOffice sí los abren. Probar primero con SheetJS `read(buffer, {type:'buffer'})`; si falla, convertir con LibreOffice headless en el contenedor Docker. El importador debe aceptar también `.xlsx` por si el directivo lo guarda desde Excel.
- Una sola hoja (nombre `MyTab`, pero no depender del nombre: usar la primera hoja).
- Estructura:

| Celda / zona | Contenido |
|---|---|
| A1 | Nombre del edificio: `ESO` o `Bachillerato` |
| A2 | `/~\` (ignorar) |
| B2..F2 | `Lunes`, `Martes`, `Miércoles`, `Jueves`, `Viernes` |
| A3..A9 | Tramos: `8:30\n9:20`, `9:25\n10:15`, `10:20\n11:10`, (vacío), `11:45\n12:35`, `12:40\n13:30`, `13:35\n14:25` |
| Fila con `recreo` en B..F | Ignorar |
| Celdas B3..F9 | Cero o más nombres separados por `\n` |

- Los nombres vienen en mayúsculas, a veces sin acentos, con abreviaturas (`FCO. MONSAL`, `M. CELESTINO`, `Mª RIO`) y sin correo.
- Además de nombres aparecen **códigos de plaza**: `SIF1`…`SIF4`, `GH1`. Son plazas que aún no tienen persona (profesorado que se incorpora tarde). Patrón a detectar: `^[A-Z]{2,4}\d{1,2}$`. Hacerlo configurable en `.env` (`PLAZA_CODIGO_REGEX`) por si aparecen otros prefijos.
- Mapeo de edificio: `ESO` → edificio ESO; `Bachillerato` → edificio Bachillerato (incluye FP). Comparar sin acentos y sin distinguir mayúsculas. Si A1 no coincide con ningún edificio de la tabla `edificio`, devolver error claro.
- Mapeo de tramos: **por posición de fila**, no por hora. Las filas con hora en la columna A, en orden y saltando la de recreo, corresponden a los tramos 1..6 de la app (`1a hora`, `2a hora`, `3a hora`, `4a hora`, `5a hora`, `6a hora`). Las horas del Excel (8:30-9:20…) no coinciden con las que hoy tiene la app hardcodeadas (08:15-09:10…), así que no se debe emparejar por hora. Si aparecen más o menos de 6 filas con hora, error claro indicando cuántas se han encontrado.
- **Centralizar los tramos**: crear `config/tramos.js` que exporte el array de 7 tramos (6 lectivos + recreo) con `{ orden, etiqueta, inicio, fin, lectivo }`, usando las horas reales del Excel (8:30-9:20, 9:25-10:15, 10:20-11:10, recreo 11:10-11:45, 11:45-12:35, 12:40-13:30, 13:35-14:25). Sustituir los arrays duplicados de `guardias.html`, `guardias.controller.js` (TRAMO_MAP) y `espacios.controller.js` por este módulo (el frontend lo recibe por un endpoint `GET /guardias/tramos` o se inyecta en `auth.js`). Añadir validación Zod que solo acepte etiquetas de ese array en `tramo_horario`. Incluir en la migración un `UPDATE` que renombre las etiquetas antiguas ya guardadas a las nuevas si cambian.

---

## 3. Cambios en base de datos

Añadir a `schema.sql` (y una migración `database/migrations/00X_importador_guardias.sql` para instalaciones ya desplegadas):

```sql
-- Plazas pendientes de persona (SIF1, GH1...)
CREATE TABLE plaza_pendiente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL,
  curso VARCHAR(9) NOT NULL,              -- '2026-2027'
  id_usuario INT NULL,                    -- se rellena cuando se incorpora la persona
  fecha_asignacion DATETIME NULL,
  UNIQUE KEY uq_plaza (codigo, curso),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id)
);

-- Alias de nombres del Excel -> usuario (memoria de emparejamientos confirmados)
CREATE TABLE alias_profesor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_normalizado VARCHAR(150) NOT NULL UNIQUE,
  id_usuario INT NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id)
);

-- Profesores que aparecen en el Excel pero aún no han hecho login
CREATE TABLE profesor_pendiente_login (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_normalizado VARCHAR(150) NOT NULL UNIQUE,
  nombre_original VARCHAR(150) NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Modificar `guardia_creada` (columnas reales: `id_guardia_creada`, `fecha`, `dia_semana`, `tramo_horario`, `curso_escolar`, `id_usuario`, `id_espacio`):

```sql
ALTER TABLE guardia_creada
  MODIFY id_usuario INT UNSIGNED NULL,               -- NULL si es plaza pendiente o pendiente de login
  ADD COLUMN id_edificio INT UNSIGNED NULL,           -- edificio de la guardia; deja de usarse el apaño de id_espacio LIMIT 1
  ADD COLUMN id_plaza_pendiente INT NULL,
  ADD COLUMN id_profesor_pendiente INT NULL,
  ADD COLUMN origen ENUM('MANUAL','CSV','EXCEL') NOT NULL DEFAULT 'MANUAL',
  ADD FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio),
  ADD FOREIGN KEY (id_plaza_pendiente) REFERENCES plaza_pendiente(id),
  ADD FOREIGN KEY (id_profesor_pendiente) REFERENCES profesor_pendiente_login(id),
  ADD CONSTRAINT chk_guardia_titular CHECK (
    (id_usuario IS NOT NULL) + (id_plaza_pendiente IS NOT NULL) + (id_profesor_pendiente IS NOT NULL) = 1
  );
-- Rellenar id_edificio de las filas existentes a partir de id_espacio
UPDATE guardia_creada gc JOIN espacio e ON e.id_espacio = gc.id_espacio SET gc.id_edificio = e.id_edificio WHERE gc.id_edificio IS NULL;
```

Usar la columna `curso_escolar` que ya existe (formato `2026-2027`). Crear `helpers/curso.helper.js` con `cursoActual()` e `inicioCursoActual()` (septiembre → agosto) y sustituir el cálculo duplicado en `buscarCandidatos` y `guardiasHoy`. Añadir validación Zod de formato `^\d{4}-\d{4}$` en `curso_escolar`. Ajustar los nombres de PK/FK a los que use el schema (`id_usuario`, `id_edificio`, etc.).

En todas las consultas que filtren guardias por edificio, usar `gc.id_edificio` en lugar de pasar por `espacio`. En la importación, `id_espacio` queda NULL: el aula concreta la indica el profesor ausente al registrar la ausencia.

Añadir un tipo nuevo al ENUM de `notificacion.tipo`: `PLAZA_SIN_ASIGNAR`.

---

## 4. Normalización y emparejamiento de nombres

Crear `services/nombres.service.js` con:

```js
normalizar(texto)
// 1. trim, colapsar espacios
// 2. quitar acentos (NFD + eliminar diacríticos)
// 3. mayúsculas
// 4. expandir abreviaturas: 'FCO.' -> 'FRANCISCO', 'M.' y 'Mª' -> 'MARIA',
//    'JOSE M.' -> 'JOSE MARIA', 'Mª' al inicio -> 'MARIA'
// 5. quitar puntos y caracteres no alfabéticos
```

```js
emparejar(nombreExcel, usuarios)  // usuarios = [{id, nombre, apellidos}]
// Devuelve { tipo: 'EXACTO' | 'PROBABLE' | 'NINGUNO', candidatos: [{id, nombre, apellidos, score}] }
// Orden de comprobación:
//   a) alias_profesor por nombre_normalizado -> EXACTO
//   b) normalizar(nombre + ' ' + apellidos) === normalizar(nombreExcel) -> EXACTO
//   c) mismo conjunto de tokens ignorando orden -> EXACTO
//   d) similitud (Jaro-Winkler o ratio de tokens comunes) >= 0.85 -> PROBABLE (máx. 3 candidatos)
//   e) si no -> NINGUNO
```

Añadir la dependencia `string-similarity` o implementar Jaro-Winkler a mano (sin dependencias nuevas es preferible).

---

## 5. Flujo de importación (dos fases)

### Fase 1: `POST /guardias/creadas/importar-excel/analizar`

Multipart con uno o dos archivos (`archivos[]`). Solo `ADMINISTRADOR` y `EQUIPO_DIRECTIVO`.

1. Parsear cada archivo según §2. Validar edificio y tramos.
2. Para cada nombre único del archivo, clasificar:
   - Código de plaza → `PLAZA`
   - `emparejar()` → `EXACTO`, `PROBABLE`, `NINGUNO`
3. Devolver un JSON de previsualización **sin guardar nada**:

```json
{
  "ok": true,
  "datos": {
    "curso": "2026-2027",
    "archivos": [
      { "nombre": "Guardias_ESO.xls", "edificio": { "id": 1, "nombre": "ESO" }, "guardias": 88 }
    ],
    "resueltos": [ { "nombreExcel": "NILO VEGA BERNAL", "id_usuario": 12, "nombre": "Nilo Vega Bernal" } ],
    "probables": [ { "nombreExcel": "FCO. MONSAL ELISA QUERO", "candidatos": [ { "id_usuario": 30, "nombre": "Francisco Monsal Elisa Qúero", "score": 0.93 } ] } ],
    "sinCuenta": [ { "nombreExcel": "DARIO JACINTO ESTANDARINA" } ],
    "plazas": [ "SIF1", "SIF2", "SIF3", "SIF4", "GH1" ],
    "guardias": [ { "edificio_id": 1, "dia": 1, "tramo": 1, "nombreExcel": "NILO VEGA BERNAL" } ]
  }
}
```

### Fase 2: `POST /guardias/creadas/importar-excel/confirmar`

Body JSON con el resultado de la fase 1 más las decisiones del usuario:

```json
{
  "curso": "2026-2027",
  "edificios": [1, 2],
  "guardias": [...],
  "decisiones": {
    "FCO. MONSAL ELISA QUERO": { "accion": "VINCULAR", "id_usuario": 30 },
    "DARIO JACINTO ESTANDARINA": { "accion": "PENDIENTE_LOGIN" },
    "OTRO NOMBRE": { "accion": "IGNORAR" }
  }
}
```

Todo dentro de **una transacción**:

1. Para cada decisión `VINCULAR`: insertar en `alias_profesor` (ON DUPLICATE KEY UPDATE).
2. Para cada `PENDIENTE_LOGIN`: insertar en `profesor_pendiente_login` si no existe.
3. Para cada código de plaza: insertar en `plaza_pendiente (codigo, curso)` si no existe.
4. Borrar de `guardia_creada` las filas con `origen = 'EXCEL'`, `curso_escolar` actual y `id_edificio IN (edificios)`. **Nunca tocar `guardia_asignada`** (son las guardias ya realizadas y se usan para la equidad).
5. Insertar las guardias nuevas con `dia_semana` (1-5), `tramo_horario` (etiqueta de `config/tramos.js`), `curso_escolar`, `id_edificio`, `origen = 'EXCEL'` y el titular correspondiente: `id_usuario`, `id_plaza_pendiente` o `id_profesor_pendiente`. Ignorar filas idénticas dentro del mismo archivo (mismo nombre, día y tramo).
6. Registrar en `log_acciones` con resumen (archivos, nº guardias, nº vinculaciones).

Devolver resumen: guardias creadas, profesores resueltos, plazas pendientes, pendientes de login.

Validar ambos endpoints con Zod en `validators/guardias.validator.js`.

---

## 6. Vinculación automática en el primer login

En `auth.controller.js`, después de crear el usuario nuevo en el primer login con Google:

1. `nombreNorm = normalizar(nombre + ' ' + apellidos)`.
2. Buscar en `profesor_pendiente_login` por `nombre_normalizado` (exacto, y si no, con `emparejar()` tipo EXACTO por tokens).
3. Si hay coincidencia: `UPDATE guardia_creada SET id_usuario = ?, id_profesor_pendiente = NULL WHERE id_profesor_pendiente = ?`, borrar la fila pendiente, insertar alias, registrar en log.
4. Si **no** hay coincidencia y el usuario nuevo no tiene ninguna guardia: crear una notificación tipo `PLAZA_SIN_ASIGNAR` para todos los usuarios con rol `EQUIPO_DIRECTIVO` y `ADMINISTRADOR`, con texto "X se ha registrado y no tiene guardias asignadas. ¿Ocupa alguna plaza pendiente?", y enlace a `/pages/admin/usuarios.html?vincular=<id_usuario>`. Enviar también email si SMTP está configurado.

---

## 7. Asignar una plaza pendiente a una persona

Endpoint `POST /usuarios/:id/asignar-plaza` (solo `ADMINISTRADOR` y `EQUIPO_DIRECTIVO`), body `{ "codigo": "SIF2" }`:

1. Comprobar que la plaza existe para el curso actual y no tiene `id_usuario`.
2. Comprobar que el usuario tiene rol PROFESOR (si no lo tiene, añadirlo).
3. Transacción: `UPDATE plaza_pendiente SET id_usuario = ?, fecha_asignacion = NOW()`; `UPDATE guardia_creada SET id_usuario = ?, id_plaza_pendiente = NULL WHERE id_plaza_pendiente = ?`.
4. Marcar como leídas las notificaciones `PLAZA_SIN_ASIGNAR` de ese usuario. Log.

Endpoint `GET /usuarios/plazas-pendientes` → lista de códigos del curso actual con estado (libre / asignada a quién).

Endpoint `DELETE /usuarios/plazas/:codigo/desvincular` por si se asigna a la persona equivocada: revierte las guardias a la plaza.

---

## 8. Cambios en la lógica de guardias existente

- `buscarCandidatos` y `guardiasHoy`: solo considerar `guardia_creada` con `id_usuario IS NOT NULL`. Las plazas pendientes y los pendientes de login no son candidatos.
- En las vistas de guardias planificadas (admin y directivo), mostrar las guardias sin persona con una etiqueta visual: `SIF2 (plaza pendiente)` o `DARIO JACINTO (sin login todavía)`.
- Corregir de paso la interpolación `WHERE fecha >= '${inicioCurso}'` por parámetro preparado.
- Eliminar el apaño de asignar `id_espacio` con `LIMIT 1` en la importación.

---

## 9. Frontend

### `public/pages/admin/guardias.html` (tab Planificadas)

Sustituir el botón actual de importar Excel por un asistente de 3 pasos (modal Bootstrap, sin `alert()`/`confirm()` nativos):

1. **Subir archivos**: uno o dos `.xls/.xlsx`. Muestra curso detectado y edificio de cada archivo.
2. **Revisar nombres**: tres bloques.
   - Resueltos automáticamente (colapsado, solo el contador y un enlace para verlos).
   - Probables: una fila por nombre con el nombre del Excel, un `<select>` con los candidatos (preseleccionado el de mayor score) y la opción "Ninguno de estos → dejar pendiente de login".
   - Sin cuenta: una fila por nombre con radio "Pendiente de login" (por defecto) / "Vincular a…" (buscador de usuarios) / "Ignorar".
   - Plazas detectadas: lista informativa.
   - Aviso claro: "Se sustituirán las guardias planificadas de los edificios ESO y Bachillerato del curso 2026-2027 importadas anteriormente. Las guardias ya realizadas no se tocan."
3. **Confirmar**: llama a `/confirmar`, muestra el resumen y recarga la tabla.

Spinner durante el análisis. Errores de formato (edificio o tramo no reconocido) se muestran indicando fila/celda.

### `public/pages/admin/usuarios.html` y `profesores.html`

- Nueva columna/badge "Plaza" (código si tiene plaza asignada).
- Botón "Asignar plaza" en cada profesor sin guardias → modal con `<select>` de plazas libres del curso.
- Si la URL trae `?vincular=<id>`, abrir ese modal directamente para ese usuario (es el enlace de la notificación).
- Nueva sección/tab "Plazas pendientes" con la lista de códigos, estado y botón "Desvincular".

### Notificaciones

El tipo `PLAZA_SIN_ASIGNAR` debe mostrarse con icono propio y abrir el enlace anterior al pulsar.

### Sidebar

No hace falta añadir entradas nuevas; todo cuelga de Guardias y Usuarios.

---

## 10. Seguridad y validación

- Rutas nuevas protegidas con `requiereRol('ADMINISTRADOR','EQUIPO_DIRECTIVO')`.
- Límite de tamaño de archivo 2 MB y solo extensiones `.xls`/`.xlsx` (multer).
- Escapar siempre los nombres del Excel al pintarlos en el DOM (`textContent` o una función `escapeHtml`), nunca `innerHTML` directo: el contenido viene de un archivo externo.
- Toda escritura en BD de §5, §6 y §7 en transacción.

---

## 11. Pruebas

Añadir en `tests/` (o donde estén las pruebas del proyecto) al menos:

- `nombres.service`: normalización de `FCO. MONSAL ELISA QUERO`, `Mª RIO BORJÁ LIDIA`, `M. CELESTINO FLORA BIEL`; emparejamiento exacto, por tokens desordenados, probable y ninguno.
- Parser: con los dos archivos reales de muestra (`Guardias_ESO.xls`, `Guardias_Bto.xls`), comprobar que ESO produce 88 entradas de guardia y Bachillerato 19, que detecta `SIF1`–`SIF4` y `GH1`, que ignora la fila de recreo y que las celdas vacías no generan filas.
- Importación: reimportar dos veces el mismo archivo no duplica guardias; reimportar solo ESO no borra Bachillerato; `guardia_asignada` queda intacta.
- Primer login: un usuario cuyo nombre está en `profesor_pendiente_login` hereda sus guardias; uno que no está genera notificación a directivos.
- Asignar plaza: las guardias de `SIF2` pasan al usuario y dejan de aparecer como plaza.

---

## 12. Datos de prueba

Añadir a `seed.sql` una plaza `SIF1` del curso actual con 3 guardias, un `profesor_pendiente_login` con 2 guardias, y un alias de ejemplo, para poder probar las pantallas sin importar nada.

---

## 13. Orden de trabajo sugerido

1. Migración y `schema.sql` (incluye `config/tramos.js` y `helpers/curso.helper.js`).
2. `nombres.service.js` + tests.
3. Parser de archivos + tests con los archivos reales.
4. Endpoints analizar/confirmar + validadores.
5. Cambios en `buscarCandidatos` / `guardiasHoy`.
6. Login: vinculación automática y notificación.
7. Endpoints de plazas.
8. Frontend: asistente de importación, modal de plaza, tab de plazas.
9. Seed y actualización del manual de usuario del directivo (`manual-*.html`).

Al terminar cada bloque, ejecutar los tests y hacer un commit separado con mensaje descriptivo.
