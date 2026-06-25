/*
  Nombre completo: ta-titulo-articulo-coherencia.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-coherencia.service.js

  Función o funciones:
  - Validar la coherencia entre carrera, tema, problema, contexto, grupo de estudio y resultado esperado.
  - Generar títulos académicos simples a partir de los campos de la propuesta.
  - Corregir propuestas adaptables hacia la carrera del estudiante.
  - Bloquear propuestas totalmente ajenas a la carrera.

  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-estudiante.js
*/

export const COHERENCIA_ESTADOS = Object.freeze({
  pendiente: 'pendiente',
  valida: 'valida',
  adaptable: 'adaptable',
  bloqueada: 'bloqueada'
});

const AREAS = Object.freeze({
  salud: {
    id: 'salud',
    nombre: 'salud y atención sanitaria',
    carreras: ['ENFERMERIA', 'SALUD', 'MEDICINA', 'LABORATORIO', 'FISIOTERAPIA'],
    anclajes: ['paciente', 'pacientes', 'salud', 'cuidado', 'cuidados', 'enfermeria', 'clinico', 'clinica', 'hospital', 'bioseguridad', 'triaje', 'signos vitales', 'vacunacion', 'adulto mayor', 'diabetes', 'hipertension', 'prevencion'],
    problemas: ['riesgo', 'complicacion', 'adherencia', 'prevencion', 'deficit', 'desconocimiento', 'atencion', 'control'],
    resultados: ['protocolo', 'guia', 'plan de cuidado', 'estrategia educativa', 'mejora de atencion', 'intervencion']
  },
  administracion: {
    id: 'administracion',
    nombre: 'administración y gestión empresarial',
    carreras: ['ADMINISTRACION', 'TALENTO HUMANO', 'GESTION', 'EMPRESAS', 'CONTABILIDAD', 'FINANZAS', 'MARKETING', 'VENTAS', 'LOGISTICA'],
    anclajes: ['empresa', 'emprendimiento', 'gestion', 'administracion', 'procesos', 'cliente', 'clientes', 'ventas', 'marketing', 'talento humano', 'clima laboral', 'productividad', 'inventario', 'costos', 'finanzas'],
    problemas: ['baja productividad', 'rotacion', 'demora', 'ineficiencia', 'desorganizacion', 'bajas ventas', 'satisfaccion', 'control'],
    resultados: ['plan de mejora', 'estrategia', 'modelo de gestion', 'propuesta administrativa', 'manual', 'indicadores']
  },
  tecnologia: {
    id: 'tecnologia',
    nombre: 'tecnología, software y sistemas',
    carreras: ['SOFTWARE', 'SISTEMAS', 'INFORMATICA', 'TECNOLOGIA', 'REDES', 'CIBERSEGURIDAD', 'ELECTRONICA', 'TELECOMUNICACIONES', 'PROGRAMACION'],
    anclajes: ['sistema', 'software', 'aplicacion', 'app', 'plataforma', 'base de datos', 'automatizacion', 'seguridad informatica', 'redes', 'tecnologia', 'digital', 'algoritmo', 'prototipo'],
    problemas: ['fallas', 'demora', 'manual', 'inseguridad', 'perdida de datos', 'duplicidad', 'baja eficiencia', 'vulnerabilidad'],
    resultados: ['prototipo', 'sistema', 'aplicacion', 'modulo', 'automatizacion', 'plataforma', 'mejora tecnologica']
  },
  educacion: {
    id: 'educacion',
    nombre: 'educación y procesos de aprendizaje',
    carreras: ['EDUCACION', 'PEDAGOGIA', 'DOCENCIA', 'DESARROLLO INFANTIL', 'PARVULARIA'],
    anclajes: ['estudiantes', 'docentes', 'aprendizaje', 'ensenanza', 'aula', 'educacion', 'didactica', 'rendimiento academico', 'metodologia', 'capacitacion', 'evaluacion'],
    problemas: ['bajo rendimiento', 'dificultad', 'desmotivacion', 'brecha', 'deficiencia', 'metodologia tradicional'],
    resultados: ['estrategia didactica', 'guia', 'propuesta pedagogica', 'recurso educativo', 'plan de mejora']
  },
  gastronomia: {
    id: 'gastronomia',
    nombre: 'gastronomía, alimentos y servicios culinarios',
    carreras: ['GASTRONOMIA', 'ALIMENTOS', 'COCINA', 'CULINARIA', 'PROCESAMIENTO DE ALIMENTOS'],
    anclajes: ['alimentos', 'inocuidad', 'cocina', 'receta', 'menu', 'restaurante', 'gastronomia', 'conservacion', 'manipulacion', 'calidad alimentaria', 'producto alimenticio'],
    problemas: ['contaminacion', 'merma', 'baja calidad', 'mal manejo', 'desperdicio', 'conservacion'],
    resultados: ['manual de buenas practicas', 'propuesta gastronomica', 'estandarizacion', 'mejora de proceso', 'protocolo']
  },
  estetica: {
    id: 'estetica',
    nombre: 'estética integral y bienestar',
    carreras: ['ESTETICA', 'BELLEZA', 'COSMETOLOGIA', 'TERAPIAS INTEGRALES ESTETICAS'],
    anclajes: ['estetica', 'piel', 'tratamiento facial', 'tratamiento corporal', 'cosmetologia', 'cabina', 'bienestar', 'masaje', 'terapia estetica', 'protocolo estetico'],
    problemas: ['irritacion', 'mal procedimiento', 'insatisfaccion', 'riesgo', 'desconocimiento', 'bioseguridad'],
    resultados: ['protocolo estetico', 'guia de atencion', 'plan de tratamiento', 'manual de bioseguridad', 'mejora del servicio']
  }
});

