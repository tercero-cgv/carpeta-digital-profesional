// ============================================================
// ESTUDIANTES — CRUD contra Firestore (colección "estudiantes")
// Esta es la ÚNICA FUENTE DE VERDAD que usarán Asistencia,
// Evaluaciones y Citaciones más adelante.
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

// Ordenamos en el propio query por apellidos, así la tabla y cualquier
// módulo futuro reciben los datos ya en orden alfabético sin trabajo extra.
const estudiantesQuery = query(estudiantesRef, orderBy("apellidos"));

// Caché en memoria, actualizada en tiempo real por el listener de abajo.
// Incluye estudiantes activos e inactivos (la UI decide qué mostrar).
let cacheEstudiantes = [];

// Callbacks de la UI que quieren enterarse cuando cambie la lista.
const suscriptores = new Set();

/**
 * Arranca el listener en tiempo real (una sola vez) y notifica a
 * cualquier suscriptor cuando Firestore reporte cambios.
 */
export function escucharTripulacion(callback) {
  suscriptores.add(callback);
  // Si ya tenemos datos en caché (el listener ya estaba activo),
  // entregamos el estado actual de inmediato.
  if (cacheEstudiantes.length > 0) callback(cacheEstudiantes);
  return () => suscriptores.delete(callback); // función para desuscribirse
}

onSnapshot(
  estudiantesQuery,
  (snapshot) => {
    cacheEstudiantes = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    suscriptores.forEach((cb) => cb(cacheEstudiantes));
  },
  (error) => {
    console.error("Error escuchando la colección estudiantes:", error);
  }
);

/**
 * Añade un nuevo estudiante. `datos` = { nombre, apellidos, numero, genero, notas }
 */
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

/**
 * Edita un estudiante existente por su id de documento.
 */
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

/**
 * "Dar de baja" = baja lógica (soft delete), NO borra el documento.
 *
 * Decisión de diseño: el botón se llama "Dar de baja" porque un borrado
 * físico (`deleteDoc`) dejaría huérfanos los registros de asistencia y
 * evaluaciones de ese estudiante en los módulos futuros (Fase 4 y 5),
 * que van a referenciar este mismo `id`. Marcar `activo: false` preserva
 * el historial y saca al estudiante de las listas activas. Si en algún
 * momento quieres un borrado permanente real, lo añadimos como una
 * función aparte y explícita — no como parte de esta.
 */
export async function eliminarEstudiante(id) {
  const ref = doc(db, "estudiantes", id);
  return updateDoc(ref, { activo: false });
}

/**
 * Función exportable que usarán los módulos futuros (Asistencia,
 * Evaluaciones, Citaciones) para clonar la lista de estudiantes.
 * Devuelve EXCLUSIVAMENTE { id, nombreCompleto }, solo de estudiantes
 * activos, ya en orden alfabético por apellido (heredado del query).
 */
export function obtenerListaTripulacion() {
  return cacheEstudiantes
    .filter((e) => e.activo !== false)
    .map((e) => ({
      id: e.id,
      nombreCompleto: `${e.nombre} ${e.apellidos}`
    }));
}

/**
 * Igual que obtenerListaTripulacion(), pero sin recortar los campos —
 * lo usan módulos que necesitan más que { id, nombreCompleto }, como
 * el puente de BigDreamers (necesita leer/guardar `bigdreamersId`).
 * No reemplaza el contrato original; es un export aparte.
 */
export function obtenerRosterCompleto() {
  return cacheEstudiantes
    .filter((e) => e.activo !== false)
    .map((e) => ({
      id: e.id,
      nombreCompleto: `${e.nombre} ${e.apellidos}`,
      bigdreamersId: e.bigdreamersId || null
    }));
}
