/*
=========================================================
Nombre completo: mesa-firebase.js
Ruta o ubicación: /js/mesa-firebase.js
Función o funciones:
- Inicializar Firebase.
- Leer estudiantes desde Firestore.
- Leer profesores desde Firestore.
- Subir invitaciones locales a Firestore.
=========================================================
*/
"use strict";

(function attachMesaFirebase(global) {
  const FIREBASE_APP_SCRIPT = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
  const FIREBASE_FIRESTORE_SCRIPT = "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js";

  let readyPromise = null;
  let firebaseApp = null;
  let firestoreDb = null;

  function safeFirebaseText(value) {
    return String(value || "").trim();
  }

  function pickFirstText(...values) {
    for (const value of values) {
      const safeValue = safeFirebaseText(value);
      if (safeValue) {
        return safeValue;
      }
    }

    return "";
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((item) => item.src === src);

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };

      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));

      document.head.appendChild(script);
    });
  }

  async function ensureReady() {
    if (readyPromise) {
      return readyPromise;
    }

    readyPromise = (async () => {
      await loadScript(FIREBASE_APP_SCRIPT);
      await loadScript(FIREBASE_FIRESTORE_SCRIPT);

      if (!global.firebase) {
        throw new Error("Firebase no quedó disponible en window.");
      }

      if (!firebaseApp) {
        firebaseApp = global.firebase.initializeApp({
          apiKey: global.MesaFirebaseConfig.apiKey,
          authDomain: global.MesaFirebaseConfig.authDomain,
          projectId: global.MesaFirebaseConfig.projectId,
          storageBucket: global.MesaFirebaseConfig.storageBucket,
          messagingSenderId: global.MesaFirebaseConfig.messagingSenderId,
          appId: global.MesaFirebaseConfig.appId
        });
      }

      if (!firestoreDb) {
        firestoreDb = global.firebase.firestore();
      }

      return {
        app: firebaseApp,
        db: firestoreDb
      };
    })();

    return readyPromise;
  }

  function normalizeStudentDoc(doc) {
    const data = doc.data() || {};

    return {
      id: String(data.numeroIdentificacion || doc.id || "").trim(),
      Academico: data.Academico || "",
      ActualizaciónDatos: data.ActualizaciónDatos || "",
      AprobacionComplexivoProyecto: data.AprobacionComplexivoProyecto || "",
      AprobacionTitulacion: data.AprobacionTitulacion || "",
      Celular: data.Celular || "",
      CodigoCarrera: data.CodigoCarrera || "",
      CorreoInstitucional: data.CorreoInstitucional || "",
      CorreoPersonal: data.CorreoPersonal || "",
      Documentacion: data.Documentacion || "",
      Financiero: data.Financiero || "",
      HorarioComplexivo: data.HorarioComplexivo || "",
      Ingles: data.Ingles || "",
      NombreCarrera: data.NombreCarrera || "",
      Nombres: data.Nombres || "",
      PrácticasVinculacion: data["PrácticasVinculacion"] || "",
      SeguimientoGraduados: data.SeguimientoGraduados || "",
      Titulacion: data.Titulacion || "",
      Vinculacion: data.Vinculacion || "",
      estadoMatricula: data.estadoMatricula || "",
      numeroIdentificacion: data.numeroIdentificacion || doc.id || "",
      periodoId: data.periodoId || "",
      ultimaSincronizacion: data.ultimaSincronizacion || "",
      ultimoPeriodoId: data.ultimoPeriodoId || ""
    };
  }

  function normalizeTeacherDoc(doc) {
    const data = doc.data() || {};
    const fullName = pickFirstText(
      data.Nombres,
      data.nombres,
      data.nombreCompleto,
      data.fullName,
      data.nombre,
      data.displayName
    );
    const treatment = pickFirstText(
      data.tratamiento,
      data.treatment,
      data.titulo,
      data.abreviaturaTitulo,
      data.grado
    );
    const identification = pickFirstText(
      data.numeroIdentificacion,
      data.identificacion,
      data.cedula,
      data.id,
      doc.id
    );

    return {
      // Corrección: se normaliza un modelo simple de profesor para el selector del formulario.
      // Esto evita depender de nombres de campos rígidos si la colección varía levemente.
      id: identification || fullName,
      identification,
      fullName,
      treatment
    };
  }

  async function readAllStudents() {
    const ready = await ensureReady();
    const collectionName = global.MesaFirebaseConfig.collections.estudiantes;

    const snapshot = await ready.db.collection(collectionName).get();
    const result = [];

    snapshot.forEach((doc) => {
      result.push(normalizeStudentDoc(doc));
    });

    return result;
  }

  async function readAllTeachers() {
    const ready = await ensureReady();
    const collectionName = safeFirebaseText(global.MesaFirebaseConfig?.collections?.profesores);

    // Corrección: si no existe una colección configurada, se devuelve una lista vacía sin romper la app.
    if (!collectionName) {
      return [];
    }

    const snapshot = await ready.db.collection(collectionName).get();
    const result = [];

    snapshot.forEach((doc) => {
      const teacher = normalizeTeacherDoc(doc);

      // Corrección: solo se agregan registros con nombre visible para evitar opciones vacías en el selector.
      if (teacher.fullName) {
        result.push(teacher);
      }
    });

    result.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

    return result;
  }

  function buildInvitationPayload(invitation) {
    const normalized = global.MesaInvitationSchema.normalizeInvitation(invitation);

    return {
      invitationId: normalized.id,
      city: normalized.city,
      documentDate: normalized.documentDate,
      sessionDate: normalized.sessionDate,
      promotion: normalized.promotion,
      article: normalized.article,
      treatment: normalized.treatment,
      fullName: normalized.fullName,
      identification: normalized.identification,
      assignments: normalized.assignments,
      mode: global.MesaInvitationSchema.getInvitationMode(normalized),
      htmlPreview: global.MesaTemplateEngine.buildLetterHtml(normalized),
      updatedAt: new Date().toISOString()
    };
  }

  async function upsertInvitation(invitation) {
    const ready = await ensureReady();
    const collectionName = global.MesaFirebaseConfig.collections.invitaciones;
    const safeId = String(invitation?.id || "").trim();

    if (!safeId) {
      throw new Error("No se puede sincronizar una invitación sin ID.");
    }

    const payload = buildInvitationPayload(invitation);

    await ready.db.collection(collectionName).doc(safeId).set(payload, { merge: true });

    return {
      id: safeId,
      payload
    };
  }

  async function upsertManyInvitations(invitations) {
    const results = [];

    for (const invitation of invitations || []) {
      const saved = await upsertInvitation(invitation);
      results.push(saved);
    }

    return results;
  }

  global.MesaFirebase = {
    ensureReady,
    readAllStudents,
    readAllTeachers,
    upsertInvitation,
    upsertManyInvitations
  };
})(window);