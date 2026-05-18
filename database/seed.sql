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
  ('Edificio Principal', '3 plantas'),
  ('Edificio Anexo', '2 plantas'),
  ('Pabellón Deportivo', '1 planta');

-- ─── Espacios ──────────────────────────────────────────────
INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES
  ('Aula 1A',                'DISPONIBLE',    30, 1),
  ('Aula 1B',                'DISPONIBLE',    28, 1),
  ('Aula 2A',                'DISPONIBLE',    30, 1),
  ('Sala de Informática',    'DISPONIBLE',    25, 1),
  ('Laboratorio de Ciencias','MANTENIMIENTO', 20, 2),
  ('Salón de Actos',         'DISPONIBLE',   150, 2),
  ('Aula de Música',         'NO_DISPONIBLE', 22, 2),
  ('Gimnasio',               'DISPONIBLE',    60, 3);

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
