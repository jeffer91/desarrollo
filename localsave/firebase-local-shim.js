/* =========================================================
Nombre completo: localsave/firebase-local-shim.js
Función:
- Shim tipo Firebase compat para trabajar en local
- Redirige lecturas/escrituras a LocalSave o localStorage
- Permite que módulos legacy sigan funcionando sin tocar Firebase real
========================================================= */
(function attachFirebaseLocalShim(window) {
  "use strict";

  var SHIM_STORAGE_KEY = "__firebase_local_shim__";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function makeEmptyState() {
    return {
      updatedAt: nowIso(),
      scopes: {}
    };
  }

  function loadStorageState() {
    try {
      var raw = window.localStorage.getItem(SHIM_STORAGE_KEY);
      if (!raw) return makeEmptyState();
      var parsed = JSON.parse(raw);
      if (!isObject(parsed)) return makeEmptyState();
      if (!parsed.scopes || typeof parsed.scopes !== "object") parsed.scopes = {};
      return parsed;
    } catch (error) {
      return makeEmptyState();
    }
  }

  function saveStorageState(state) {
    var next = isObject(state) ? state : makeEmptyState();
    next.updatedAt = nowIso();
    window.localStorage.setItem(SHIM_STORAGE_KEY, JSON.stringify(next));
    return true;
  }

  function inferPeriodId(scope, docId, row) {
    var src = isObject(row) ? row : {};
    return String(
      src.periodoId ||
      src.periodId ||
      src.periodo ||
      src.periodo_id ||
      (String(scope) === "periodos" ? (src.id || docId || "") : "")
    ).trim();
  }

  function createStorageDriver() {
    function ensureScope(scope) {
      var st = loadStorageState();
      if (!isObject(st.scopes[scope])) {
        st.scopes[scope] = {};
        saveStorageState(st);
      }
      return st;
    }

    return {
      name: "localStorage",
      async readCollection(scope) {
        var st = ensureScope(scope);
        var bucket = st.scopes[scope] || {};
        return Object.keys(bucket).map(function (id) {
          return clone(bucket[id]);
        });
      },
      async get(scope, docId) {
        var st = ensureScope(scope);
        var bucket = st.scopes[scope] || {};
        return bucket[String(docId)] ? clone(bucket[String(docId)]) : null;
      },
      async upsert(scope, docId, data) {
        var st = ensureScope(scope);
        st.scopes[scope][String(docId)] = Object.assign({}, clone(data), {
          _docId: String(docId),
          __scope: String(scope),
          __updatedAt: nowIso()
        });
        saveStorageState(st);
        return { ok: true };
      },
      async remove(scope, docId) {
        var st = ensureScope(scope);
        delete st.scopes[scope][String(docId)];
        saveStorageState(st);
        return { ok: true };
      }
    };
  }

  function createLocalSaveDriver() {
    return {
      name: "LocalSave",
      async readCollection(scope) {
        if (!window.LocalSave || typeof window.LocalSave.readScope !== "function") {
          return [];
        }
        var rows = await window.LocalSave.readScope(scope);
        return Array.isArray(rows) ? clone(rows) : [];
      },
      async get(scope, docId) {
        if (!window.LocalSave || typeof window.LocalSave.getRecord !== "function") {
          return null;
        }
        var row = await window.LocalSave.getRecord(scope, String(docId));
        return row ? clone(row) : null;
      },
      async upsert(scope, docId, data) {
        if (!window.LocalSave || typeof window.LocalSave.saveRecord !== "function") {
          throw new Error("LocalSave.saveRecord no disponible.");
        }
        var row = Object.assign({}, clone(data), {
          _docId: String(docId),
          __scope: String(scope),
          __updatedAt: nowIso()
        });
        var res = await window.LocalSave.saveRecord(scope, row, {
          idField: "_docId",
          periodId: inferPeriodId(scope, docId, row),
          source: "firebase-local-shim"
        });
        if (!res || res.ok === false) {
          throw new Error("No se pudo guardar en LocalSave.");
        }
        return { ok: true };
      },
      async remove(scope, docId) {
        if (!window.LocalSave || typeof window.LocalSave.deleteRecord !== "function") {
          throw new Error("LocalSave.deleteRecord no disponible.");
        }
        var current = await this.get(scope, docId);
        var res = await window.LocalSave.deleteRecord(scope, String(docId), {
          periodId: inferPeriodId(scope, docId, current || {}),
          source: "firebase-local-shim"
        });
        if (!res || res.ok === false) {
          throw new Error("No se pudo eliminar en LocalSave.");
        }
        return { ok: true };
      }
    };
  }

  function resolveDriver() {
    if (
      window.LocalSave &&
      typeof window.LocalSave.saveRecord === "function" &&
      typeof window.LocalSave.readScope === "function"
    ) {
      return createLocalSaveDriver();
    }
    return createStorageDriver();
  }

  function cleanPublicData(raw) {
    var src = isObject(raw) ? clone(raw) : {};
    delete src.__scope;
    delete src.__updatedAt;
    return src;
  }

  function createDocSnapshot(docId, data) {
    return {
      id: String(docId),
      exists: !!data,
      data: function () {
        return data ? cleanPublicData(data) : undefined;
      }
    };
  }

  function matchesWhere(row, rule) {
    var value = row ? row[rule.field] : undefined;
    if (rule.op === "==") {
      return value === rule.value;
    }
    if (rule.op === "in") {
      return Array.isArray(rule.value) && rule.value.indexOf(value) >= 0;
    }
    if (rule.op === "array-contains") {
      return Array.isArray(value) && value.indexOf(rule.value) >= 0;
    }
    if (rule.op === "array-contains-any") {
      return Array.isArray(value) &&
        Array.isArray(rule.value) &&
        rule.value.some(function (item) { return value.indexOf(item) >= 0; });
    }
    return false;
  }

  function applyQuery(rows, constraints) {
    var next = Array.isArray(rows) ? rows.slice() : [];
    var list = Array.isArray(constraints) ? constraints : [];
    list.forEach(function (rule) {
      if (!rule || rule.type !== "where") return;
      next = next.filter(function (row) {
        return matchesWhere(row, rule);
      });
    });
    return next;
  }

  function collectionRef(name) {
    return {
      __type: "collection",
      id: String(name),
      path: String(name)
    };
  }

  function docRef(collectionName, docId) {
    return {
      __type: "doc",
      id: String(docId),
      path: String(collectionName) + "/" + String(docId),
      parent: collectionRef(collectionName)
    };
  }

  function queryRef(base, constraints) {
    return {
      __type: "query",
      base: base,
      constraints: Array.isArray(constraints) ? constraints.slice() : []
    };
  }

  function where(field, op, value) {
    return {
      type: "where",
      field: String(field),
      op: String(op),
      value: value
    };
  }

  function query(base) {
    var constraints = Array.prototype.slice.call(arguments, 1);
    return queryRef(base, constraints);
  }

  function buildCompatCollectionApi(driver, scope) {
    return {
      doc: function (docId) {
        return buildCompatDocApi(driver, scope, docId);
      },
      where: function (field, op, value) {
        return buildCompatQueryApi(driver, scope, [where(field, op, value)]);
      },
      async get() {
        var rows = await driver.readCollection(scope);
        return buildQuerySnapshot(rows);
      }
    };
  }

  function buildCompatDocApi(driver, scope, docId) {
    return {
      async get() {
        var row = await driver.get(scope, docId);
        return createDocSnapshot(docId, row);
      },
      async set(data, options) {
        var current = options && options.merge ? await driver.get(scope, docId) : null;
        var next = options && options.merge
          ? Object.assign({}, cleanPublicData(current || {}), cleanPublicData(data || {}))
          : cleanPublicData(data || {});
        return driver.upsert(scope, docId, next);
      },
      async update(data) {
        var current = await driver.get(scope, docId);
        var next = Object.assign({}, cleanPublicData(current || {}), cleanPublicData(data || {}));
        return driver.upsert(scope, docId, next);
      },
      async delete() {
        return driver.remove(scope, docId);
      }
    };
  }

  function buildCompatQueryApi(driver, scope, constraints) {
    return {
      where: function (field, op, value) {
        var next = constraints.slice();
        next.push(where(field, op, value));
        return buildCompatQueryApi(driver, scope, next);
      },
      async get() {
        var rows = await driver.readCollection(scope);
        return buildQuerySnapshot(applyQuery(rows, constraints));
      }
    };
  }

  function buildQuerySnapshot(rows) {
    var list = Array.isArray(rows) ? rows : [];
    var docs = list.map(function (item) {
      var docId = String(item._docId || item.id || item.cedula || "").trim();
      return createDocSnapshot(docId, item);
    });
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs: docs,
      forEach: function (callback) {
        docs.forEach(callback);
      }
    };
  }

  function createFirestoreApi(driver) {
    return {
      collection: function (arg1, arg2) {
        var name = arg2 == null ? arg1 : arg2;
        return collectionRef(name);
      },
      doc: function (arg1, arg2, arg3) {
        if (arg1 && arg1.__type === "collection") {
          return docRef(arg1.path, arg2);
        }
        if (arg3 != null) {
          return docRef(arg2, arg3);
        }
        var path = String(arg1 || "");
        var parts = path.split("/").filter(Boolean);
        return docRef(parts[0] || "", parts[1] || "");
      },
      query: query,
      where: where,
      async getDoc(ref) {
        var row = await driver.get(ref.parent.path, ref.id);
        return createDocSnapshot(ref.id, row);
      },
      async getDocs(ref) {
        if (!ref) {
          return buildQuerySnapshot([]);
        }
        if (ref.__type === "query") {
          var qRows = await driver.readCollection(ref.base.path);
          return buildQuerySnapshot(applyQuery(qRows, ref.constraints));
        }
        if (ref.__type === "collection") {
          var rows = await driver.readCollection(ref.path);
          return buildQuerySnapshot(rows);
        }
        return buildQuerySnapshot([]);
      },
      async setDoc(ref, data, options) {
        var current = options && options.merge ? await driver.get(ref.parent.path, ref.id) : null;
        var next = options && options.merge
          ? Object.assign({}, cleanPublicData(current || {}), cleanPublicData(data || {}))
          : cleanPublicData(data || {});
        return driver.upsert(ref.parent.path, ref.id, next);
      },
      async updateDoc(ref, data) {
        var current = await driver.get(ref.parent.path, ref.id);
        var next = Object.assign({}, cleanPublicData(current || {}), cleanPublicData(data || {}));
        return driver.upsert(ref.parent.path, ref.id, next);
      },
      async deleteDoc(ref) {
        return driver.remove(ref.parent.path, ref.id);
      }
    };
  }

  var apps = [];
  var cachedCompatDb = null;

  function initializeApp(config) {
    var app = {
      name: "localsave-shim-app",
      options: clone(config || {})
    };
    apps = [app];
    return app;
  }

  function firestore() {
    if (cachedCompatDb) {
      return cachedCompatDb;
    }
    var driver = resolveDriver();
    var low = createFirestoreApi(driver);

    cachedCompatDb = {
      __shim: true,
      collection: function (name) {
        return buildCompatCollectionApi(driver, String(name));
      },
      _low: low
    };

    return cachedCompatDb;
  }

  var firebaseShim = {
    __isLocalSaveShim: true,
    apps: apps,
    initializeApp: initializeApp,
    firestore: firestore
  };

  Object.defineProperty(firebaseShim, "apps", {
    enumerable: true,
    configurable: false,
    get: function () {
      return apps;
    }
  });

  if (!window.firebase || window.__LOCALSAVE_FORCE_SHIM__) {
    window.firebase = firebaseShim;
  }

  window.FirebaseLocalShim = {
    SHIM_STORAGE_KEY: SHIM_STORAGE_KEY,
    resolveDriver: resolveDriver,
    createFirestoreApi: createFirestoreApi,
    where: where,
    query: query
  };
})(window);