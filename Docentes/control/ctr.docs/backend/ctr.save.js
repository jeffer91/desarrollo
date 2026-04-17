/* =========================================================
Nombre del archivo: ctr.save.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.save.js
Función o funciones:
- bindSave({ btn, getCapId, getPeriodoKey, getPending, setBusy, onSaved, onError })
========================================================= */
import { guardarChecklist } from "./ctr.repo.js";

function asText(v){
  return String(v == null ? "" : v).trim();
}

function normalizeToken(value){
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function asDocStatus(value, fallback, allowBlocked){
  // Comentario técnico:
  // este archivo ya no debe transformar estados a true/false.
  // Normaliza lo recibido desde pending para conservar
  // TIENE, PENDIENTE, NO_APLICA y BLOQUEADO.
  if (typeof value === "boolean"){
    return value ? "TIENE" : fallback;
  }

  const token = normalizeToken(value);
  if (!token) return fallback;

  if (token === "✅" || token === "TIENE" || token === "SI" || token === "TRUE"){
    return "TIENE";
  }

  if (token === "⏳" || token === "PENDIENTE"){
    return "PENDIENTE";
  }

  if (token === "⛔" || token === "NO_APLICA"){
    return "NO_APLICA";
  }

  if (allowBlocked && (token === "🔒" || token === "BLOQUEADO" || token === "NO_HABILITADO")){
    return "BLOQUEADO";
  }

  return fallback;
}

function asDocenteStatus(value){
  // Comentario técnico:
  // estadoDocente se envía como código estable para que Firestore
  // no guarde solo emoji y luego se pueda filtrar/exportar.
  const token = normalizeToken(value);
  if (!token) return "ACTIVO";

  if (token === "🟢" || token === "ACTIVO"){
    return "ACTIVO";
  }

  if (token === "🚪" || token === "SALIO" || token === "SALIDA" || token === "YA_SALIO" || token === "INACTIVO"){
    return "SALIO";
  }

  if (token === "📝" || token === "RENUNCIO" || token === "RENUNCIA"){
    return "RENUNCIO";
  }

  return "ACTIVO";
}

export function bindSave(opts){
  const btn = opts && opts.btn;
  if (!btn) return;

  const getCapId = opts.getCapId;
  const getPeriodoKey = opts.getPeriodoKey;
  const getPending = opts.getPending;
  const setBusy = opts.setBusy;
  const onSaved = opts.onSaved;
  const onError = opts.onError;

  btn.addEventListener("click", async () => {
    try{
      const capIdRaw = (typeof getCapId === "function") ? getCapId() : "";
      const periodoKeyRaw = (typeof getPeriodoKey === "function") ? getPeriodoKey() : "";
      const capId = asText(capIdRaw);
      const periodoKey = asText(periodoKeyRaw);
      const pending = (typeof getPending === "function") ? getPending() : null;

      if (!(pending instanceof Map)) return;
      if (!pending.size) return;

      // Comentario técnico:
      // planIndividual y reporteResultados siguen siendo por periodo,
      // por eso el guardado necesita una clave de periodo válida.
      if (!periodoKey){
        throw new Error("No se pudo resolver el período actual para guardar plan individual y reporte.");
      }

      if (typeof setBusy === "function") setBusy(true);

      const payload = [];

      pending.forEach((v, docenteId) => {
        const nombres = asText(v && v.nombres);
        const apellidos = asText(v && v.apellidos);

        if (!nombres || !apellidos){
          throw new Error(`No se puede guardar el docente ${docenteId} porque nombres o apellidos están vacíos.`);
        }

        payload.push({
          docenteId,
          nombres,
          apellidos,

          // Comentario técnico:
          // enviamos estados normalizados para que ctr.repo.js los persista
          // como códigos y no se pierda información por convertir a booleano.
          estadoDocente: asDocenteStatus(v && v.estadoDocente),
          planIndividual: asDocStatus(v && v.planIndividual, "PENDIENTE", false),
          acuerdoPatrocinio: capId
            ? asDocStatus(v && v.acuerdoPatrocinio, "PENDIENTE", true)
            : "",
          reporteResultados: asDocStatus(v && v.reporteResultados, "PENDIENTE", true)
        });
      });

      const res = await guardarChecklist(capId, periodoKey, payload);

      if (typeof setBusy === "function") setBusy(false);
      if (typeof onSaved === "function"){
        await onSaved(Number((res && res.saved) || 0));
      }
    } catch (e){
      if (typeof setBusy === "function") setBusy(false);
      if (typeof onError === "function") onError(e);
    }
  });
}