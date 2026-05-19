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
-- Elena: Lunes 1ª hora en Aula 1A ESO, Miércoles 3ª hora en Aula 1B ESO
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (1, '1ª hora (08:15-09:10)', '2025-2026', 1, 1),
  (3, '3ª hora (10:10-11:05)', '2025-2026', 1, 2);
-- Carlos: Martes 2ª hora en Aula 1A Bach, Jueves 4ª hora en Aula 1B Bach
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (2, '2ª hora (09:10-10:10)', '2025-2026', 2, 5),
  (4, '4ª hora (11:30-12:25)', '2025-2026', 2, 6);
-- Jefe: Lunes 2ª hora en Laboratorio de Ciencias, Viernes 1ª hora en Salón de Actos Bach
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (1, '2ª hora (09:10-10:10)', '2025-2026', 5, 7),
  (5, '1ª hora (08:15-09:10)', '2025-2026', 5, 8);

-- ─── Ausencia de prueba ────────────────────────────────────
INSERT INTO ausencia (tramo_horario, fecha, comentario, estado, hay_tarea, descripcion_tarea, id_profesor, id_usuario_creador) VALUES
  ('1ª hora (08:15-09:10)', '2026-01-15', NULL, 'CUBIERTA', 1, 'Ejercicios página 45 del libro de Matemáticas', 1, 1);

-- ─── Asociar ausencia al espacio (Aula 1A ESO) ────────────
INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES (1, 1);

-- ─── Guardia asignada de prueba ────────────────────────────
-- Carlos cubre la ausencia de Elena
INSERT INTO guardia_asignada (fecha, tramo_horario, tipo_asignacion, id_ausencia, id_profesor_sustituto, id_clase) VALUES
  ('2026-01-15', '1ª hora (08:15-09:10)', 'MANUAL', 1, 2, 1);
