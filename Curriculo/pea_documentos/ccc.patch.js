/*
Nombre del archivo: ccc.patch.js
Ubicación: /Curriculo/pea_documentos/ccc.patch.js
Función:
- Aplicar parches de compatibilidad local-first para PEA
- Corregir lectura de carreras desde CurriculoLocal/Firebase
- Evitar que una función antigua rompa el selector de carreras
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function getLocal() {
    return PEA.firebase && typeof PEA.firebase.getLocalDb === "function" ? PEA.firebase.getLocalDb() : null;
  }

  function getDb() {
    return PEA.firebase && typeof PEA.firebase.getDb === "function" ? PEA.firebase.getDb() : null;
  }

  function sortCarreras(list) {
    var map = Object.create(null);
    var out = [];

    (Array.isArray(list) ? list : []).forEach(function (item) {
      var id = clean(item && item.id);
      if (!id) return;
      map[id] = {
        id: id,
        nombre: clean(item.nombre || id),
        tipo: clean(item.tipo),
        estado: clean(item.estado || "activa")
      };
    });

    Object.keys(map).forEach(function (id) { out.push(map[id]); });
    return out.sort(function (a, b) {
      return normalize(a.nombre || a.id).localeCompare(normalize(b.nombre || b.id), "es", { sensitivity: "base", numeric: true });
    });
  }

  function buildMateriaId(carreraId, materiaNombre) {
    var slug = PEA.parser && PEA.parser.slugify ? PEA.parser.slugify(materiaNombre) : normalize(materiaNombre).replace(/\s+/g, "_");
    return clean(carreraId) + "__" + slug;
  }

  function install() {
    if (!PEA.store) return;

    PEA.store.createMateriaId = buildMateriaId;

    PEA.store.listCarrerasForSelect = async function () {
      var local = getLocal();
      var database;
      var items = [];
      var snap;

      if (local && typeof local.all === "function") {
        items = await local.all("carreras");
      }

      if (!items.length) {
        database = getDb();
        if (database) {
          snap = await database.collection("carreras").orderBy("nombre").get();
          snap.forEach(function (doc) {
            var data = doc.data() || {};
            data.id = data.id || doc.id;
            items.push(data);
            if (local && typeof local.put === "function") {
              local.put("carreras", data.id, data, { remoteCollection: "carreras", markDirty: false });
            }
          });
        }
      }

      return sortCarreras(items);
    };

    PEA.store.readCarreraLocalFirst = async function (carreraId) {
      var id = clean(carreraId);
      var local = getLocal();
      var database;
      var snap;
      var data;

      if (!id) return null;

      if (local && typeof local.get === "function") {
        data = await local.get("carreras", id);
        if (data) {
          data.id = data.id || id;
          return data;
        }
      }

      database = getDb();
      if (!database) return null;

      snap = await database.collection("carreras").doc(id).get();
      if (!snap.exists) return null;

      data = snap.data() || {};
      data.id = data.id || snap.id;

      if (local && typeof local.put === "function") {
        await local.put("carreras", id, data, { remoteCollection: "carreras", markDirty: false });
      }

      return data;
    };
  }

  install();
  PEA.cccPatch = { install: install };
})(window);
