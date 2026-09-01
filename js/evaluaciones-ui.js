// ============================================================
// EVALUACIONES UI — Materias, Instrumentos, Tabulación por partes,
// envío a BigDreamers (nuevo o existente), edición de instrumento y partes
// ============================================================
import { obtenerListaTripulacion, obtenerRosterCompleto } from "./estudiantes-data.js";
import {
  escucharInstrumentos,
  crearInstrumento,
  editarInstrumento,
  agregarParte,
  editarParte,
  eliminarParte,
  marcarPuntuacion
} from "./evaluaciones-data.js";
import { enviarInstrumentoNuevoABigDreamers, enviarAInstrumentoExistenteBigDreamers, obtenerInstrumentosBigDreamers } from "./bigdreamers-bridge.js?v=2";

const TIPO_A_BIGDREAMERS = {
  Dictado: "Otro", Proyecto: "Otro", Assessment: "Assessment", Examen: "Otro", STEM: "Otro",
  "Trabajo Especial": "Trabajo Especial", "Prueba Corta": "Prueba Corta",
  "Tarea Desempeño": "Tarea Desempeño", Otro: "Otro"
};

let materiaActiva = "ADL";
let cacheEstudiantes = [];
let cacheInstrumentos = [];
let instrumentoAbiertoId = null;
let instrumentoEditandoId = null; // no-null mientras el modal de instrumento está en modo edición
let parteEditandoId = null;       // no-null mientras la fila "nueva/editar parte" está en modo edición

const tabsMateria = document.getElementById("tabs-materia");
const instrumentosBody = document.getElementById("instrumentos-table-body");
const instrumentosEmpty = document.getElementById("instrumentos-empty-state");
const tabulacionWrap = document.getElementById("tabulacion-wrap");

const modalInstrumento = document.getElementById("modal-instrumento");
const modalInstrumentoTitle = document.getElementById("instrumento-modal-title");
const formInstrumento = document.getElementById("form-instrumento");
const instrumentoError = document.getElementById("instrumento-form-error");
const instrumentoSubmitBtn = formInstrumento.querySelector('button[type="submit"]');

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
  instrumentosBody.innerHTML = filtrados.map((inst) => {
    const puntosPosibles = (inst.partes || []).reduce((sum, p) => sum + Number(p.puntosPosibles || 0), 0);
    return `
      <tr>
        <td class="crew-name">${escapeHtml(inst.tipo)} — ${escapeHtml(inst.tema)}</td>
        <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(inst.semana)}</td>
        <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(inst.fecha)}</td>
        <td class="font-mono text-sm text-slate-300">${puntosPosibles}</td>
        <td class="text-right whitespace-nowrap">
          <button class="row-action-btn" data-editar-inst="${inst.id}" aria-label="Editar instrumento">✏️</button>
          <button class="row-action-btn" data-ver="${inst.id}" aria-label="Ver tabulación">👁</button>
        </td>
      </tr>
    `;
  }).join("");

  instrumentosBody.querySelectorAll("[data-ver]").forEach((btn) => {
    btn.addEventListener("click", () => { instrumentoAbiertoId = btn.dataset.ver; renderTabulacion(); });
  });
  instrumentosBody.querySelectorAll("[data-editar-inst]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inst = cacheInstrumentos.find((i) => i.id === btn.dataset.editarInst);
      if (inst) abrirModalInstrumento(inst);
    });
  });
}

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================
// MODAL NUEVO / EDITAR INSTRUMENTO
// ============================================================
function abrirModalInstrumento(instExistente) {
  formInstrumento.reset();
  instrumentoError.classList.add("hidden");

  if (instExistente) {
    instrumentoEditandoId = instExistente.id;
    modalInstrumentoTitle.textContent = "Editar Instrumento";
    instrumentoSubmitBtn.textContent = "Guardar Cambios";
    document.getElementById("inst-materia").value = instExistente.materia;
    document.getElementById("inst-tipo").value = instExistente.tipo;
    document.getElementById("inst-tema").value = instExistente.tema;
    document.getElementById("inst-fecha").value = instExistente.fecha;
    const radioSemana = document.querySelector(`input[name="inst-semana"][value="${instExistente.semana}"]`);
    if (radioSemana) radioSemana.checked = true;
  } else {
    instrumentoEditandoId = null;
    modalInstrumentoTitle.textContent = "Nuevo Instrumento";
    instrumentoSubmitBtn.textContent = "Crear Instrumento";
    document.getElementById("inst-materia").value = materiaActiva;
  }

  modalInstrumento.classList.remove("hidden");
}

