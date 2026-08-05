// ============================================================
// BIGDREAMERS BRIDGE — Segunda conexión de Firebase (proyecto
// separado) para escribir/leer notas en BigDreamers.
// ============================================================
import { db as rollBookDb } from "./firebase-config.js";
import { doc as rbDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
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
  return (str || "").trim().toLowerCase();
}

export async function resolverBigDreamersId(estudianteRollBook, rosterBigDreamers) {
  if (estudianteRollBook.bigdreamersId) return estudianteRollBook.bigdreamersId;
  const nombreRB = normalizarNombre(estudianteRollBook.nombreCompleto);
  const match = rosterBigDreamers.find((s) => normalizarNombre(s.nombre) === nombreRB);
  if (!match) return null;
  await updateDoc(rbDoc(rollBookDb, "estudiantes", estudianteRollBook.id), { bigdreamersId: match.id });
  return match.id;
}

export async function obtenerInstrumentosBigDreamers(materiaBD) {
  const materiaDocRef = doc(bdDb, "bigdreamers", `materia_${materiaBD}`);
  const snap = await getDoc(materiaDocRef);
  return snap.exists() ? snap.data().instrumentos || [] : [];
}

export async function enviarAInstrumentoExistenteBigDreamers({
  materiaBD,
  instrumentoIdBD,
  puntuacionesPorEstudianteId,
  estudiantesRollBook
}) {
  const rosterBigDreamers = await obtenerRosterBigDreamers();
  const materiaDocRef = doc(bdDb, "bigdreamers", `materia_${materiaBD}`);
  const materiaSnap = await getDoc(materiaDocRef);
  const materiaData = materiaSnap.exists()
    ? { instrumentos: materiaSnap.data().instrumentos || [], puntuaciones: materiaSnap.data().puntuaciones || {} }
    : { instrumentos: [], puntuaciones: {} };

  let enviados = 0;
  const sinCoincidencia = [];

  for (const [estudianteId, puntos] of Object.entries(puntuacionesPorEstudianteId)) {
    const estudiante = estudiantesRollBook.find((e) => e.id === estudianteId);
    if (!estudiante) continue;
    const bdId = await resolverBigDreamersId(estudiante, rosterBigDreamers);
    if (!bdId) { sinCoincidencia.push(estudiante.nombreCompleto); continue; }
    if (!materiaData.puntuaciones[bdId]) materiaData.puntuaciones[bdId] = {};
    materiaData.puntuaciones[bdId][instrumentoIdBD] = puntos;
    enviados++;
  }

  await setDoc(materiaDocRef, materiaData);
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
  const materiaSnap = await getDoc(materiaDocRef);
  const materiaData = materiaSnap.exists()
    ? { instrumentos: materiaSnap.data().instrumentos || [], puntuaciones: materiaSnap.data().puntuaciones || {} }
    : { instrumentos: [], puntuaciones: {} };

  const instId = `rollbook-${Date.now()}`;
  materiaData.instrumentos.push({ id: instId, tipo, tema, fecha, valor: valorTotal });

  let enviados = 0;
  const sinCoincidencia = [];

  for (const [estudianteId, puntos] of Object.entries(puntuacionesPorEstudianteId)) {
    const estudiante = estudiantesRollBook.find((e) => e.id === estudianteId);
    if (!estudiante) continue;
    const bdId = await resolverBigDreamersId(estudiante, rosterBigDreamers);
    if (!bdId) { sinCoincidencia.push(estudiante.nombreCompleto); continue; }
    if (!materiaData.puntuaciones[bdId]) materiaData.puntuaciones[bdId] = {};
    materiaData.puntuaciones[bdId][instId] = puntos;
    enviados++;
  }

  await setDoc(materiaDocRef, materiaData);
  return { enviados, sinCoincidencia };
}
