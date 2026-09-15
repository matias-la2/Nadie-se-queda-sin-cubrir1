const TRAMOS = [
  { orden: 1, etiqueta: '1a hora (08:30-09:20)', inicio: '08:30', fin: '09:20', lectivo: true },
  { orden: 2, etiqueta: '2a hora (09:25-10:15)', inicio: '09:25', fin: '10:15', lectivo: true },
  { orden: 3, etiqueta: '3a hora (10:20-11:10)', inicio: '10:20', fin: '11:10', lectivo: true },
  { orden: 4, etiqueta: 'Recreo (11:10-11:45)',  inicio: '11:10', fin: '11:45', lectivo: false },
  { orden: 5, etiqueta: '4a hora (11:45-12:35)', inicio: '11:45', fin: '12:35', lectivo: true },
  { orden: 6, etiqueta: '5a hora (12:40-13:30)', inicio: '12:40', fin: '13:30', lectivo: true },
  { orden: 7, etiqueta: '6a hora (13:35-14:25)', inicio: '13:35', fin: '14:25', lectivo: true },
];

const TRAMOS_LECTIVOS = TRAMOS.filter(t => t.lectivo);
const ETIQUETAS = TRAMOS.map(t => t.etiqueta);
const ETIQUETAS_LECTIVAS = TRAMOS_LECTIVOS.map(t => t.etiqueta);

module.exports = { TRAMOS, TRAMOS_LECTIVOS, ETIQUETAS, ETIQUETAS_LECTIVAS };
