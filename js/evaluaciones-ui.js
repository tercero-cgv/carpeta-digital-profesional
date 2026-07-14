// ============================================================
// EVALUACIONES UI — Materias, Instrumentos, Tabulación por partes,
// envío a BigDreamers (con emparejamiento por id persistente)
// ============================================================
import { obtenerListaTripulacion, obtenerRosterCompleto } from "./estudiantes-data.js";
import { escucharInstrumentos, crearInstrumento, agregarParte, marcarPuntuacion } from "./evaluaciones-data.js";
import { enviarInstrumentoNuevoABigDreamers } from "./bigdreamers-bridge.js";

// El tipo de instrumento de Roll Book es más amplio que el de
// BigDreamers (que solo tiene 6 opciones). Los que no tienen
// equivalente exacto se envían como "Otro" — mejor eso que
// inventar una equivalencia semántica que no existe.
const TIPO_A_BIGDREAMERS = {
  Dictado: "Otro",
  Proyecto: "Otro",
  Assessment: "Assessment",
  Examen: "Otro",
  STEM: "Otro",
  "Trabajo Especial": "Trabajo Especial",
  "Prueba Corta": "Prueba Corta",
  "Tarea Desempeño": "Tarea Desempeño",
  Otro: "Otro"
};

let materiaActiva = "ADL";
let cacheEstudiantes = [];
let cacheInstrumentos = [];
let instrumentoAbiertoId = null;

const tabsMateria = document.getElementById("tabs-materia");
const instrumentosBody = document.getElementById("instrumentos-table-body");
const instrumentosEmpty = document.getElementById("instrumentos-empty-state");
const tabulacionWrap = document.getElementById("tabulacion-wrap");

const modalInstrumento = document.getElementById("modal-instrumento");
const formInstrumento = document.getElementById("form-instrumento");
const instrumentoError = document.getElementById("instrumento-form-error");

const modalBD = document.getElementById("modal-bigdreamers");
const bdPreviewRows = document.getElementById("bd-preview-rows");
const bdError = document.getElementById("bd-form-error");
const bdWarning = document.getElementById("bd-unmatched-warning");

tabsMateria.querySelectorAll(".month-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    materiaActiva = btn.dataset.materia;
    tabsMateria.querySelectorAll(".month-tab").forEach((b) => b.classList.toggle("month-tab-active", b === btn));
    instrumentoAbiertoId = null;
    tabulacionWrap.classList.add("hidden");
    renderListaInstrumentos();
  });
});

function renderListaInstrumentos() {
  const filtrados = cacheInstrumentos.filter((i) => i.materia === materiaActiva);

  if (filtrados.length === 0) {
    instrumentosBody.innerHTML = "";
    instrumentosEmpty.classList.remove("hidden");
    return;
  }
  instrumentosEmpty.classList.add("hidden");

  instrumentosBody.innerHTML = filtrados
    .map((inst) => {
      const puntosPosibles = (inst.partes || []).reduce((sum, p) => sum + Number(p.puntosPosibles || 0), 0);
      return `
        <tr>
          <td class="crew-name">${escapeHtml(inst.tipo)} — ${escapeHtml(inst.tema)}</td>
          <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(inst.semana)}</td>
          <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(inst.fecha)}</td>
          <td class="font-mono text-sm text-slate-300">${puntosPosibles}</td>
          <td class="text-right"><button class="row-action-btn" data-ver="${inst.id}">👁</button></td>
        </tr>
      `;
    })
    .join("");

  instrumentosBody.querySelectorAll("[data-ver]").forEach((btn) => {
    btn.addEventListener("click", () => {
      instrumentoAbiertoId = btn.dataset.ver;
      renderTabulacion();
    });
  });
}

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("btn-nuevo-instrumento").addEventListener("click", () => {
  formInstrumento.reset();
  instrumentoError.classList.add("hidden");
  modalInstrumento.classList.remove("hidden");
});
document.getElementById("modal-instrumento-close-btn").addEventListener("click", () => modalInstrumento.classList.add("hidden"));
document.getElementById("modal-instrumento-cancel-btn").addEventListener("click", () => modalInstrumento.classList.add("hidden"));

