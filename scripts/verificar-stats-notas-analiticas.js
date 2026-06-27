const fs = require('fs');

function assertOk(value, message) {
  if (!value) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function has(file, terms) {
  const text = read(file);
  for (const term of terms) assertOk(text.includes(term), `${file} no contiene ${term}`);
}

function run() {
  const files = [
    'Requisitos/Stats/stats.notes.analytics.js',
    'Requisitos/Stats/stats.notes.charts.js',
    'Requisitos/Stats/stats.notes.analytics.css',
    'Requisitos/Stats/stats.notes.enhancer.js',
    'Requisitos/Stats/stats.notes.js',
    'Requisitos/Stats/stats.html'
  ];
  for (const file of files) assertOk(fs.existsSync(file), `Falta ${file}`);
  has('Requisitos/Stats/stats.html', ['stats.notes.analytics.css', 'stats.notes.analytics.js', 'stats.notes.charts.js', 'stats.notes.enhancer.js']);
  has('Requisitos/Stats/stats.notes.analytics.js', ['StatsNotesAnalytics', 'analizar', 'promNart', 'promNdef', 'promNfin', 'rankings', 'tendencias', 'semaforo']);
  has('Requisitos/Stats/stats.notes.charts.js', ['StatsNotesCharts', 'Promedio final por carrera', 'Nart vs Ndef por carrera', 'Notas finales pendientes', 'Distribución por rangos', 'Semáforo por carrera']);
  has('Requisitos/Stats/stats.notes.enhancer.js', ['originalRender', 'insertarGraficos', 'StatsNotesCharts.render']);
  console.log('OK Stats Notas Analiticas');
}

run();
