'use strict';

function crearHelpers(conn) {
  return {
    async tablaExiste(tabla) {
      const [rows] = await conn.query(
        'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [tabla]
      );
      return rows.length > 0;
    },

    async columnaExiste(tabla, columna) {
      const [rows] = await conn.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [tabla, columna]
      );
      return rows.length > 0;
    },

    async indiceExiste(tabla, indice) {
      const [rows] = await conn.query(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [tabla, indice]
      );
      return rows.length > 0;
    },

    async fkExiste(tabla, fk) {
      const [rows] = await conn.query(
        "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
        [tabla, fk]
      );
      return rows.length > 0;
    },

    async triggerExiste(nombre) {
      const [rows] = await conn.query(
        'SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?',
        [nombre]
      );
      return rows.length > 0;
    },

    async cuerpoTrigger(nombre) {
      const [rows] = await conn.query(
        'SELECT ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?',
        [nombre]
      );
      return rows.length > 0 ? rows[0].ACTION_STATEMENT : null;
    },

    async valoresEnum(tabla, columna) {
      const [rows] = await conn.query(
        'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [tabla, columna]
      );
      if (rows.length === 0) return [];
      const match = rows[0].COLUMN_TYPE.match(/^enum\((.+)\)$/i);
      if (!match) return [];
      return match[1].split("','").map(v => v.replace(/^'|'$/g, ''));
    }
  };
}

module.exports = crearHelpers;
