import fs from 'fs';

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function leer(ruta) {
  exigir(fs.existsSync(ruta), `Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf-8');
}

function verificarHtml() {
  const html = leer('Requisitos/Stats/stats.html');
  exigir(html.includes('stats.notes.analytics.css'), 'stats.html no carga stats.notes.analytics.css.');
  exigir(html.includes('stats.notes.analytics.js'), 'stats.html no carga stats.notes.analytics.js.');
  exigir(html.indexOf('stats.notes.analytics.js') < html.indexOf('stats.notes.js'), 'La analítica debe cargarse antes de stats.notes.js.');
  exigir(html.includes('tendencias y riesgo por carrera'), 'La sección Notas no anuncia tendencias y riesgo por carrera.');
}

function verificarMotor() {
  const js = leer('Requisitos/Stats/stats.notes.analytics.js');
  const claves = [
    'StatsNotesAnalytics',
    'analizar',
    'tendencias',
    'rankings',
    'mejoresPromedios',
    'masRiesgo',
    'masPendientes',
    'defensaMasBaja',
    'semaforo',
    'riskOf',
    'Nfin = (Nart * 0.70) + (Ndef * 0.30)'
  ];
  for (const clave of claves) exigir(js.includes(clave), `El motor analítico no incluye ${clave}.`);
}

function verificarVista() {
  const js = leer('Requisitos/Stats/stats.notes.js');
  const claves = [
    'StatsNotesAnalytics.analizar',
    'Lectura automática',
    'Distribución de notas finales',
    'Prioridades rápidas',
    'Resumen por carrera',
    'Tendencia de registro',
    'Riesgo alto'
  ];
  for (const clave of claves) exigir(js.includes(clave), `La vista de notas no incluye ${clave}.`);
}

function verificarCss() {
  const css = leer('Requisitos/Stats/stats.notes.analytics.css');
  const clases = ['notes-analytics-dashboard', 'notes-analytics-panel', 'notes-ranking-grid', 'notes-analytics-bar', 'notes-semaforo'];
  for (const clase of clases) exigir(css.includes(clase), `Falta estilo ${clase}.`);
}

function main() {
  verificarHtml();
  verificarMotor();
  verificarVista();
  verificarCss();
  console.log('OK Stats Notas Analytics: dashboard analítico conectado.');
}

try {
  main();
} catch (error) {
  console.error('ERROR Stats Notas Analytics:', error.message);
  process.exit(1);
}
