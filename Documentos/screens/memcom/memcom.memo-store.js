/* =========================================================
Nombre completo: memcom.memo-store.js
Ruta: /screens/memcom/memcom.memo-store.js
Función o funciones:
- Crear una memoria central para los memorandos generados.
- Usar Firebase/Firestore como memoria principal cuando esté disponible.
- Usar localStorage como respaldo cuando Firebase no esté disponible.
- Controlar el correlativo mensual del código MEM-ITSQMET-UTET-YYYY-MM-XX.
- Evitar duplicados por mes, tipo de memorando y período.
- Registrar cada memorando emitido para trazabilidad institucional.
- Permitir liberar/anular una reserva si falla la generación del PDF.
========================================================= */

(function (window) {
  "use strict";

  window.MEMCOM = window.MEMCOM || {};

  var LOCAL_KEY = "MEMCOM_MEMO_STORE_V2";
  var COLLECTION_SEQUENCES = "memcom_memo_sequences";
  var COLLECTION_MEMOS = "memcom_memos";

  function pad2(value) {
    var n = parseInt(value, 10);

    if (isNaN(n) || n < 1) {
      return "01";
    }

    return n < 10 ? "0" + n : String(n);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getDateParts(dateValue) {
    var date = dateValue instanceof Date ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    var year = date.getFullYear();
    var month = pad2(date.getMonth() + 1);
    var day = pad2(date.getDate());

    return {
      year: year,
      month: month,
      day: day,
      codigoMes: year + "-" + month,
      fechaIso: year + "-" + month + "-" + day
    };
  }

  function getFechaHumana(dateValue) {
    var date = dateValue instanceof Date ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    var meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ];

    return date.getDate() + " de " + meses[date.getMonth()] + " de " + date.getFullYear();
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function safeKey(value) {
    return normalizeText(value)
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 120);
  }

  function buildFingerprint(metadata, parts) {
    var tipo = safeKey(metadata.tipo || "MEMORANDO");
    var periodo = safeKey(metadata.periodo || metadata.periodoLabel || "SIN_PERIODO");
    var periodoId = safeKey(metadata.periodoId || "");

    var base = [
      parts.codigoMes,
      tipo,
      periodoId || periodo
    ].join("_");

    return safeKey(base);
  }

  function getEmptyLocalStore() {
    return {
      version: 2,
      months: {},
      memos: {},
      issued: []
    };
  }

  function loadLocalStore() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);

      if (!raw) {
        return getEmptyLocalStore();
      }

      var parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return getEmptyLocalStore();
      }

      if (!parsed.months || typeof parsed.months !== "object") {
        parsed.months = {};
      }

      if (!parsed.memos || typeof parsed.memos !== "object") {
        parsed.memos = {};
      }

      if (!Array.isArray(parsed.issued)) {
        parsed.issued = [];
      }

      parsed.version = 2;

      return parsed;
    } catch (error) {
      console.error("[MEMCOM_MEMO_STORE] No se pudo leer memoria local:", error);
      return getEmptyLocalStore();
    }
  }

  function saveLocalStore(store) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    } catch (error) {
      console.error("[MEMCOM_MEMO_STORE] No se pudo guardar memoria local:", error);
    }
  }

  function buildMemoInfo(number, parts, metadata, options) {
    var correlativo = pad2(number);
    var codigoCompleto = "MEM-ITSQMET-UTET-" + parts.codigoMes + "-" + correlativo;
    var createdAt = options && options.createdAt ? options.createdAt : nowIso();
    var fingerprint = options && options.fingerprint ? options.fingerprint : buildFingerprint(metadata, parts);
    var source = options && options.source ? options.source : "local";
    var reused = !!(options && options.reused);

    return {
      codigoCompleto: codigoCompleto,
      codigo: codigoCompleto,
      codigoMes: parts.codigoMes,
      correlativo: correlativo,
      numero: number,
      fechaIso: parts.fechaIso,
      fechaHumana: getFechaHumana(new Date(parts.fechaIso + "T12:00:00")),
      tipo: metadata.tipo || "EXAMEN COMPLEXIVO",
      periodo: metadata.periodo || metadata.periodoLabel || "",
      periodoId: metadata.periodoId || "",
      cronogramaHash: metadata.cronogramaHash || "",
      fingerprint: fingerprint,
      reused: reused,
      source: source,
      token: {
        source: source,
        codigoMes: parts.codigoMes,
        numero: number,
        correlativo: correlativo,
        codigoCompleto: codigoCompleto,
        fingerprint: fingerprint,
        createdAt: createdAt,
        reused: reused
      }
    };
  }

  function getFirestoreDb() {
    if (
      window.MEMCOM &&
      window.MEMCOM.firebase &&
      window.MEMCOM.firebase.enabled &&
      window.MEMCOM.firebase.db
    ) {
      return window.MEMCOM.firebase.db;
    }

    return null;
  }

  function getFirebaseServerTimestamp() {
    if (
      window.firebase &&
      window.firebase.firestore &&
      window.firebase.firestore.FieldValue &&
      window.firebase.firestore.FieldValue.serverTimestamp
    ) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }

    return nowIso();
  }

  function reserveLocal(metadata, dateValue) {
    var parts = getDateParts(dateValue);
    var fingerprint = buildFingerprint(metadata, parts);
    var store = loadLocalStore();

    if (store.memos[fingerprint] && store.memos[fingerprint].estado !== "ANULADO") {
      var existing = store.memos[fingerprint];

      return Promise.resolve(buildMemoInfo(existing.numero, parts, metadata, {
        fingerprint: fingerprint,
        source: "local",
        reused: true,
        createdAt: existing.createdAt || nowIso()
      }));
    }

    var current = parseInt(store.months[parts.codigoMes] || 0, 10);

    if (isNaN(current) || current < 0) {
      current = 0;
    }

    var next = current + 1;
    var info = buildMemoInfo(next, parts, metadata, {
      fingerprint: fingerprint,
      source: "local",
      reused: false,
      createdAt: nowIso()
    });

    store.months[parts.codigoMes] = next;

    store.memos[fingerprint] = {
      fingerprint: fingerprint,
      codigoCompleto: info.codigoCompleto,
      codigoMes: info.codigoMes,
      numero: info.numero,
      correlativo: info.correlativo,
      fechaIso: info.fechaIso,
      fechaHumana: info.fechaHumana,
      tipo: info.tipo,
      periodo: info.periodo,
      periodoId: info.periodoId,
      cronogramaHash: info.cronogramaHash,
      estado: "EMITIDO",
      source: "local",
      createdAt: info.token.createdAt,
      updatedAt: info.token.createdAt
    };

    store.issued.push(store.memos[fingerprint]);

    saveLocalStore(store);

    return Promise.resolve(info);
  }

  function releaseLocal(token) {
    if (!token || token.source !== "local" || token.reused) {
      return Promise.resolve(false);
    }

    var store = loadLocalStore();
    var fingerprint = token.fingerprint;
    var codigoMes = token.codigoMes;
    var numero = parseInt(token.numero, 10);

    if (!fingerprint || !store.memos[fingerprint]) {
      return Promise.resolve(false);
    }

    store.memos[fingerprint].estado = "ANULADO";
    store.memos[fingerprint].updatedAt = nowIso();

    var current = parseInt(store.months[codigoMes] || 0, 10);

    if (!isNaN(current) && current === numero) {
      store.months[codigoMes] = Math.max(0, current - 1);
    }

    saveLocalStore(store);

    return Promise.resolve(true);
  }

  function reserveFirebase(metadata, dateValue) {
    var db = getFirestoreDb();

    if (!db) {
      return reserveLocal(metadata, dateValue);
    }

    var parts = getDateParts(dateValue);
    var fingerprint = buildFingerprint(metadata, parts);

    var sequenceRef = db.collection(COLLECTION_SEQUENCES).doc(parts.codigoMes);
    var memoRef = db.collection(COLLECTION_MEMOS).doc(fingerprint);

    return db.runTransaction(function (transaction) {
      return transaction.get(memoRef).then(function (memoSnap) {
        if (memoSnap.exists) {
          var existing = memoSnap.data() || {};

          if (existing.estado !== "ANULADO" && existing.numero) {
            return buildMemoInfo(existing.numero, parts, metadata, {
              fingerprint: fingerprint,
              source: "firebase",
              reused: true,
              createdAt: existing.createdAt || nowIso()
            });
          }
        }

        return transaction.get(sequenceRef).then(function (sequenceSnap) {
          var sequenceData = sequenceSnap.exists ? sequenceSnap.data() || {} : {};
          var current = parseInt(sequenceData.ultimoNumero || 0, 10);

          if (isNaN(current) || current < 0) {
            current = 0;
          }

          var next = current + 1;
          var createdAt = nowIso();

          var info = buildMemoInfo(next, parts, metadata, {
            fingerprint: fingerprint,
            source: "firebase",
            reused: false,
            createdAt: createdAt
          });

          transaction.set(sequenceRef, {
            codigoMes: parts.codigoMes,
            ultimoNumero: next,
            updatedAt: getFirebaseServerTimestamp()
          }, { merge: true });

          transaction.set(memoRef, {
            fingerprint: fingerprint,
            codigoCompleto: info.codigoCompleto,
            codigoMes: info.codigoMes,
            numero: info.numero,
            correlativo: info.correlativo,
            fechaIso: info.fechaIso,
            fechaHumana: info.fechaHumana,
            tipo: info.tipo,
            periodo: info.periodo,
            periodoId: info.periodoId,
            cronogramaHash: info.cronogramaHash,
            estado: "EMITIDO",
            source: "firebase",
            createdAt: createdAt,
            updatedAt: getFirebaseServerTimestamp()
          }, { merge: true });

          return info;
        });
      });
    }).catch(function (error) {
      console.error("[MEMCOM_MEMO_STORE] Firebase falló. Se usará memoria local:", error);
      return reserveLocal(metadata, dateValue);
    });
  }

  function releaseFirebase(token) {
    var db = getFirestoreDb();

    if (!db || !token || token.source !== "firebase" || token.reused) {
      return releaseLocal(token);
    }

    var sequenceRef = db.collection(COLLECTION_SEQUENCES).doc(token.codigoMes);
    var memoRef = db.collection(COLLECTION_MEMOS).doc(token.fingerprint);

    return db.runTransaction(function (transaction) {
      return transaction.get(sequenceRef).then(function (sequenceSnap) {
        var sequenceData = sequenceSnap.exists ? sequenceSnap.data() || {} : {};
        var current = parseInt(sequenceData.ultimoNumero || 0, 10);
        var numero = parseInt(token.numero, 10);

        if (!isNaN(current) && !isNaN(numero) && current === numero) {
          transaction.set(sequenceRef, {
            ultimoNumero: Math.max(0, current - 1),
            updatedAt: getFirebaseServerTimestamp()
          }, { merge: true });
        }

        transaction.set(memoRef, {
          estado: "ANULADO",
          updatedAt: getFirebaseServerTimestamp()
        }, { merge: true });

        return true;
      });
    }).catch(function (error) {
      console.error("[MEMCOM_MEMO_STORE] No se pudo liberar en Firebase:", error);
      return false;
    });
  }

  function reserve(metadata, dateValue) {
    metadata = metadata || {};

    if (getFirestoreDb()) {
      return reserveFirebase(metadata, dateValue);
    }

    return reserveLocal(metadata, dateValue);
  }

  function release(token) {
    if (!token) {
      return Promise.resolve(false);
    }

    if (token.source === "firebase") {
      return releaseFirebase(token);
    }

    return releaseLocal(token);
  }

  function getNextLocalInfo(dateValue) {
    var parts = getDateParts(dateValue);
    var store = loadLocalStore();
    var current = parseInt(store.months[parts.codigoMes] || 0, 10);

    if (isNaN(current) || current < 0) {
      current = 0;
    }

    return buildMemoInfo(current + 1, parts, {}, {
      fingerprint: "",
      source: "local-preview",
      reused: false,
      createdAt: nowIso()
    });
  }

  function getLocalStoreSnapshot() {
    return loadLocalStore();
  }

  window.MEMCOM.memoStore = {
    reserve: reserve,
    release: release,
    getNextLocalInfo: getNextLocalInfo,
    getLocalStoreSnapshot: getLocalStoreSnapshot,
    getDateParts: getDateParts,
    getFechaHumana: getFechaHumana,
    normalizeText: normalizeText,
    safeKey: safeKey
  };
})(window);