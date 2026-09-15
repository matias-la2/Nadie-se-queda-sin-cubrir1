-- ============================================================
-- seed.sql — Datos iniciales para desarrollo
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

SET NAMES utf8mb4;

-- ─── Roles del sistema ─────────────────────────────────────
INSERT INTO rol (nombre_rol) VALUES
  ('PROFESOR'),
  ('EQUIPO_DIRECTIVO'),
  ('ADMINISTRADOR'),
  ('CONSERJE');

-- ─── Edificios ─────────────────────────────────────────────
INSERT INTO edificio (nombre, piso) VALUES
  ('ESO', '3 plantas'),
  ('Bachillerato', '2 plantas');

-- ─── Espacios ──────────────────────────────────────────────
INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES
  ('Aula 1A ESO',            'DISPONIBLE',    30, 1),
  ('Aula 1B ESO',            'DISPONIBLE',    28, 1),
  ('Aula 2A ESO',            'DISPONIBLE',    30, 1),
  ('Sala de Informática ESO','DISPONIBLE',    25, 1),
  ('Aula 1A Bach',           'DISPONIBLE',    30, 2),
  ('Aula 1B Bach',           'DISPONIBLE',    28, 2),
  ('Laboratorio de Ciencias','DISPONIBLE',    20, 2),
  ('Salón de Actos Bach',    'DISPONIBLE',   150, 2);

-- ─── Clases ────────────────────────────────────────────────
INSERT INTO clase (curso) VALUES
  ('1º ESO A'),
  ('1º ESO B'),
  ('2º ESO A'),
  ('2º ESO B'),
  ('3º ESO A'),
  ('3º ESO B'),
  ('4º ESO A'),
  ('1º BACH A'),
  ('2º BACH A');

-- ─── Usuarios de prueba ────────────────────────────────────
-- NOTA: google_id simulados para desarrollo. En producción vendrán de OAuth real.
INSERT INTO usuario (nombre, apellidos, correo, google_id, avatar_url) VALUES
  ('Elena',  'García Martínez',   'elena@iesrioarba.es',  'google_001', NULL),
  ('Carlos', 'López Fernández',   'carlos@iesrioarba.es', 'google_002', NULL),
  ('María',  'Sánchez Ruiz',      'maria@iesrioarba.es',  'google_003', NULL),
  ('Admin',  'Sistema IES',       'admin@iesrioarba.es',  'google_004', NULL),
  ('Jefe',   'Estudios Arba',     'jefe@iesrioarba.es',   'google_005', NULL);

-- ─── Asignación de roles ───────────────────────────────────
-- Elena = PROFESOR
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (1, 1);
-- Carlos = PROFESOR
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (2, 1);
-- María = EQUIPO_DIRECTIVO
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (3, 2);
-- Admin = ADMINISTRADOR
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (4, 3);
-- Jefe = PROFESOR + EQUIPO_DIRECTIVO (doble rol)
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (5, 1);
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (5, 2);

-- ─── Datos subtipo profesor ────────────────────────────────
INSERT INTO profesor (id_usuario, departamento) VALUES
  (1, 'Matemáticas'),
  (2, 'Lengua Castellana'),
  (5, 'Ciencias Naturales');

-- ─── Datos subtipo equipo directivo ────────────────────────
INSERT INTO equipo_directivo (id_usuario, cargo) VALUES
  (3, 'Directora'),
  (5, 'Jefe de Estudios');

-- ─── Asignación de profesores a edificios ──────────────────
-- Elena → ESO
INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (1, 1);
-- Carlos → Bachillerato
INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (2, 2);
-- Jefe de Estudios → ambos edificios
INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (5, 1);
INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (5, 2);

-- ─── Guardias creadas (planificadas, curso 2025-2026) ──────
-- Elena: Lunes 1a hora en Aula 1A ESO, Miércoles 3a hora en Aula 1B ESO
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio, id_edificio) VALUES
  (1, '1a hora (08:30-09:20)', '2025-2026', 1, 1, 1),
  (3, '3a hora (10:20-11:10)', '2025-2026', 1, 2, 1);
-- Carlos: Martes 2a hora en Aula 1A Bach, Jueves 4a hora en Aula 1B Bach
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio, id_edificio) VALUES
  (2, '2a hora (09:25-10:15)', '2025-2026', 2, 5, 2),
  (4, '4a hora (11:45-12:35)', '2025-2026', 2, 6, 2);
-- Jefe: Lunes 2a hora en Laboratorio de Ciencias, Viernes 1a hora en Salón de Actos Bach
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio, id_edificio) VALUES
  (1, '2a hora (09:25-10:15)', '2025-2026', 5, 7, 2),
  (5, '1a hora (08:30-09:20)', '2025-2026', 5, 8, 2);

-- ─── Ausencia de prueba ────────────────────────────────────
INSERT INTO ausencia (tramo_horario, fecha, comentario, estado, hay_tarea, descripcion_tarea, id_profesor, id_usuario_creador) VALUES
  ('1a hora (08:30-09:20)', '2026-01-15', NULL, 'CUBIERTA', 1, 'Ejercicios página 45 del libro de Matemáticas', 1, 1);

-- ─── Asociar ausencia al espacio (Aula 1A ESO) ────────────
INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES (1, 1);

-- ─── Guardia asignada de prueba ────────────────────────────
-- Carlos cubre la ausencia de Elena
INSERT INTO guardia_asignada (fecha, tramo_horario, tipo_asignacion, id_ausencia, id_profesor_sustituto, id_clase) VALUES
  ('2026-01-15', '1a hora (08:30-09:20)', 'MANUAL', 1, 2, 1);

-- ─── Plaza pendiente de prueba (SIF1, curso 2026-2027) ─────
INSERT INTO plaza_pendiente (codigo, curso) VALUES ('SIF1', '2026-2027');

-- Guardias de la plaza SIF1: Lunes 1a, Martes 3a, Jueves 5a en edificio ESO
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_plaza_pendiente, id_edificio, origen) VALUES
  (1, '1a hora (08:30-09:20)', '2026-2027', 1, 1, 'EXCEL'),
  (2, '3a hora (10:20-11:10)', '2026-2027', 1, 1, 'EXCEL'),
  (4, '5a hora (12:40-13:30)', '2026-2027', 1, 1, 'EXCEL');

-- ─── Profesor pendiente de login de prueba ─────────────────
INSERT INTO profesor_pendiente_login (nombre_normalizado, nombre_original) VALUES
  ('DARIO JACINTO ESTANDARINA', 'DARIO JACINTO ESTANDARINA');

-- Guardias del profesor pendiente: Miércoles 2a, Viernes 4a en Bachillerato
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_profesor_pendiente, id_edificio, origen) VALUES
  (3, '2a hora (09:25-10:15)', '2026-2027', 1, 2, 'EXCEL'),
  (5, '4a hora (11:45-12:35)', '2026-2027', 1, 2, 'EXCEL');

-- ─── Alias de ejemplo ──────────────────────────────────────
INSERT INTO alias_profesor (nombre_normalizado, id_usuario) VALUES
  ('ELENA GARCIA MARTINEZ', 1);