const BLOQUEOS_POR_AREA = Object.freeze({
  salud: ['ventas', 'inventario', 'rentabilidad', 'publicidad', 'software', 'redes', 'receta', 'menu', 'tratamiento facial'],
  administracion: ['paciente', 'hospital', 'enfermeria', 'vacunacion', 'programacion', 'software', 'receta', 'tratamiento facial'],
  tecnologia: ['paciente', 'enfermeria', 'hospital', 'receta', 'menu', 'maquillaje', 'tratamiento facial'],
  educacion: ['paciente', 'hospital', 'inventario', 'ventas', 'software', 'receta', 'tratamiento facial'],
  gastronomia: ['paciente', 'hospital', 'software', 'redes', 'ventas', 'maquillaje', 'tratamiento facial'],
  estetica: ['software', 'redes', 'inventario', 'receta', 'hospital', 'paciente', 'ventas']
});

function limpiarTexto(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim();
}

function normalizar(valor) {
  return limpiarTexto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function contiene(texto, palabras = []) {
  const base = normalizar(texto);
  return palabras.some((palabra) => base.includes(normalizar(palabra)));
}

function contarCoincidencias(texto, palabras = []) {
  const base = normalizar(texto);
  return palabras.reduce((total, palabra) => total + (base.includes(normalizar(palabra)) ? 1 : 0), 0);
}

function camposTexto(propuesta = {}) {
  return [
    propuesta.temaGeneral,
    propuesta.problemaNecesidad,
    propuesta.lugarContexto,
    propuesta.grupoEstudio,
    propuesta.anioPeriodoDatos,
    propuesta.objetivoArticulo,
    propuesta.resultadoEsperado,
    propuesta.tituloFinal
  ].map(limpiarTexto).join(' ');
}

function camposCompletos(propuesta = {}) {
  return Boolean(
    limpiarTexto(propuesta.temaGeneral) &&
    limpiarTexto(propuesta.problemaNecesidad) &&
    limpiarTexto(propuesta.lugarContexto) &&
    limpiarTexto(propuesta.grupoEstudio) &&
    limpiarTexto(propuesta.anioPeriodoDatos) &&
    limpiarTexto(propuesta.objetivoArticulo) &&
    limpiarTexto(propuesta.resultadoEsperado)
  );
}

function detectarAreaCarrera(carrera = '') {
  const texto = normalizar(carrera);
  const areas = Object.values(AREAS);

  for (const area of areas) {
    if (area.carreras.some((palabra) => texto.includes(normalizar(palabra)))) {
      return area;
    }
  }

  return AREAS.administracion;
}

function detectarAreaTexto(texto = '') {
  const areas = Object.values(AREAS).map((area) => ({
    area,
    puntaje: contarCoincidencias(texto, area.anclajes) + contarCoincidencias(texto, area.problemas) + contarCoincidencias(texto, area.resultados)
  })).sort((a, b) => b.puntaje - a.puntaje);

  return areas[0] || { area: null, puntaje: 0 };
}

function seleccionar(lista, respaldo) {
  return lista.find((item) => limpiarTexto(item)) || respaldo;
}

export function construirTitulo(propuesta = {}, carrera = '') {
  const tema = limpiarTexto(propuesta.temaGeneral) || 'proceso académico';
  const problema = limpiarTexto(propuesta.problemaNecesidad);
  const contexto = limpiarTexto(propuesta.lugarContexto);
  const grupo = limpiarTexto(propuesta.grupoEstudio);
  const periodo = limpiarTexto(propuesta.anioPeriodoDatos);
  const carreraTexto = limpiarTexto(carrera);

  let titulo = `Análisis de ${tema}`;
  if (problema) titulo += ` frente a ${problema}`;
  if (grupo) titulo += ` en ${grupo}`;
  if (contexto) titulo += ` de ${contexto}`;
  if (periodo) titulo += `, ${periodo}`;
  if (carreraTexto && !normalizar(titulo).includes(normalizar(carreraTexto.split(' ')[0] || ''))) {
    titulo += `: enfoque desde ${carreraTexto}`;
  }
  return titulo.replace(/\s+/g, ' ').trim();
}

function construirPropuestaCorregida(propuesta = {}, carrera = '') {
  const area = detectarAreaCarrera(carrera || propuesta.carrera);
  const baseContexto = limpiarTexto(propuesta.lugarContexto) || 'el contexto institucional seleccionado';
  const baseGrupo = limpiarTexto(propuesta.grupoEstudio) || seleccionar(area.carreras, 'estudiantes o usuarios vinculados');
  const periodo = limpiarTexto(propuesta.anioPeriodoDatos) || '2026';
  const anclaje = seleccionar(area.anclajes, area.nombre);
  const problema = seleccionar(area.problemas, `necesidad relacionada con ${area.nombre}`);
  const resultado = seleccionar(area.resultados, `propuesta de mejora para ${area.nombre}`);

  const corregida = {
    ...propuesta,
    carrera: limpiarTexto(carrera || propuesta.carrera),
    temaGeneral: `Mejora de ${anclaje}`,
    problemaNecesidad: problema,
    lugarContexto: baseContexto,
    grupoEstudio: baseGrupo,
    anioPeriodoDatos: periodo,
    objetivoArticulo: `Analizar ${anclaje} para proponer una mejora alineada con ${area.nombre}.`,
    resultadoEsperado: resultado
  };

  corregida.tituloFinal = construirTitulo(corregida, corregida.carrera);
  return corregida;
}

function yaUsoCorreccion(propuesta = {}) {
  return Boolean(propuesta.coherencia && propuesta.coherencia.aceptadaEnCliente === true);
}

export function validarCoherenciaPropuesta(propuesta = {}, carrera = '', opciones = {}) {
  const p = { ...propuesta, carrera: carrera || propuesta.carrera || '' };
  const area = detectarAreaCarrera(p.carrera);
  const textoCompleto = camposTexto(p);
  const areaTexto = detectarAreaTexto(textoCompleto);
  const tieneAnclajeCarrera = contiene(textoCompleto, area.anclajes) || contiene(textoCompleto, area.resultados);
  const bloqueoFuerte = contiene(textoCompleto, BLOQUEOS_POR_AREA[area.id] || []);
  const fueAceptada = yaUsoCorreccion(p);

  if (!camposCompletos(p) && !opciones.forzar) {
    return {
      ok: true,
      estado: COHERENCIA_ESTADOS.pendiente,
      clasificacion: COHERENCIA_ESTADOS.pendiente,
      mensaje: '',
      propuesta: p,
      propuestaCorregida: null,
      bloqueada: false,
      requiereCorreccion: false,
      areaCarrera: area,
      areaTema: areaTexto.area
    };
  }

  if ((tieneAnclajeCarrera && !bloqueoFuerte) || fueAceptada) {
    return {
      ok: true,
      estado: COHERENCIA_ESTADOS.valida,
      clasificacion: COHERENCIA_ESTADOS.valida,
      mensaje: '',
      propuesta: p,
      propuestaCorregida: null,
      bloqueada: false,
      requiereCorreccion: false,
      areaCarrera: area,
      areaTema: areaTexto.area
    };
  }

  if (!bloqueoFuerte || (areaTexto.area && areaTexto.area.id !== area.id && areaTexto.puntaje <= 3)) {
    return {
      ok: false,
      estado: COHERENCIA_ESTADOS.adaptable,
      clasificacion: COHERENCIA_ESTADOS.adaptable,
      mensaje: `Tu tema parece no corresponder totalmente a tu carrera. Ajusta el enfoque hacia ${area.nombre}.`,
      propuesta: p,
      propuestaCorregida: construirPropuestaCorregida(p, p.carrera),
      bloqueada: false,
      requiereCorreccion: true,
      areaCarrera: area,
      areaTema: areaTexto.area
    };
  }

  return {
    ok: false,
    estado: COHERENCIA_ESTADOS.bloqueada,
    clasificacion: COHERENCIA_ESTADOS.bloqueada,
    mensaje: `Tu tema parece no corresponder a tu carrera. Reformula la propuesta desde ${area.nombre}.`,
    propuesta: p,
    propuestaCorregida: null,
    bloqueada: true,
    requiereCorreccion: false,
    areaCarrera: area,
    areaTema: areaTexto.area
  };
}

export function resumirCorreccion(propuesta = {}) {
  const p = propuesta || {};
  return [
    ['Tema general', p.temaGeneral],
    ['Problema o necesidad', p.problemaNecesidad],
    ['Grupo de estudio', p.grupoEstudio],
    ['Lugar o contexto', p.lugarContexto],
    ['Año o período', p.anioPeriodoDatos],
    ['Objetivo', p.objetivoArticulo],
    ['Resultado esperado', p.resultadoEsperado],
    ['Título final', p.tituloFinal]
  ].filter(([, valor]) => limpiarTexto(valor));
}
