// ============================================================
// APP SHELL — Fecha de "bitácora", manejo de navegación
// ============================================================
import { refrescarEstudiantesAsistencia } from "./asistencia-ui.js";
import { refrescarEstudiantesEvaluaciones } from "./evaluaciones-ui.js";
import { refrescarEstudiantesCitaciones } from "./citaciones-ui.js";

function renderMissionDate() {
  const el = document.getElementById("mission-date");
  if (!el) return;
  const now = new Date();
  const formatted = now.toLocaleDateString("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  el.textContent = `Bitácora · ${formatted}`;
}

// Enrutamiento simple entre secciones. Los módulos que aún no existen
// (Evaluaciones, Citaciones) siguen con "nav-link-disabled" y no tienen
// sección asociada todavía.
function mostrarSeccion(nombre) {
  document.querySelectorAll(".app-section").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== `section-${nombre}`);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("nav-link-active", link.dataset.section === nombre);
  });
  // La lista de tripulación puede haber cambiado desde que cargó la página
  // (nuevo estudiante añadido), así que se refresca al entrar a Asistencia.
  if (nombre === "asistencia") refrescarEstudiantesAsistencia();
  if (nombre === "evaluaciones") refrescarEstudiantesEvaluaciones();
  if (nombre === "citaciones") refrescarEstudiantesCitaciones();
}

function setupNav() {
  document.querySelectorAll(".nav-link:not(.nav-link-disabled)").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion(link.dataset.section);
    });
  });
}

renderMissionDate();
setupNav();
