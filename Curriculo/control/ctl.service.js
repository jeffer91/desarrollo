/*
Nombre completo: ctl.service.js
Ruta o ubicación: /control/ctl.service.js
Función o funciones:
- Obtener los catálogos base del módulo
- Construir la lista consolidada de materias
- Leer el estado de fichas y actas desde localStorage
- Simular o integrar el estado de PEA para el control global
*/

const FCH_STORAGE_PREFIX = "curriculo_ficha_";
const ACT_STORAGE_PREFIX = "curriculo_acta_";

async function ctlServiceGetCatalogos() {
  return {
    carreras: [
      { id: "administracion", nombre: "Administración" },
      { id: "contabilidad", nombre: "Contabilidad" }
    ],
    niveles: [
      { id: "primer_nivel", nombre: "Primer nivel" },
      { id: "segundo_nivel", nombre: "Segundo nivel" },
      { id: "tercer_nivel", nombre: "Tercer nivel" },
      { id: "cuarto_nivel", nombre: "Cuarto nivel" }
    ]
  };
}

function ctlBuildBaseMateriaMatrix() {
  return [
    {
      carreraId: "administracion",
      carreraNombre: "Administración",
      nivelId: "primer_nivel",
      nivelNombre: "Primer nivel",
      materiaId: "matematica_financiera",
      materiaNombre: "Matemática Financiera",
      pea: true
    },
    {
      carreraId: "administracion",
      carreraNombre: "Administración",
      nivelId: "primer_nivel",
      nivelNombre: "Primer nivel",
      materiaId: "administracion_i",
      materiaNombre: "Administración I",
      pea: true
    },
    {
      carreraId: "administracion",
      carreraNombre: "Administración",
      nivelId: "primer_nivel",
      nivelNombre: "Primer nivel",
      materiaId: "ofimatica",
      materiaNombre: "Ofimática",
      pea: false
    },
    {
      carreraId: "contabilidad",
      carreraNombre: "Contabilidad",
      nivelId: "primer_nivel",
      nivelNombre: "Primer nivel",
      materiaId: "matematica_financiera",
      materiaNombre: "Matemática Financiera",
      pea: true
    }
  ];
}

function ctlFindStorageRecord(prefix, key) {
  const raw = localStorage.getItem(`${prefix}${key}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("[ctl] Error al leer storage:", error);
    return null;
  }
}

async function ctlServiceLoadControlItems() {
  const baseItems = ctlBuildBaseMateriaMatrix();

  return baseItems.map((item) => {
    const key = `${item.carreraId}__${item.nivelId}__${item.materiaId}`;
    const fichaRecord = ctlFindStorageRecord(FCH_STORAGE_PREFIX, key);
    const actaRecord = ctlFindStorageRecord(ACT_STORAGE_PREFIX, key);

    const ficha = Boolean(fichaRecord);
    const acta = Boolean(actaRecord);

    let estado = "pendiente";
    if (item.pea && ficha && acta) {
      estado = "completo";
    } else if (!ficha) {
      estado = "sin_ficha";
    } else if (!acta) {
      estado = "sin_acta";
    }

    const avance = Math.round(((Number(item.pea) + Number(ficha) + Number(acta)) / 3) * 100);

    return {
      ...item,
      key,
      ficha,
      acta,
      estado,
      avance,
      fichaFecha: fichaRecord?.savedAt || null,
      actaFecha: actaRecord?.savedAt || null
    };
  });
}

export {
  ctlServiceGetCatalogos,
  ctlServiceLoadControlItems
};