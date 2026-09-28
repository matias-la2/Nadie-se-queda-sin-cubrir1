function cursoActual() {
  const ahora = new Date();
  const anioInicio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anioInicio}-${anioInicio + 1}`;
}

function inicioCursoActual() {
  const ahora = new Date();
  const anioInicio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anioInicio}-09-01`;
}

function rangoCurso(curso) {
  if (curso === 'actual') curso = cursoActual();
  const m = /^(\d{4})-(\d{4})$/.exec(curso);
  if (!m) return null;
  const inicio = parseInt(m[1], 10);
  const fin = parseInt(m[2], 10);
  if (fin !== inicio + 1) return null;
  return { desde: `${inicio}-09-01`, hasta: `${fin}-08-31` };
}

module.exports = { cursoActual, inicioCursoActual, rangoCurso };
