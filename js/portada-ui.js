// ============================================================
// PORTADA — Saludo con nombre del maestro y grado
// ============================================================
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function renderSaludoPortada() {
  const saludoEl = document.getElementById("portada-saludo");
  const gradoEl = document.getElementById("portada-grado");
  if (!saludoEl || !gradoEl) return;
  try {
    const snap = await getDoc(doc(db, "configuracion", "escuela"));
    if (!snap.exists()) return;
    const { maestroNombre, grado } = snap.data();
    if (maestroNombre) saludoEl.textContent = `Bienvenido/a a bordo, ${maestroNombre} 👋`;
    if (grado) gradoEl.textContent = grado;
  } catch (err) {
    console.error("No se pudo cargar el saludo de portada:", err);
  }
}

renderSaludoPortada();
