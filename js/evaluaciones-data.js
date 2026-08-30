// ============================================================
// EVALUACIONES — CRUD contra Firestore (colección "instrumentos")
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const instrumentosRef = collection(db, "instrumentos");
const instrumentosQuery = query(instrumentosRef, orderBy("creadoEn", "desc"));

let cacheInstrumentos = [];
const suscriptores = new Set();

export function escucharInstrumentos(callback) {
  suscriptores.add(callback);
  if (cacheInstrumentos.length > 0) callback(cacheInstrumentos);
  return () => suscriptores.delete(callback);
}

onSnapshot(
  instrumentosQuery,
  (snapshot) => {
    cacheInstrumentos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    suscriptores.forEach((cb) => cb(cacheInstrumentos));
  },
  (error) => console.error("Error escuchando instrumentos:", error)
);

export async function crearInstrumento({ materia, tipo, tema, fecha, semana }) {
  return addDoc(instrumentosRef, {
    materia, tipo, tema, fecha, semana,
    partes: [{ id: `p-${Date.now()}`, nombre: "Parte 1", puntosPosibles: 10 }],
    puntuaciones: {},
    creadoEn: serverTimestamp()
  });
}

/**
 * Edita los datos generales de un instrumento ya creado — incluida la
 * materia, para poder reasignarlo si se guardó bajo la materia
 * equivocada, sin tener que borrarlo y perder las puntuaciones ya
 * entradas.
 */
export async function editarInstrumento(instrumentoId, { materia, tipo, tema, fecha, semana }) {
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, { materia, tipo, tema, fecha, semana });
}

export async function agregarParte(instrumentoId, nombre, puntosPosibles) {
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, { partes: arrayUnion({ id: `p-${Date.now()}`, nombre, puntosPosibles }) });
}

/**
 * Edita el nombre/puntos posibles de una parte existente. Como `partes`
 * es un arreglo (no un mapa), se reescribe el arreglo completo con esa
 * entrada actualizada — no hace falta tocar `puntuaciones`, porque los
 * totales siempre se recalculan en el cliente a partir de `partes`
 * vigente, nunca de un total guardado.
 */
export async function editarParte(instrumentoId, parteId, nombre, puntosPosibles, partesActuales) {
  const nuevasPartes = partesActuales.map((p) =>
    p.id === parteId ? { ...p, nombre, puntosPosibles } : p
  );
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, { partes: nuevasPartes });
}

/**
 * Elimina una parte del instrumento. A diferencia de editar, esto SÍ
 * necesita limpiar `puntuaciones` — si no se borra la puntuación de esa
 * parte en cada estudiante, quedaría un puntaje "fantasma" sumando al
 * total de una parte que ya no existe. Se recalcula total/porcentaje
 * de cada estudiante con las partes restantes antes de guardar.
 */
export async function eliminarParte(instrumentoId, parteId, partesActuales, puntuacionesActuales) {
  const nuevasPartes = partesActuales.filter((p) => p.id !== parteId);
  const puntosPosiblesNuevos = nuevasPartes.reduce((s, p) => s + Number(p.puntosPosibles || 0), 0);

  const nuevasPuntuaciones = {};
  for (const [estudianteId, datos] of Object.entries(puntuacionesActuales || {})) {
    const porParte = { ...(datos.porParte || {}) };
    delete porParte[parteId];
    const total = Object.values(porParte).reduce((s, v) => s + Number(v || 0), 0);
    const porcentaje = puntosPosiblesNuevos > 0 ? Math.round((total / puntosPosiblesNuevos) * 1000) / 10 : 0;
    nuevasPuntuaciones[estudianteId] = { porParte, total, porcentaje };
  }

  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, { partes: nuevasPartes, puntuaciones: nuevasPuntuaciones });
}

export async function marcarPuntuacion(instrumentoId, estudianteId, parteId, puntos, total, porcentaje) {
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, {
    [`puntuaciones.${estudianteId}.porParte.${parteId}`]: puntos,
    [`puntuaciones.${estudianteId}.total`]: total,
    [`puntuaciones.${estudianteId}.porcentaje`]: porcentaje
  });
}
