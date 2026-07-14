// ============================================================
// BIGDREAMERS BRIDGE — Segunda conexión de Firebase (proyecto
// separado) para escribir/leer notas en BigDreamers, replicando
// exactamente la lógica de "Enviar a BigDreamers" que ya existe
// y funciona en DreamQuiz (mismo proyecto, misma estructura).
//
// Mejora de seguridad de datos respecto a DreamQuiz: en vez de
// emparejar por nombre CADA VEZ (frágil — nombres mal escritos o
// con acentos distintos fallan en silencio), aquí el id de
// BigDreamers se guarda UNA sola vez en el documento del propio
// estudiante de Roll Book (campo `bigdreamersId`). Las próximas
// veces se usa ese id directo, sin volver a comparar texto.
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

// Config copiada tal cual del archivo real de DreamQuiz — mismo
// proyecto de Firebase que usa BigDreamers. La apiKey de Firebase
// es pública por diseño (la seguridad real vive en las reglas de
// Firestore de ese proyecto, no en ocultar esta config).
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

/**
 * Devuelve la lista de estudiantes tal como los conoce BigDreamers:
 * [{ id, nombre }, ...] — su propio roster, con sus propios ids.
 */
export async function obtenerRosterBigDreamers() {
  const snap = await getDoc(doc(bdDb, "bigdreamers", "estudiantes"));
  return snap.exists() ? snap.data().lista || [] : [];
}

function normalizarNombre(str) {
  return (str || "").trim().toLowerCase();
}

/**
 * Resuelve el id de BigDreamers para un estudiante de Roll Book.
 * 1. Si el estudiante ya tiene `bigdreamersId` guardado, lo usa directo.
 * 2. Si no, intenta emparejar por nombre contra el roster de BigDreamers
 *    (igual que hace DreamQuiz hoy) y, si encuentra coincidencia,
 *    GUARDA el id en el documento del estudiante en Roll Book para
 *    que la próxima vez no haga falta repetir la comparación de texto.
 * Devuelve null si no hay coincidencia (estudiante nuevo en Roll Book
 * que aún no existe en BigDreamers).
 */
export async function resolverBigDreamersId(estudianteRollBook, rosterBigDreamers) {
  if (estudianteRollBook.bigdreamersId) return estudianteRollBook.bigdreamersId;

  const nombreRB = normalizarNombre(estudianteRollBook.nombreCompleto);
  const match = rosterBigDreamers.find((s) => normalizarNombre(s.nombre) === nombreRB);
  if (!match) return null;

  await updateDoc(rbDoc(rollBookDb, "estudiantes", estudianteRollBook.id), {
    bigdreamersId: match.id
  });
  return match.id;
}

/**
 * Envía el total calculado de un instrumento a BigDreamers, como
 * instrumento NUEVO en la materia indicada. Mismo formato exacto
 * que `sendToBD()` en DreamQuiz: instrumentos:[{id,tipo,tema,fecha,valor}],
 * puntuaciones:{ [bdId]: { [instId]: puntosObtenidos } }.
 *
 * `puntuacionesPorEstudianteId` = { estudianteIdRollBook: puntosObtenidos }
 * `estudiantesRollBook` = lista completa [{id, nombreCompleto, bigdreamersId?}]
 * Devuelve { enviados, sinCoincidencia: [nombres] }
 */
export async function enviarInstrumentoNuevoABigDreamers({
  materiaBD, // "ADL" | "Matematica" | "Ciencia"
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
    if (!bdId) {
      sinCoincidencia.push(estudiante.nombreCompleto);
      continue;
    }
    if (!materiaData.puntuaciones[bdId]) materiaData.puntuaciones[bdId] = {};
    materiaData.puntuaciones[bdId][instId] = puntos;
    enviados++;
  }

  await setDoc(materiaDocRef, materiaData);
  return { enviados, sinCoincidencia };
}
