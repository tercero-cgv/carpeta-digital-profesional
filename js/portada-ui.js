// ============================================================
// PORTADA — Saludo con nombre del maestro y grado, reutilizando
// la config de escuela ya guardada en Fase 6 (configuracion/escuela).
// No se pide de nuevo; si esa config aún no existe, se deja el
// saludo genérico tal como estaba.
// ============================================================
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function renderSaludoPortada() {
  const saludoEl = document.getElementById("portada-saludo");
  const gradoEl = document.getElementById("portada-grado");
  if (!saludoEl || !gradoEl) return;

  try {
    const snap = await getDoc(doc(db, "configuracion", "escuela"));
    if (!snap.exists()) return; // aún no se ha configurado — se queda el saludo genérico

    const { maestroNombre, grado } = snap.data();
    if (maestroNombre) saludoEl.textContent = `Bienvenido/a a bordo, ${maestroNombre} 👋`;
    if (grado) gradoEl.textContent = grado;
  } catch (err) {
    console.error("No se pudo cargar el saludo de portada:", err);
  }
}

renderSaludoPortada();
