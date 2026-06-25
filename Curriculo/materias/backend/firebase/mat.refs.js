/*
Nombre del archivo: mat.refs.js
Ubicación: /Curriculo/materias/backend/firebase/mat.refs.js
Función:
- Centralizar referencias de Firestore
- Devolver colección y documento de carreras
- Mantener una sola fuente para el nombre de colección
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function collectionName() {
    if (MAT.firebase && typeof MAT.firebase.getCollectionName === "function") {
      return MAT.firebase.getCollectionName();
    }

    return String((MAT.config && MAT.config.collectionName) || "carreras").trim();
  }

  function cleanId(value) {
    return String(value == null ? "" : value).trim();
  }

  MAT.refs = {
    collectionName: collectionName,

    carreras: function () {
      var db = MAT.firebase.init();

      if (!db) {
        return null;
      }

      return db.collection(collectionName());
    },

    carreraDoc: function (careerId) {
      var ref = this.carreras();
      var id = cleanId(careerId);

      if (!ref || !id) {
        return null;
      }

      return ref.doc(id);
    }
  };
})(window);
