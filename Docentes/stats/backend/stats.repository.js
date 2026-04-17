/*
Nombre del archivo: stats.repository.js
Ruta: stats/backend/stats.repository.js
Función:
- Lee colecciones de Firebase
- Obtiene documentos de docentes, capacitaciones y periodos
- Normaliza la salida mínima de Firestore
- Soporta varios estilos de acceso al wrapper de Firebase
*/

(function attachStatsRepository(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function safeObject(value) {
    return value && typeof value === "object" ? value : {};
  }

  function asText(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizeSnapshotDoc(doc) {
    if (!doc) return null;

    if (typeof doc.data === "function") {
      return {
        id: asText(doc.id),
        data: safeObject(doc.data())
      };
    }

    if (doc.id && doc.data && typeof doc.data === "object") {
      return {
        id: asText(doc.id),
        data: safeObject(doc.data)
      };
    }

    if (doc.id && typeof doc === "object") {
      var cloned = Object.assign({}, doc);
      delete cloned.id;

      return {
        id: asText(doc.id),
        data: safeObject(cloned)
      };
    }

    return null;
  }

  function getCollectionsConfig() {
    var config = window.STATS.Config;
    return config && typeof config.getCollections === "function"
      ? safeObject(config.getCollections())
      : {};
  }

  async function fetchCollectionWithCompatDb(db, collectionName) {
    if (!db || typeof db.collection !== "function") return null;

    var snapshot = await db.collection(collectionName).get();
    if (!snapshot || !snapshot.docs) return [];

    return snapshot.docs
      .map(normalizeSnapshotDoc)
      .filter(Boolean);
  }

  async function fetchCollectionWithRepositoryApi(firebaseApi, collectionName) {
    if (!firebaseApi) return null;

    if (typeof firebaseApi.fetchCollection === "function") {
      var resultA = await firebaseApi.fetchCollection(collectionName);
      return normalizeUnknownCollectionResult(resultA);
    }

    if (typeof firebaseApi.getCollectionDocs === "function") {
      var resultB = await firebaseApi.getCollectionDocs(collectionName);
      return normalizeUnknownCollectionResult(resultB);
    }

    if (typeof firebaseApi.readCollection === "function") {
      var resultC = await firebaseApi.readCollection(collectionName);
      return normalizeUnknownCollectionResult(resultC);
    }

    return null;
  }

  function normalizeUnknownCollectionResult(result) {
    if (!result) return [];

    if (Array.isArray(result)) {
      return result.map(normalizeSnapshotDoc).filter(Boolean);
    }

    if (result.docs && Array.isArray(result.docs)) {
      return result.docs.map(normalizeSnapshotDoc).filter(Boolean);
    }

    return [];
  }

  async function fetchCollection(collectionName) {
    var firebaseApi = window.STATS.Firebase;
    var db = firebaseApi && typeof firebaseApi.getDb === "function"
      ? firebaseApi.getDb()
      : null;

    if (!collectionName) {
      throw new Error("No se especificó el nombre de la colección.");
    }

    var fromRepositoryApi = await fetchCollectionWithRepositoryApi(firebaseApi, collectionName);
    if (fromRepositoryApi) {
      return fromRepositoryApi;
    }

    if (db) {
      var fromCompatDb = await fetchCollectionWithCompatDb(db, collectionName);
      if (fromCompatDb) {
        return fromCompatDb;
      }
    }

    throw new Error("No se pudo acceder a Firestore para leer la colección: " + collectionName);
  }

  async function fetchCollectionSafe(collectionName) {
    if (!collectionName) return [];
    try {
      return await fetchCollection(collectionName);
    } catch (error) {
      console.warn("[stats.repository] No se pudo leer la colección:", collectionName, error);
      return [];
    }
  }

  async function fetchDocentes() {
    var collections = getCollectionsConfig();
    return fetchCollectionSafe(collections.docentes);
  }

  async function fetchCapacitaciones() {
    var collections = getCollectionsConfig();
    return fetchCollectionSafe(collections.capacitaciones);
  }

  async function fetchPeriodos() {
    var collections = getCollectionsConfig();
    return fetchCollectionSafe(collections.periodos);
  }

  async function fetchAll() {
    var results = await Promise.all([
      fetchDocentes(),
      fetchCapacitaciones(),
      fetchPeriodos()
    ]);

    return {
      docentes: results[0] || [],
      capacitaciones: results[1] || [],
      periodos: results[2] || []
    };
  }

  window.STATS.Repository = {
    fetchCollection: fetchCollection,
    fetchCollectionSafe: fetchCollectionSafe,
    fetchDocentes: fetchDocentes,
    fetchCapacitaciones: fetchCapacitaciones,
    fetchPeriodos: fetchPeriodos,
    fetchAll: fetchAll
  };
})(window);