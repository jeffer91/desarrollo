/*
=========================================================
Nombre completo: mesa-indexeddb.js
Ruta o ubicación: /js/mesa-indexeddb.js
Función o funciones:
- Crear la base local IndexedDB.
- Guardar invitaciones localmente.
- Guardar metadatos de lectura y sincronización diaria.
- Guardar caché local de estudiantes traídos desde Firebase.
=========================================================
*/
"use strict";

(function attachMesaIndexedDb(global) {
  const DB_NAME = "mesa_invitaciones_db";
  const DB_VERSION = 1;

  const STORE_INVITATIONS = "invitations";
  const STORE_META = "meta";
  const STORE_STUDENTS = "students_cache";

  let dbPromise = null;

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function enrichInvitation(invitation) {
    const normalized = global.MesaInvitationSchema.normalizeInvitation(invitation);
    const searchText = normalizeSearchText(
      [
        normalized.fullName,
        normalized.treatment,
        normalized.promotion,
        normalized.documentDate,
        ...(normalized.assignments || []).map((item) => item.cargoKey)
      ].join(" ")
    );

    return {
      ...normalized,
      _searchText: searchText,
      _local: {
        dirty: normalized?._local?.dirty === true,
        status: normalized?._local?.status || "clean",
        syncedAt: normalized?._local?.syncedAt || "",
        lastLocalUpdateAt: normalized?._local?.lastLocalUpdateAt || ""
      }
    };
  }

  function enrichStudent(student) {
    const id = String(student?.numeroIdentificacion || student?.id || "").trim();

    return {
      ...student,
      id,
      _searchText: normalizeSearchText(
        [
          student?.numeroIdentificacion,
          student?.Nombres,
          student?.NombreCarrera,
          student?.CorreoInstitucional,
          student?.CorreoPersonal
        ].join(" ")
      )
    };
  }

  function openDb() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function onUpgrade(event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_INVITATIONS)) {
          const invitationsStore = db.createObjectStore(STORE_INVITATIONS, {
            keyPath: "id"
          });
          invitationsStore.createIndex("bySearch", "_searchText", { unique: false });
          invitationsStore.createIndex("byDirty", "_local.dirty", { unique: false });
          invitationsStore.createIndex("byUpdatedAt", "meta.updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
          const studentsStore = db.createObjectStore(STORE_STUDENTS, {
            keyPath: "id"
          });
          studentsStore.createIndex("bySearch", "_searchText", { unique: false });
          studentsStore.createIndex("byCareer", "NombreCarrera", { unique: false });
        }
      };

      request.onsuccess = function onSuccess(event) {
        resolve(event.target.result);
      };

      request.onerror = function onError(event) {
        reject(event.target.error || new Error("No se pudo abrir IndexedDB."));
      };
    });

    return dbPromise;
  }

  async function getStore(storeName, mode) {
    const db = await openDb();
    const tx = db.transaction(storeName, mode);
    return {
      tx,
      store: tx.objectStore(storeName)
    };
  }

  async function setMeta(key, value) {
    const { tx, store } = await getStore(STORE_META, "readwrite");

    return new Promise((resolve, reject) => {
      store.put({
        key: String(key || "").trim(),
        value
      });

      tx.oncomplete = () => resolve(value);
      tx.onerror = (event) => reject(event.target.error || new Error("No se pudo guardar metadato."));
      tx.onabort = (event) => reject(event.target.error || new Error("La transacción fue abortada."));
    });
  }

  async function getMeta(key) {
    const { store } = await getStore(STORE_META, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.get(String(key || "").trim());

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };

      request.onerror = (event) => reject(event.target.error || new Error("No se pudo leer metadato."));
    });
  }

  async function putInvitation(invitation) {
    const safeInvitation = enrichInvitation(invitation);
    const { tx, store } = await getStore(STORE_INVITATIONS, "readwrite");

    return new Promise((resolve, reject) => {
      store.put(safeInvitation);

      tx.oncomplete = () => resolve(safeInvitation);
      tx.onerror = (event) => reject(event.target.error || new Error("No se pudo guardar la invitación."));
      tx.onabort = (event) => reject(event.target.error || new Error("La transacción fue abortada."));
    });
  }

  async function getInvitationById(id) {
    const { store } = await getStore(STORE_INVITATIONS, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.get(String(id || "").trim());

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (event) => reject(event.target.error || new Error("No se pudo leer la invitación."));
    });
  }

  async function getAllInvitations() {
    const { store } = await getStore(STORE_INVITATIONS, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const result = Array.isArray(request.result) ? request.result : [];
        result.sort((a, b) => String(b?.meta?.updatedAt || "").localeCompare(String(a?.meta?.updatedAt || "")));
        resolve(result);
      };

      request.onerror = (event) => reject(event.target.error || new Error("No se pudieron listar las invitaciones."));
    });
  }

  async function deleteInvitation(id) {
    const { tx, store } = await getStore(STORE_INVITATIONS, "readwrite");

    return new Promise((resolve, reject) => {
      store.delete(String(id || "").trim());

      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error || new Error("No se pudo eliminar la invitación."));
      tx.onabort = (event) => reject(event.target.error || new Error("La transacción fue abortada."));
    });
  }

  async function searchInvitations(query) {
    const all = await getAllInvitations();
    const term = normalizeSearchText(query);

    if (!term) {
      return all;
    }

    return all.filter((item) => String(item?._searchText || "").includes(term));
  }

  async function getDirtyInvitations() {
    const all = await getAllInvitations();
    return all.filter((item) => item?._local?.dirty === true);
  }

  async function markInvitationAsSynced(id) {
    const current = await getInvitationById(id);
    if (!current) {
      return null;
    }

    current._local = {
      ...current._local,
      dirty: false,
      status: "clean",
      syncedAt: new Date().toISOString()
    };
    current.meta = {
      ...current.meta,
      updatedAt: new Date().toISOString()
    };

    return putInvitation(current);
  }

  async function replaceStudentsCache(students) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STUDENTS, "readwrite");
      const store = tx.objectStore(STORE_STUDENTS);
      const clearRequest = store.clear();

      clearRequest.onerror = (event) => {
        reject(event.target.error || new Error("No se pudo limpiar el caché de estudiantes."));
      };

      clearRequest.onsuccess = () => {
        try {
          (students || []).forEach((student) => {
            const safeStudent = enrichStudent(student);
            if (safeStudent.id) {
              store.put(safeStudent);
            }
          });
        } catch (error) {
          reject(error);
          return;
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error || new Error("No se pudo reemplazar el caché de estudiantes."));
      tx.onabort = (event) => reject(event.target.error || new Error("La transacción fue abortada."));
    });
  }

  async function getStudentById(id) {
    const { store } = await getStore(STORE_STUDENTS, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.get(String(id || "").trim());

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (event) => reject(event.target.error || new Error("No se pudo leer el estudiante."));
    });
  }

  async function searchStudents(query) {
    const { store } = await getStore(STORE_STUDENTS, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const all = Array.isArray(request.result) ? request.result : [];
        const term = normalizeSearchText(query);

        if (!term) {
          resolve(all);
          return;
        }

        resolve(all.filter((item) => String(item?._searchText || "").includes(term)));
      };

      request.onerror = (event) => reject(event.target.error || new Error("No se pudieron buscar estudiantes."));
    });
  }

  global.MesaIndexedDb = {
    openDb,
    normalizeSearchText,
    setMeta,
    getMeta,
    putInvitation,
    getInvitationById,
    getAllInvitations,
    deleteInvitation,
    searchInvitations,
    getDirtyInvitations,
    markInvitationAsSynced,
    replaceStudentsCache,
    getStudentById,
    searchStudents
  };
})(window);