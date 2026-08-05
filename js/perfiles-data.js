// ============================================================
// PERFILES — CRUD contra Firestore (colección "perfiles_estudiantes")
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const perfilesRef = collection(db, "perfiles_estudiantes");
const perfilesQuery = query(perfilesRef, orderBy("enviadoEn", "desc"));

let cachePerfiles = [];
const suscriptores = new Set();

export function escucharPerfiles(callback) {
  suscriptores.add(callback);
  if (cachePerfiles.length > 0) callback(cachePerfiles);
  return () => suscriptores.delete(callback);
}

onSnapshot(
  perfilesQuery,
  (snapshot) => {
    cachePerfiles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    suscriptores.forEach((cb) => cb(cachePerfiles));
  },
  (error) => console.error("Error escuchando perfiles_estudiantes:", error)
);

export async function agregarPerfil(datos) {
  return addDoc(perfilesRef, {
    ...datos,
    estado: "pendiente",
    enviadoEn: serverTimestamp()
  });
}
