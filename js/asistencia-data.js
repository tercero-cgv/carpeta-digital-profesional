// ============================================================
// ASISTENCIA — Firestore. Un documento por ESTUDIANTE + MES.
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

let cacheAsistencia = {};
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
    snapshot.forEach((d) => { cacheAsistencia[d.id] = d.data(); });
    suscriptores.forEach((cb) => cb(cacheAsistencia));
  },
  (error) => console.error("Error escuchando asistencia:", error)
);

export async function marcarCelda(estudianteId, mesKey, fechaISO, codigo) {
  const id = `${estudianteId}_${mesKey}`;
  const ref = doc(db, "asistencia", id);
  const valor = codigo === "" ? deleteField() : codigo;
  await setDoc(ref, { estudianteId, mesKey, dias: { [fechaISO]: valor } }, { merge: true });
}

export async function marcarCodigoGrupal(mesKey, fechaISO, estudianteIds, codigo) {
  const batch = writeBatch(db);
  estudianteIds.forEach((estudianteId) => {
    const id = `${estudianteId}_${mesKey}`;
    const ref = doc(db, "asistencia", id);
    batch.set(ref, { estudianteId, mesKey, dias: { [fechaISO]: codigo } }, { merge: true });
  });
  await batch.commit();
}

export async function obtenerAnoEscolar() {
  const snap = await getDoc(configRef);
  return snap.exists() ? snap.data().inicio : null;
}

export async function guardarAnoEscolar(anoInicio) {
  await setDoc(configRef, { inicio: anoInicio });
}
