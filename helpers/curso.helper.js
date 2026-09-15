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

module.exports = { cursoActual, inicioCursoActual };