formInstrumento.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = document.getElementById("inst-tipo").value;
  const tema = document.getElementById("inst-tema").value.trim();
  const fecha = document.getElementById("inst-fecha").value;
  const semana = document.querySelector('input[name="inst-semana"]:checked')?.value;

  if (!tema || !fecha || !semana) {
    instrumentoError.textContent = "Completa tema, fecha y semanas.";
    instrumentoError.classList.remove("hidden");
    return;
  }

  const ref = await crearInstrumento({ materia: materiaActiva, tipo, tema, fecha, semana });
  modalInstrumento.classList.add("hidden");
  instrumentoAbiertoId = ref.id;
});

function calcularTotal(instrumento, estudianteId) {
  const porParte = instrumento.puntuaciones?.[estudianteId]?.porParte || {};
  const total = Object.values(porParte).reduce((s, v) => s + Number(v || 0), 0);
  const puntosPosibles = (instrumento.partes || []).reduce((s, p) => s + Number(p.puntosPosibles || 0), 0);
  const porcentaje = puntosPosibles > 0 ? Math.round((total / puntosPosibles) * 1000) / 10 : 0;
  return { total, porcentaje, puntosPosibles };
}

function renderTabulacion() {
  const inst = cacheInstrumentos.find((i) => i.id === instrumentoAbiertoId);
  if (!inst) {
    tabulacionWrap.classList.add("hidden");
    return;
  }
  tabulacionWrap.classList.remove("hidden");

  if (cacheEstudiantes.length === 0) {
    tabulacionWrap.innerHTML = `<p class="text-slate-500 text-sm p-4">Añade estudiantes en "Lista de Estudiantes" primero.</p>`;
    return;
  }

  const partes = inst.partes || [];
  const headerPartes = partes
    .map((p) => `<th class="att-day-col">${escapeHtml(p.nombre)}<br/><span class="att-day-num">${p.puntosPosibles} pts</span></th>`)
    .join("");

  const filas = cacheEstudiantes
    .map((est) => {
      const { total, porcentaje } = calcularTotal(inst, est.id);
      const celdas = partes
        .map((p) => {
          const valor = inst.puntuaciones?.[est.id]?.porParte?.[p.id] ?? "";
          return `<td><input type="number" min="0" max="${p.puntosPosibles}" class="att-cell eval-cell" value="${valor}"
            data-estudiante="${est.id}" data-parte="${p.id}" /></td>`;
        })
        .join("");
      return `
        <tr>
          <td class="att-name-col">${escapeHtml(est.nombreCompleto)}</td>
          ${celdas}
          <td class="att-total att-total-presente">${total}</td>
          <td class="att-total att-total-justificada">${porcentaje}%</td>
        </tr>
      `;
    })
    .join("");

  tabulacionWrap.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3 p-4 pb-0">
      <div>
        <h4 class="font-display text-lg text-slate-100">${escapeHtml(inst.tipo)} — ${escapeHtml(inst.tema)}</h4>
        <p class="text-slate-500 text-xs font-mono mt-1">Semana ${escapeHtml(inst.semana)} · ${escapeHtml(inst.fecha)}</p>
      </div>
      <div class="flex gap-2">
        <button id="btn-agregar-parte" class="modal-cancel-btn">+ Agregar Parte</button>
        <button id="btn-enviar-bd" class="kiosk-launch-btn">⭐ Enviar a BigDreamers</button>
      </div>
    </div>
    <div id="nueva-parte-row" class="hidden flex gap-2 items-end p-4 pb-0 flex-wrap">
      <div><label class="field-label">Nombre de la parte</label><input type="text" id="parte-nombre" class="field-input" style="width:10rem" placeholder="Ej. Parte 2" /></div>
      <div><label class="field-label">Puntos posibles</label><input type="number" id="parte-puntos" class="field-input" style="width:7rem" value="10" /></div>
      <button id="btn-confirmar-parte" class="launch-btn px-4">Añadir</button>
    </div>
    <div style="overflow-x:auto">
      <table class="attendance-table">
        <thead>
          <tr>
            <th class="att-name-col">Estudiante</th>
            ${headerPartes}
            <th class="att-total-header">Total</th>
            <th class="att-total-header">%</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;

  tabulacionWrap.querySelectorAll(".eval-cell").forEach((input) => {
    input.addEventListener("change", async () => {
      const estudianteId = input.dataset.estudiante;
      const parteId = input.dataset.parte;
      const puntos = Number(input.value) || 0;

      const instActual = cacheInstrumentos.find((i) => i.id === inst.id);
      const porParteActual = { ...(instActual.puntuaciones?.[estudianteId]?.porParte || {}) };
      porParteActual[parteId] = puntos;
      const totalNuevo = Object.values(porParteActual).reduce((s, v) => s + Number(v || 0), 0);
      const puntosPosibles = (instActual.partes || []).reduce((s, p) => s + Number(p.puntosPosibles || 0), 0);
      const porcentajeNuevo = puntosPosibles > 0 ? Math.round((totalNuevo / puntosPosibles) * 1000) / 10 : 0;

      await marcarPuntuacion(inst.id, estudianteId, parteId, puntos, totalNuevo, porcentajeNuevo);
    });
  });

  document.getElementById("btn-agregar-parte").addEventListener("click", () => {
    document.getElementById("nueva-parte-row").classList.toggle("hidden");
  });
  document.getElementById("btn-confirmar-parte").addEventListener("click", async () => {
    const nombre = document.getElementById("parte-nombre").value.trim() || `Parte ${(inst.partes || []).length + 1}`;
    const puntos = Number(document.getElementById("parte-puntos").value) || 10;
    await agregarParte(inst.id, nombre, puntos);
  });

  document.getElementById("btn-enviar-bd").addEventListener("click", () => abrirModalBD(inst));
}

