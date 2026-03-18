/* =========================================================
Nombre del archivo: prioridad.notifications.js
Ruta: /prioridad/prioridad.notifications.js
Función:
- Request permission + notify
========================================================= */
(function(){
  const Toast = window.PrioridadToast;

  async function requestPermission(){
    if (!("Notification" in window)){
      Toast.toast("Notificaciones", "Este navegador no soporta notificaciones.");
      return "unsupported";
    }
    try{
      const perm = await Notification.requestPermission();
      if (perm === "granted"){
        Toast.toast("Notificaciones activadas", "Listo. Te avisaré con alertas.");
      }else{
        Toast.toast("Notificaciones", "Permiso no concedido. Igual verás avisos dentro de la app.");
      }
      return perm;
    }catch(err){
      console.error(err);
      Toast.toast("Notificaciones", "No se pudo solicitar permiso.");
      return "error";
    }
  }

  function notify(title, body){
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try{ new Notification(title, { body }); }catch(_){}
  }

  window.PrioridadNotifs = { requestPermission, notify };
})();
