'use strict';

const ABREVIATURAS = [
  [/\bFCO\b\.?/g,        'FRANCISCO'],
  [/\bFCA\b\.?/g,        'FRANCISCA'],
  [/\bM\b[ªa]?\b\.?/g,   'MARIA'],   // Mª, Ma, M.
  [/\bJOSE\s+MARIA\b/g,  'JOSE MARIA'], // ya expandido, ancla para no re-expandir
  [/\bJ\b\.?\s*/g,        'JOSE'],
  [/\bANT\b\.?/g,        'ANTONIO'],
  [/\bANTª\b\.?/g,       'ANTONIA'],
  [/\bMAN\b\.?/g,        'MANUEL'],
  [/\bCARMEN\b/g,        'CARMEN'],
];

function normalizar(texto) {
  if (!texto || typeof texto !== 'string') return '';

  let s = texto.trim().replace(/\s+/g, ' ');

  // Quitar acentos: NFD + eliminar diacríticos
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  s = s.toUpperCase();

  // Expandir Mª y Mª LUZ → MARIA LUZ (antes del bucle general)
  s = s.replace(/\bM[ªᵃ]\b/g, 'MARIA');

  // Expandir abreviaturas conocidas
  for (const [patron, reemplazo] of ABREVIATURAS) {
    s = s.replace(patron, reemplazo);
  }

  // Quitar puntos y caracteres no alfabéticos (excepto espacios)
  s = s.replace(/[^A-Z\s]/g, '');

  // Re-colapsar espacios que puedan haber quedado
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) return 0.0;

  const ventana = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let coincidencias = 0;
  let transposiciones = 0;

  for (let i = 0; i < len1; i++) {
    const inicio = Math.max(0, i - ventana);
    const fin = Math.min(i + ventana + 1, len2);

    for (let j = inicio; j < fin; j++) {
      if (matches2[j] || s1[i] !== s2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      coincidencias++;
      break;
    }
  }

  if (coincidencias === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (s1[i] !== s2[k]) transposiciones++;
    k++;
  }

  const jaro =
    (coincidencias / len1 +
      coincidencias / len2 +
      (coincidencias - transposiciones / 2) / coincidencias) /
    3;

  // Prefijo común (máx 4 caracteres)
  let prefijo = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefijo++;
    else break;
  }

  return jaro + prefijo * 0.1 * (1 - jaro);
}

function similitudTokens(tokensA, tokensB) {
  const setB = new Set(tokensB);
  let comunes = 0;
  for (const t of tokensA) {
    if (setB.has(t)) comunes++;
  }
  const total = Math.max(tokensA.length, tokensB.length);
  return total === 0 ? 0 : comunes / total;
}

function emparejar(nombreExcel, usuarios, aliasMap) {
  const normExcel = normalizar(nombreExcel);
  const tokensExcel = normExcel.split(' ').filter(Boolean).sort();

  // a) alias_profesor por nombre_normalizado
  if (aliasMap && aliasMap.has(normExcel)) {
    const id = aliasMap.get(normExcel);
    const u = usuarios.find(u => u.id === id);
    if (u) {
      return {
        tipo: 'EXACTO',
        candidatos: [{ id: u.id, nombre: u.nombre, apellidos: u.apellidos, score: 1 }],
      };
    }
  }

  // Preparar usuarios normalizados
  const normalizados = usuarios.map(u => {
    const norm = normalizar(`${u.nombre} ${u.apellidos}`);
    const tokens = norm.split(' ').filter(Boolean).sort();
    return { ...u, norm, tokens };
  });

  // b) coincidencia exacta normalizada
  const exacto = normalizados.find(u => u.norm === normExcel);
  if (exacto) {
    return {
      tipo: 'EXACTO',
      candidatos: [{ id: exacto.id, nombre: exacto.nombre, apellidos: exacto.apellidos, score: 1 }],
    };
  }

  // c) mismo conjunto de tokens ignorando orden
  const porTokens = normalizados.find(u =>
    u.tokens.length === tokensExcel.length &&
    u.tokens.every((t, i) => t === tokensExcel[i])
  );
  if (porTokens) {
    return {
      tipo: 'EXACTO',
      candidatos: [{ id: porTokens.id, nombre: porTokens.nombre, apellidos: porTokens.apellidos, score: 1 }],
    };
  }

  // d) similitud Jaro-Winkler >= 0.85
  const candidatos = normalizados
    .map(u => {
      const scoreJW = jaroWinkler(normExcel, u.norm);
      const scoreTokens = similitudTokens(tokensExcel, u.tokens);
      const score = Math.max(scoreJW, scoreTokens);
      return { id: u.id, nombre: u.nombre, apellidos: u.apellidos, score };
    })
    .filter(c => c.score >= 0.85)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (candidatos.length > 0) {
    return { tipo: 'PROBABLE', candidatos };
  }

  // e) ninguno
  return { tipo: 'NINGUNO', candidatos: [] };
}

module.exports = { normalizar, emparejar, jaroWinkler };
