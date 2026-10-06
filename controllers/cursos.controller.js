'use strict';
const pool = require('../config/db');
const { success } = require('../helpers/response.helper');
const { cursoActual, cursoSiguiente, generarRangoCursos } = require('../helpers/curso.helper');

async function listarCursos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT curso_escolar FROM (
         SELECT curso_escolar FROM guardia_creada
         UNION
         SELECT curso_escolar FROM espacio_curso
       ) t`
    );
    const conDatos = new Set(rows.map(r => r.curso_escolar));
    const rango = generarRangoCursos();
    const todos = new Set(rango);
    for (const c of conDatos) {
      todos.add(c);
    }
    const cursos = Array.from(todos)
      .sort()
      .reverse()
      .map(c => ({ curso: c, tieneDatos: conDatos.has(c) }));
    const actual = cursoActual();
    const siguiente = cursoSiguiente();
    return success(res, { cursos, actual, siguiente });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarCursos };
