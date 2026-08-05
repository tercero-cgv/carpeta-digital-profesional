// ============================================================
// ESTUDIANTES — CRUD contra Firestore (colección "estudiantes")
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
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const estudiantesRef = collection(db, "estudiantes");
const estudiantesQuery = query(estudiantesRef, orderBy("apellidos"));

let cacheEstudiantes = [];
const suscriptores = new Set();

export function escucharTripulacion(callback) {
  suscriptores.add(callback);
  if (cacheEstudiantes.length > 0) callback(cacheEstudiantes);
  return () => suscriptores.delete(callback);
}

onSnapshot(
  estudiantesQuery,
  (snapshot) => {
    cacheEstudiantes = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    suscriptores.forEach((cb) => cb(cacheEstudiantes));
  },
  (error) => console.error("Error escuchando la colección estudiantes:", error)
);

export async function agregarEstudiante(datos) {
  return addDoc(estudiantesRef, {
    nombre: datos.nombre.trim(),
    apellidos: datos.apellidos.trim(),
    numero: datos.numero.trim(),
    genero: datos.genero,
    notas: datos.notas?.trim() || "",
    activo: true,
    creadoEn: serverTimestamp()
  });
}

export async function editarEstudiante(id, nuevosDatos) {
  const ref = doc(db, "estudiantes", id);
  return updateDoc(ref, {
    nombre: nuevosDatos.nombre.trim(),
    apellidos: nuevosDatos.apellidos.trim(),
    numero: nuevosDatos.numero.trim(),
    genero: nuevosDatos.genero,
    notas: nuevosDatos.notas?.trim() || ""
  });
}

export async function eliminarEstudiante(id) {
  const ref = doc(db, "estudiantes", id);
  return updateDoc(ref, { activo: false });
}

export function obtenerListaTripulacion() {
  return cacheEstudiantes
    .filter((e) => e.activo !== false)
    .map((e) => ({
      id: e.id,
      nombreCompleto: `${e.nombre} ${e.apellidos}`
    }));
}

export function obtenerRosterCompleto() {
  return cacheEstudiantes
    .filter((e) => e.activo !== false)
    .map((e) => ({
      id: e.id,
      nombreCompleto: `${e.nombre} ${e.apellidos}`,
      bigdreamersId: e.bigdreamersId || null
    }));
}
