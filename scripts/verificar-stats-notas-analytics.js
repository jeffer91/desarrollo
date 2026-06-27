const fs = require('fs');

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function leer(ruta) {
  exigir(fs.existsSync(ruta), `Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf-8');
}

function exigirContenido(ruta, claves) {
  const contenido = leer(ruta);
  claves.forEach((clave) => exigir(contenido.includes(clave), `${ruta} no incluye ${clave}`));
}

function verificarHtml() {
  const html = leer('Requisitos/Stats/stats.html');
  exigirContenido('Requisitos/Stats/stats.html', [
    'stats.notes.analytics.css',
    'stats.notes.priorities.css',
    'stats.notes.analytics.js',
    'stats.notes.charts.js',
    'stats.notes.enhancer.js',
    'stats.notes.priorities.js',
    'tendencias y riesgo por carrera'
  ]);
  exigir(html.indexOf('stats.notes.analytics.js') < html.indexOf('stats.notes.js'), 'La analítica debe cargarse antes de stats.notes.js.');
  exigir(html.indexOf('stats.notes.charts.js') < html.indexOf('stats.notes.enhancer.js'), 'Los gráficos deben cargarse antes del enhancer.');
  exigir(html.indexOf('stats.notes.js') < html.indexOf('stats.notes.enhancer.js'), 'El enhancer debe cargarse después de stats.notes.js.');
  exigir(html.indexOf('stats.notes.enhancer.js') < html.indexOf('stats.notes.priorities.js'), 'Las prioridades deben cargarse después del enhancer.');
}

function verificarMotor() {
  exigirContenido('Requisitos/Stats/stats.notes.analytics.js', [
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
  ]);
}

function verificarVista() {
  exigirContenido('Requisitos/Stats/stats.notes.js', [
    'StatsNotesAnalytics.analizar',
    'Lectura automática',
    'Distribución de notas finales',
    'Prioridades rápidas',
    'Resumen por carrera',
    'Tendencia de registro',
    'Riesgo alto'
  ]);
}

function verificarGraficos() {
  exigirContenido('Requisitos/Stats/stats.notes.charts.js', [
    'StatsNotesCharts',
    'Promedio final por carrera',
    'Nart vs Ndef por carrera',
    'Notas finales pendientes',
    'Distribución por rangos',
    'Semáforo por carrera',
    'Riesgo alto por carrera'
  ]);
  exigirContenido('Requisitos/Stats/stats.notes.enhancer.js', [
    'originalRender',
    'insertarGraficos',
    'StatsNotesCharts.render',
    'window.StatsNotes.render=render'
  ]);
}

function verificarPrioridades() {
  exigirContenido('Requisitos/Stats/stats.notes.priorities.js', [
    'Prioridades académicas',
    'construirAcciones',
    'resumenEjecutivo',
    'renderAcciones',
    'renderEstudiantes',
    'insertarPrioridades'
  ]);
  exigirContenido('Requisitos/Stats/stats.notes.priorities.css', [
    'notes-priority-panel',
    'notes-priority-kpis',
    'notes-priority-grid',
    'notes-priority-action',
    'notes-priority-table'
  ]);
}

function verificarCss() {
  exigirContenido('Requisitos/Stats/stats.notes.analytics.css', [
    'notes-analytics-dashboard',
    'notes-analytics-panel',
    'notes-ranking-grid',
    'notes-analytics-bar',
    'notes-semaforo',
    'stats-note-chart-grid',
    'stats-note-chart-card',
    'stats-note-group-row',
    'stats-note-semaforo-row'
  ]);
}

function main() {
  verificarHtml();
  verificarMotor();
  verificarVista();
  verificarGraficos();
  verificarPrioridades();
  verificarCss();
  console.log('OK Stats Notas Analytics: dashboard analítico, gráficos, enhancer y prioridades conectados.');
}

try {
  main();
} catch (error) {
  console.error('ERROR Stats Notas Analytics:', error.message);
  process.exit(1);
}