document.getElementById("btn-nuevo-instrumento").addEventListener("click", () => abrirModalInstrumento(null));
document.getElementById("modal-instrumento-close-btn").addEventListener("click", () => modalInstrumento.classList.add("hidden"));
document.getElementById("modal-instrumento-cancel-btn").addEventListener("click", () => modalInstrumento.classList.add("hidden"));

formInstrumento.addEventListener("submit", async (e) => {
  e.preventDefault();
  const materiaSeleccionada = document.getElementById("inst-materia").value;
  const tipo = document.getElementById("inst-tipo").value;
  const tema = document.getElementById("inst-tema").value.trim();
  const fecha = document.getElementById("inst-fecha").value;
  const semana = document.querySelector('input[name="inst-semana"]:checked')?.value;

  if (!tema || !fecha || !semana) {
    instrumentoError.textContent = "Completa tema, fecha y semanas.";
    instrumentoError.classList.remove("hidden");
    return;
  }

  if (instrumentoEditandoId) {
    await editarInstrumento(instrumentoEditandoId, { materia: materiaSeleccionada, tipo, tema, fecha, semana });
    modalInstrumento.classList.add("hidden");
    // Si se reasignó a otra materia, cambia la pestaña activa a esa
    // materia para que el instrumento aparezca de inmediato donde se ve.
    if (materiaSeleccionada !== materiaActiva) {
      materiaActiva = materiaSeleccionada;
      tabsMateria.querySelectorAll(".month-tab").forEach((b) => b.classList.toggle("month-tab-active", b.dataset.materia === materiaActiva));
    }
  } else {
    const ref = await crearInstrumento({ materia: materiaSeleccionada, tipo, tema, fecha, semana });
    modalInstrumento.classList.add("hidden");
    instrumentoAbiertoId = ref.id;
  }
  instrumentoEditandoId = null;
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
  if (!inst) { tabulacionWrap.classList.add("hidden"); return; }
  tabulacionWrap.classList.remove("hidden");

  if (cacheEstudiantes.length === 0) {
    tabulacionWrap.innerHTML = `<p class="text-slate-500 text-sm p-4">Añade estudiantes en "Lista de Estudiantes" primero.</p>`;
    return;
  }

  const partes = inst.partes || [];
  const headerPartes = partes.map((p) => `
    <th class="att-day-col">
      <div style="display:flex;align-items:center;justify-content:center;gap:.25rem">
        <button class="row-action-btn" style="font-size:.65rem;padding:.15rem .3rem" data-editar-parte="${p.id}" aria-label="Editar parte">✏️</button>
        ${escapeHtml(p.nombre)}
        <button class="row-action-btn row-action-danger" style="font-size:.65rem;padding:.15rem .3rem" data-borrar-parte="${p.id}" aria-label="Borrar parte">🗑️</button>
      </div>
      <span class="att-day-num">${p.puntosPosibles} pts</span>
    </th>
  `).join("");

  const filas = cacheEstudiantes.map((est) => {
    const { total, porcentaje } = calcularTotal(inst, est.id);
    const celdas = partes.map((p) => {
      const valor = inst.puntuaciones?.[est.id]?.porParte?.[p.id] ?? "";
      return `<td><input type="number" min="0" max="${p.puntosPosibles}" class="att-cell eval-cell" value="${valor}" data-estudiante="${est.id}" data-parte="${p.id}" /></td>`;
    }).join("");
    return `
      <tr>
        <td class="att-name-col">${escapeHtml(est.nombreCompleto)}</td>
        ${celdas}
        <td class="att-total att-total-presente">${total}</td>
        <td class="att-total att-total-justificada">${porcentaje}%</td>
      </tr>
    `;
  }).join("");

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
      <div><label class="field-label" id="parte-form-label">Nombre de la parte</label><input type="text" id="parte-nombre" class="field-input" style="width:10rem" placeholder="Ej. Parte 2" /></div>
      <div><label class="field-label">Puntos posibles</label><input type="number" id="parte-puntos" class="field-input" style="width:7rem" value="10" /></div>
      <button id="btn-confirmar-parte" class="launch-btn px-4">Añadir</button>
      <button id="btn-cancelar-parte" class="modal-cancel-btn">Cancelar</button>
    </div>
    <div style="overflow-x:auto">
      <table class="attendance-table">
        <thead><tr><th class="att-name-col">Estudiante</th>${headerPartes}<th class="att-total-header">Total</th><th class="att-total-header">%</th></tr></thead>
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

  function cerrarFormularioParte() {
    document.getElementById("nueva-parte-row").classList.add("hidden");
    parteEditandoId = null;
    document.getElementById("parte-form-label").textContent = "Nombre de la parte";
    document.getElementById("btn-confirmar-parte").textContent = "Añadir";
    document.getElementById("parte-nombre").value = "";
    document.getElementById("parte-puntos").value = "10";
  }

  document.getElementById("btn-agregar-parte").addEventListener("click", () => {
    const fila = document.getElementById("nueva-parte-row");
    const abrir = fila.classList.contains("hidden");
    if (abrir) {
      parteEditandoId = null;
      document.getElementById("parte-form-label").textContent = "Nombre de la parte";
      document.getElementById("btn-confirmar-parte").textContent = "Añadir";
      document.getElementById("parte-nombre").value = "";
      document.getElementById("parte-puntos").value = "10";
      fila.classList.remove("hidden");
    } else {
      cerrarFormularioParte();
    }
  });

  document.getElementById("btn-cancelar-parte").addEventListener("click", cerrarFormularioParte);

  document.getElementById("btn-confirmar-parte").addEventListener("click", async () => {
    const nombre = document.getElementById("parte-nombre").value.trim() || `Parte ${(inst.partes || []).length + 1}`;
    const puntos = Number(document.getElementById("parte-puntos").value) || 10;
    if (parteEditandoId) {
      await editarParte(inst.id, parteEditandoId, nombre, puntos, inst.partes || []);
    } else {
      await agregarParte(inst.id, nombre, puntos);
    }
    cerrarFormularioParte();
  });

  tabulacionWrap.querySelectorAll("[data-editar-parte]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parte = (inst.partes || []).find((p) => p.id === btn.dataset.editarParte);
      if (!parte) return;
      parteEditandoId = parte.id;
      document.getElementById("parte-form-label").textContent = "Editando parte";
      document.getElementById("btn-confirmar-parte").textContent = "Guardar Cambios";
      document.getElementById("parte-nombre").value = parte.nombre;
      document.getElementById("parte-puntos").value = parte.puntosPosibles;
      document.getElementById("nueva-parte-row").classList.remove("hidden");
    });
  });

  tabulacionWrap.querySelectorAll("[data-borrar-parte]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const parteId = btn.dataset.borrarParte;
      const parte = (inst.partes || []).find((p) => p.id === parteId);
      if (!parte) return;
      const confirmado = confirm(`¿Borrar la parte "${parte.nombre}"? Esto también borra los puntos ya entrados para esa parte en todos los estudiantes.`);
      if (!confirmado) return;
      await eliminarParte(inst.id, parteId, inst.partes || [], inst.puntuaciones || {});
    });
  });

  document.getElementById("btn-enviar-bd").addEventListener("click", () => abrirModalBD(inst));
}

