// ============================================================
// ASISTENCIA — Firestore
// Un documento por ESTUDIANTE + MES (no por día, no por año completo).
// Doc id: `${estudianteId}_${mesKey}`  ej. "abc123_2026-08"
// Campos: { estudianteId, mesKey, dias: { "2026-08-03": "1", ... } }
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  writeBatch,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const asistenciaRef = collection(db, "asistencia");
const configRef = doc(db, "configuracion", "anoEscolar");

// Caché completa en memoria — el volumen es pequeño (≈ estudiantes × 10 meses),
// así que se escucha la colección entera una sola vez y se deriva todo
// (grid del mes, totales, bitácora anual) del mismo caché en el cliente.
let cacheAsistencia = {}; // { "estudianteId_mesKey": { dias: {...} } }
const suscriptores = new Set();

export function escucharAsistencia(callback) {
  suscriptores.add(callback);
  callback(cacheAsistencia);
  return () => suscriptores.delete(callback);
}

onSnapshot(
  asistenciaRef,
  (snapshot) => {
    cacheAsistencia = {};
    snapshot.forEach((d) => {
      cacheAsistencia[d.id] = d.data();
    });
    suscriptores.forEach((cb) => cb(cacheAsistencia));
  },
  (error) => console.error("Error escuchando asistencia:", error)
);

/**
 * Marca (o borra, si codigo === "") el código de un estudiante en una
 * fecha específica de un mes. Escritura de un solo campo vía dot-notation,
 * no reescribe el documento completo.
 */
export async function marcarCelda(estudianteId, mesKey, fechaISO, codigo) {
  const id = `${estudianteId}_${mesKey}`;
  const ref = doc(db, "asistencia", id);
  const valor = codigo === "" ? deleteField() : codigo;
  await setDoc(
    ref,
    { estudianteId, mesKey, dias: { [fechaISO]: valor } },
    { merge: true }
  );
}

/**
 * Códigos que describen un evento del GRUPO COMPLETO, no de un estudiante
 * individual — porque en un salón autocontenido (mismo grupo todo el día)
 * la asistencia se toma una sola vez al día, no por materia/período:
 *   NC  = no hubo clase ese día para nadie
 *   GO  = el maestro no dio clase por gestión oficial — tampoco hubo
 *         clase normal para el grupo ese día
 * Se aplican en lote a todos los estudiantes activos con una sola escritura.
 */
export async function marcarCodigoGrupal(mesKey, fechaISO, estudianteIds, codigo) {
  const batch = writeBatch(db);
  estudianteIds.forEach((estudianteId) => {
    const id = `${estudianteId}_${mesKey}`;
    const ref = doc(db, "asistencia", id);
    batch.set(ref, { estudianteId, mesKey, dias: { [fechaISO]: codigo } }, { merge: true });
  });
  await batch.commit();
}

// ---------- Configuración del año escolar (se pide una sola vez) ----------
export async function obtenerAnoEscolar() {
  const snap = await getDoc(configRef);
  return snap.exists() ? snap.data().inicio : null;
}

export async function guardarAnoEscolar(anoInicio) {
  await setDoc(configRef, { inicio: anoInicio });
}
