'use strict';

exports.up = async function (conn, h) {
  if (!await h.tablaExiste('profesor_edificio')) {
    await conn.query(`
      CREATE TABLE profesor_edificio (
        id_usuario  INT UNSIGNED NOT NULL,
        id_edificio INT UNSIGNED NOT NULL,
        PRIMARY KEY (id_usuario, id_edificio),
        CONSTRAINT fk_pe_profesor FOREIGN KEY (id_usuario) REFERENCES profesor(id_usuario)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_pe_edificio FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  await conn.query("UPDATE edificio SET nombre = 'ESO' WHERE id_edificio = 1 AND nombre != 'ESO'");
  await conn.query("UPDATE edificio SET nombre = 'Bachillerato' WHERE id_edificio = 2 AND nombre != 'Bachillerato'");
};
