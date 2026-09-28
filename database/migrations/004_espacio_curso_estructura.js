'use strict';

exports.up = async function (conn, h) {
  if (!await h.tablaExiste('espacio_curso')) {
    await conn.query(`
      CREATE TABLE espacio_curso (
        id_espacio    INT UNSIGNED NOT NULL,
        curso_escolar VARCHAR(10)  NOT NULL,
        nombre_curso  VARCHAR(100) NOT NULL
          COMMENT 'Nombre del aula para ese curso (ej: 1ºA, 3ºB)',
        PRIMARY KEY (id_espacio, curso_escolar),
        CONSTRAINT fk_ec_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  if (!await h.indiceExiste('espacio_curso', 'idx_ec_curso')) {
    await conn.query('CREATE INDEX idx_ec_curso ON espacio_curso(curso_escolar)');
  }

  if (!await h.columnaExiste('espacio', 'planta')) {
    await conn.query(`
      ALTER TABLE espacio ADD COLUMN planta VARCHAR(20) NULL
        COMMENT 'Planta del edificio: Baja, Primera, Segunda' AFTER capacidad
    `);
  }

  const [ciclos] = await conn.query(
    "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%CICLOS%'"
  );
  if (ciclos.length === 0) {
    await conn.query("INSERT INTO edificio (nombre, piso) VALUES ('Ciclos', '3 plantas')");
  }

  await conn.query("UPDATE edificio SET piso = '2 plantas' WHERE nombre = 'ESO' AND piso != '2 plantas'");
  await conn.query("UPDATE edificio SET piso = '2 plantas' WHERE nombre = 'Bachillerato' AND piso != '2 plantas'");
};