function abrirModalBD(inst) {
  bdError.classList.add("hidden");
  bdWarning.classList.add("hidden");

  const filas = cacheEstudiantes
    .map((est) => {
      const { total, puntosPosibles } = calcularTotal(inst, est.id);
      return `<div style="display:flex;justify-content:space-between;padding:.4rem .6rem" class="text-sm">
        <span class="text-slate-300">${escapeHtml(est.nombreCompleto)}</span>
        <span class="font-mono text-slate-400">${total}/${puntosPosibles}</span>
      </div>`;
    })
    .join("");
  bdPreviewRows.innerHTML = filas;
  modalBD.classList.remove("hidden");

  document.getElementById("modal-bd-confirm-btn").onclick = async () => {
    const puntuaciones = {};
    cacheEstudiantes.forEach((est) => {
      const { total } = calcularTotal(inst, est.id);
      puntuaciones[est.id] = total;
    });
    const puntosPosibles = (inst.partes || []).reduce((s, p) => s + Number(p.puntosPosibles || 0), 0);
    const tipoBD = TIPO_A_BIGDREAMERS[inst.tipo] || "Otro";
    const rosterCompleto = obtenerRosterCompleto();

    try {
      const { enviados, sinCoincidencia } = await enviarInstrumentoNuevoABigDreamers({
        materiaBD: materiaActiva,
        tipo: tipoBD,
        tema: inst.tema,
        fecha: inst.fecha,
        valorTotal: puntosPosibles,
        puntuacionesPorEstudianteId: puntuaciones,
        estudiantesRollBook: rosterCompleto
      });
      if (sinCoincidencia.length) {
        bdWarning.textContent = `⚠️ Sin coincidencia en BigDreamers: ${sinCoincidencia.join(", ")}`;
        bdWarning.classList.remove("hidden");
      }
      alert(`✅ ${enviados} estudiante(s) enviados a BigDreamers → ${materiaActiva}.`);
      modalBD.classList.add("hidden");
    } catch (err) {
      bdError.textContent = "Error al enviar: " + err.message;
      bdError.classList.remove("hidden");
    }
  };
}

document.getElementById("modal-bd-close-btn").addEventListener("click", () => modalBD.classList.add("hidden"));
document.getElementById("modal-bd-cancel-btn").addEventListener("click", () => modalBD.classList.add("hidden"));

escucharInstrumentos((datos) => {
  cacheInstrumentos = datos;
  renderListaInstrumentos();
  if (instrumentoAbiertoId) renderTabulacion();
});

export function refrescarEstudiantesEvaluaciones() {
  cacheEstudiantes = obtenerListaTripulacion();
  renderListaInstrumentos();
  if (instrumentoAbiertoId) renderTabulacion();
}

refrescarEstudiantesEvaluaciones();
