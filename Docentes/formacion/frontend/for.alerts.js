/*
Nombre completo: for.alerts.js
Ruta o ubicación: formacion/frontend/for.alerts.js
Función o funciones: Mostrar alertas visuales temporales tipo toast para éxito, error e información dentro del módulo Formación
*/

const forToastZone = () => document.getElementById("forToastZone");

function forCreateToast(message, variant = "info") {
  const zone = forToastZone();
  if (!zone) return;

  const toast = document.createElement("div");
  toast.className = `forToast ${
    variant === "success"
      ? "forToastSuccess"
      : variant === "error"
        ? "forToastError"
        : "forToastInfo"
  }`;
  toast.textContent = message;

  zone.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

export function forToastSuccess(message) {
  forCreateToast(message, "success");
}

export function forToastError(message) {
  forCreateToast(message, "error");
}

export function forToastInfo(message) {
  forCreateToast(message, "info");
}