function abrirModalBD(inst) {
  bdError.classList.add("hidden");
  bdWarning.classList.add("hidden");
  document.querySelector('input[name="bd-modo"][value="nuevo"]').checked = true;
  document.getElementById("bd-select-existente-wrap").classList.add("hidden");

  const filas = cacheEstudiantes.map((est) => {
    const { total, puntosPosibles } = calcularTotal(inst, est.id);
    return `<div style="display:flex;justify-content:space-between;padding:.4rem .6rem" class="text-sm">
      <span class="text-slate-300">${escapeHtml(est.nombreCompleto)}</span>
      <span class="font-mono text-slate-400">${total}/${puntosPosibles}</span>
    </div>`;
  }).join("");
  bdPreviewRows.innerHTML = filas;
  modalBD.classList.remove("hidden");

  document.querySelectorAll('input[name="bd-modo"]').forEach((radio) => {
    radio.onchange = async () => {
      const esExistente = radio.value === "existente" && radio.checked;
      document.getElementById("bd-select-existente-wrap").classList.toggle("hidden", !esExistente);
      if (esExistente) {
        const selectEl = document.getElementById("bd-select-existente");
        selectEl.innerHTML = `<option value="">Cargando...</option>`;
        const instrumentosBD = await obtenerInstrumentosBigDreamers(materiaActiva);
        selectEl.innerHTML = instrumentosBD.length
          ? instrumentosBD.map((i) => `<option value="${i.id}">${escapeHtml(i.tipo)} — ${escapeHtml(i.tema)} (${i.valor} pts)</option>`).join("")
          : `<option value="">— No hay instrumentos todavía en esta materia —</option>`;
      }
    };
  });

  document.getElementById("modal-bd-confirm-btn").onclick = async () => {
    const confirmBtn = document.getElementById("modal-bd-confirm-btn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Enviando...";

    const puntuaciones = {};
    cacheEstudiantes.forEach((est) => { const { total } = calcularTotal(inst, est.id); puntuaciones[est.id] = total; });
    const modo = document.querySelector('input[name="bd-modo"]:checked').value;
    const rosterCompleto = obtenerRosterCompleto();

    try {
      let resultado;
      if (modo === "existente") {
        const instrumentoIdBD = document.getElementById("bd-select-existente").value;
        if (!instrumentoIdBD) {
          bdError.textContent = "Selecciona a cuál instrumento existente agregar las notas.";
          bdError.classList.remove("hidden");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "⭐ Enviar";
          return;
        }
        resultado = await enviarAInstrumentoExistenteBigDreamers({
          materiaBD: materiaActiva, instrumentoIdBD, puntuacionesPorEstudianteId: puntuaciones, estudiantesRollBook: rosterCompleto
        });
      } else {
        const puntosPosibles = (inst.partes || []).reduce((s, p) => s + Number(p.puntosPosibles || 0), 0);
        const tipoBD = TIPO_A_BIGDREAMERS[inst.tipo] || "Otro";
        resultado = await enviarInstrumentoNuevoABigDreamers({
          materiaBD: materiaActiva, tipo: tipoBD, tema: inst.tema, fecha: inst.fecha,
          valorTotal: puntosPosibles, puntuacionesPorEstudianteId: puntuaciones, estudiantesRollBook: rosterCompleto
        });
      }

      if (resultado.sinCoincidencia.length) {
        bdWarning.textContent = `⚠️ Sin coincidencia en BigDreamers: ${resultado.sinCoincidencia.join(", ")}`;
        bdWarning.classList.remove("hidden");
      }
      alert(`✅ ${resultado.enviados} estudiante(s) enviados a BigDreamers → ${materiaActiva}.`);
      modalBD.classList.add("hidden");
    } catch (err) {
      bdError.textContent = "Error al enviar: " + err.message;
      bdError.classList.remove("hidden");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "⭐ Enviar";
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
