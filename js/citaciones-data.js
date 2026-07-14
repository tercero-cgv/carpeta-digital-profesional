// ============================================================
// CITACIONES E INTERVENCIONES — Firestore
// Ambas colecciones exigen `estudianteId` — nunca se guarda un
// registro sin estudiante, tal como se pidió ("atado al estudiante
// en todo momento"). Esta fase NO se conecta a BigDreamers ni a
// ningún otro sistema — es standalone según lo pedido.
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const citacionesRef = collection(db, "citaciones");
const intervencionesRef = collection(db, "intervenciones");
const escuelaConfigRef = doc(db, "configuracion", "escuela");

let cacheCitaciones = [];
let cacheIntervenciones = [];
const suscriptoresCit = new Set();
const suscriptoresInt = new Set();

export function escucharCitaciones(callback) {
  suscriptoresCit.add(callback);
  if (cacheCitaciones.length > 0) callback(cacheCitaciones);
  return () => suscriptoresCit.delete(callback);
}
export function escucharIntervenciones(callback) {
  suscriptoresInt.add(callback);
  if (cacheIntervenciones.length > 0) callback(cacheIntervenciones);
  return () => suscriptoresInt.delete(callback);
}

onSnapshot(query(citacionesRef, orderBy("creadoEn", "desc")), (snap) => {
  cacheCitaciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  suscriptoresCit.forEach((cb) => cb(cacheCitaciones));
});
onSnapshot(query(intervencionesRef, orderBy("creadoEn", "desc")), (snap) => {
  cacheIntervenciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  suscriptoresInt.forEach((cb) => cb(cacheIntervenciones));
});

export async function guardarCitacion(datos) {
  if (!datos.estudianteId) throw new Error("Toda citación requiere un estudiante.");
  return addDoc(citacionesRef, { ...datos, creadoEn: serverTimestamp() });
}

export async function guardarIntervencion(datos) {
  if (!datos.estudianteId) throw new Error("Toda intervención requiere un estudiante.");
  return addDoc(intervencionesRef, { ...datos, creadoEn: serverTimestamp() });
}

// ---------- Configuración de la escuela (se pide una sola vez) ----------
export async function obtenerConfigEscuela() {
  const snap = await getDoc(escuelaConfigRef);
  return snap.exists() ? snap.data() : null;
}
export async function guardarConfigEscuela(datos) {
  await setDoc(escuelaConfigRef, datos);
}
