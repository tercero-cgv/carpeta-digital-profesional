// ============================================================
// EVALUACIONES — CRUD contra Firestore (colección "instrumentos")
// Un documento por instrumento. `partes` son las columnas de
// puntos posibles (desglose); `puntuaciones` guarda, por
// estudiante, los puntos obtenidos en cada parte + total + %.
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
    materia,
    tipo,
    tema,
    fecha,
    semana,
    partes: [{ id: `p-${Date.now()}`, nombre: "Parte 1", puntosPosibles: 10 }],
    puntuaciones: {},
    creadoEn: serverTimestamp()
  });
}

export async function agregarParte(instrumentoId, nombre, puntosPosibles) {
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, {
    partes: arrayUnion({ id: `p-${Date.now()}`, nombre, puntosPosibles })
  });
}

/**
 * Guarda los puntos obtenidos de un estudiante en una parte específica,
 * junto con el total y porcentaje ya recalculados (el cliente los
 * calcula porque ya tiene el documento completo en caché).
 */
export async function marcarPuntuacion(instrumentoId, estudianteId, parteId, puntos, total, porcentaje) {
  const ref = doc(db, "instrumentos", instrumentoId);
  return updateDoc(ref, {
    [`puntuaciones.${estudianteId}.porParte.${parteId}`]: puntos,
    [`puntuaciones.${estudianteId}.total`]: total,
    [`puntuaciones.${estudianteId}.porcentaje`]: porcentaje
  });
}
