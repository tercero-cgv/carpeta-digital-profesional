// ============================================================
// BIGDREAMERS BRIDGE — Segunda conexión de Firebase (proyecto
// separado) para escribir/leer notas en BigDreamers.
//
// IMPORTANTE — por qué esto usa updateDoc con arrayUnion y notación
// de punto, en vez de leer el documento y volver a escribirlo
// completo con setDoc: un patrón "leer → modificar → escribir todo"
// no es atómico. Si dos envíos se solapan (ej. un doble clic, o dos
// pestañas enviando a la vez), el segundo puede sobrescribir por
// completo lo que el primero acababa de guardar, perdiendo datos
// silenciosamente — eso fue exactamente lo que pasó con
// "instrumentos: []" quedando vacío mientras "puntuaciones" sí tenía
// datos. Escribir solo los campos que cambian evita esa clase de bug
// por completo, sin importar el orden en que terminen los envíos.
// ============================================================
import { db as rollBookDb } from "./firebase-config.js";
import { doc as rbDoc, updateDoc as rbUpdateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const BD_FB_CONFIG = {
  apiKey: "AIzaSyDeek3nAsZ4Vxg-Lp_TNJAxP61o5I2ZITE",
  authDomain: "bigdreamers-e7afb.firebaseapp.com",
  projectId: "bigdreamers-e7afb",
  storageBucket: "bigdreamers-e7afb.firebasestorage.app",
  messagingSenderId: "855133917142",
  appId: "1:855133917142:web:aaf551586b0c3fcd1d9e77"
};

const bdApp = initializeApp(BD_FB_CONFIG, "bigdreamers-desde-rollbook");
const bdDb = getFirestore(bdApp);

export async function obtenerRosterBigDreamers() {
  const snap = await getDoc(doc(bdDb, "bigdreamers", "estudiantes"));
  return snap.exists() ? snap.data().lista || [] : [];
}

function normalizarNombre(str) {
  return (str || "")
    .toString()
    .replace(/,/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export async function resolverBigDreamersId(estudianteRollBook, rosterBigDreamers) {
  if (estudianteRollBook.bigdreamersId) return estudianteRollBook.bigdreamersId;
  const nombreRB = normalizarNombre(estudianteRollBook.nombreCompleto);
  const match = rosterBigDreamers.find((s) => normalizarNombre(s.nombre) === nombreRB);
  if (!match) return null;
  await rbUpdateDoc(rbDoc(rollBookDb, "estudiantes", estudianteRollBook.id), { bigdreamersId: match.id });
  return match.id;
}

export async function obtenerInstrumentosBigDreamers(materiaBD) {
  const materiaDocRef = doc(bdDb, "bigdreamers", `materia_${materiaBD}`);
  const snap = await getDoc(materiaDocRef);
  return snap.exists() ? snap.data().instrumentos || [] : [];
}

/** Crea el documento de la materia si todavía no existe, sin tocar nada si ya existe. */
async function asegurarDocumentoMateria(materiaDocRef) {
  const snap = await getDoc(materiaDocRef);
  if (!snap.exists()) {
    await setDoc(materiaDocRef, { instrumentos: [], puntuaciones: {} });
  }
}

export async function enviarAInstrumentoExistenteBigDreamers({
  materiaBD,
  instrumentoIdBD,
  puntuacionesPorEstudianteId,
  estudiantesRollBook
}) {
  const rosterBigDreamers = await obtenerRosterBigDreamers();
  const materiaDocRef = doc(bdDb, "bigdreamers", `materia_${materiaBD}`);
  await asegurarDocumentoMateria(materiaDocRef);

  let enviados = 0;
  const sinCoincidencia = [];
  const camposAActualizar = {};

  for (const [estudianteId, puntos] of Object.entries(puntuacionesPorEstudianteId)) {
    const estudiante = estudiantesRollBook.find((e) => e.id === estudianteId);
    if (!estudiante) continue;
    const bdId = await resolverBigDreamersId(estudiante, rosterBigDreamers);
    if (!bdId) { sinCoincidencia.push(estudiante.nombreCompleto); continue; }
    camposAActualizar[`puntuaciones.${bdId}.${instrumentoIdBD}`] = puntos;
    enviados++;
  }

  if (Object.keys(camposAActualizar).length > 0) {
    await updateDoc(materiaDocRef, camposAActualizar);
  }
  return { enviados, sinCoincidencia };
}

export async function enviarInstrumentoNuevoABigDreamers({
  materiaBD,
  tipo,
  tema,
  fecha,
  valorTotal,
  puntuacionesPorEstudianteId,
  estudiantesRollBook
}) {
  const rosterBigDreamers = await obtenerRosterBigDreamers();
  const materiaDocRef = doc(bdDb, "bigdreamers", `materia_${materiaBD}`);
  await asegurarDocumentoMateria(materiaDocRef);

  const instId = `rollbook-${Date.now()}`;
  const nuevoInstrumento = { id: instId, tipo, tema, fecha, valor: valorTotal };

  let enviados = 0;
  const sinCoincidencia = [];
  const camposAActualizar = { instrumentos: arrayUnion(nuevoInstrumento) };

  for (const [estudianteId, puntos] of Object.entries(puntuacionesPorEstudianteId)) {
    const estudiante = estudiantesRollBook.find((e) => e.id === estudianteId);
    if (!estudiante) continue;
    const bdId = await resolverBigDreamersId(estudiante, rosterBigDreamers);
    if (!bdId) { sinCoincidencia.push(estudiante.nombreCompleto); continue; }
    camposAActualizar[`puntuaciones.${bdId}.${instId}`] = puntos;
    enviados++;
  }

  await updateDoc(materiaDocRef, camposAActualizar);
  return { enviados, sinCoincidencia };
}
