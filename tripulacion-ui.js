// ============================================================
// TRIPULACIÓN UI — Tabla, buscador y modales de Estudiantes
// ============================================================
import {
  escucharTripulacion,
  agregarEstudiante,
  editarEstudiante,
  eliminarEstudiante
} from "./estudiantes-data.js";

const tableBody = document.getElementById("crew-table-body");
const emptyState = document.getElementById("crew-empty-state");
const loadingState = document.getElementById("crew-loading-state");
const searchInput = document.getElementById("buscador-tripulacion");

const modal = document.getElementById("modal-tripulante");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("form-tripulante");
const formError = document.getElementById("tripulante-form-error");
const submitBtn = document.getElementById("modal-submit-btn");
const submitText = document.getElementById("modal-submit-text");
const submitSpinner = document.getElementById("modal-submit-spinner");

const modalBaja = document.getElementById("modal-confirmar-baja");
const bajaNombreEl = document.getElementById("baja-nombre-tripulante");

const GENERO_LABEL = { F: "Femenino", M: "Masculino", Otro: "Otro" };

let todosLosEstudiantes = []; // caché local para filtrar sin volver a Firestore
let idPendienteDeBaja = null;

// ---------- Normalización para búsqueda sin distinguir acentos ----------
function normalizar(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ---------- Render de la tabla ----------
function renderTabla() {
  const termino = normalizar(searchInput.value);

  const filtrados = todosLosEstudiantes.filter((e) => {
    if (e.activo === false) return false; // los inactivos no se listan aquí
    if (!termino) return true;
    return (
      normalizar(e.nombre).includes(termino) ||
      normalizar(e.apellidos).includes(termino) ||
      normalizar(e.numero).includes(termino)
    );
  });

  loadingState.classList.add("hidden");

  if (filtrados.length === 0) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tableBody.innerHTML = filtrados
    .map((e) => `
      <tr data-id="${e.id}">
        <td>
          <div class="crew-name">${escapeHtml(e.apellidos)}, ${escapeHtml(e.nombre)}</div>
        </td>
        <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(e.numero)}</td>
        <td class="hide-sm text-slate-400 text-sm">${GENERO_LABEL[e.genero] || "—"}</td>
        <td class="hide-md text-slate-500 text-sm truncate-notes">${escapeHtml(e.notas) || "—"}</td>
        <td class="text-right whitespace-nowrap">
          <button class="row-action-btn" data-action="editar" data-id="${e.id}" aria-label="Editar">✏️</button>
          <button class="row-action-btn row-action-danger" data-action="baja" data-id="${e.id}" aria-label="Dar de baja">🚀</button>
        </td>
      </tr>
    `)
    .join("");
}

function escapeHtml(str) {
  if (str == null) return "";
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Suscripción a los datos en tiempo real ----------
escucharTripulacion((estudiantes) => {
  todosLosEstudiantes = estudiantes;
  renderTabla();
});

searchInput.addEventListener("input", renderTabla);

// ---------- Modal: abrir/cerrar ----------
function abrirModalNuevo() {
  form.reset();
  document.getElementById("tripulante-id").value = "";
  modalTitle.textContent = "Nuevo Tripulante";
  clearFormError();
  modal.classList.remove("hidden");
  document.getElementById("tripulante-nombre").focus();
}

function abrirModalEditar(estudiante) {
  document.getElementById("tripulante-id").value = estudiante.id;
  document.getElementById("tripulante-nombre").value = estudiante.nombre || "";
  document.getElementById("tripulante-apellidos").value = estudiante.apellidos || "";
  document.getElementById("tripulante-numero").value = estudiante.numero || "";
  document.getElementById("tripulante-genero").value = estudiante.genero || "";
  document.getElementById("tripulante-notas").value = estudiante.notas || "";
  modalTitle.textContent = "Editar Tripulante";
  clearFormError();
  modal.classList.remove("hidden");
  document.getElementById("tripulante-nombre").focus();
}

function cerrarModal() {
  modal.classList.add("hidden");
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}
function clearFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

document.getElementById("btn-nuevo-tripulante").addEventListener("click", abrirModalNuevo);
document.getElementById("modal-close-btn").addEventListener("click", cerrarModal);
document.getElementById("modal-cancel-btn").addEventListener("click", cerrarModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) cerrarModal();
});

// ---------- Guardar (crear o editar) ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  const id = document.getElementById("tripulante-id").value;
  const datos = {
    nombre: document.getElementById("tripulante-nombre").value,
    apellidos: document.getElementById("tripulante-apellidos").value,
    numero: document.getElementById("tripulante-numero").value,
    genero: document.getElementById("tripulante-genero").value,
    notas: document.getElementById("tripulante-notas").value
  };

  if (!datos.nombre.trim() || !datos.apellidos.trim() || !datos.numero.trim() || !datos.genero) {
    showFormError("Nombre, apellidos, número de estudiante y género son obligatorios.");
    return;
  }

  setSubmitLoading(true);
  try {
    if (id) {
      await editarEstudiante(id, datos);
    } else {
      await agregarEstudiante(datos);
    }
    cerrarModal();
  } catch (error) {
    console.error(error);
    showFormError("No se pudo guardar. Intenta de nuevo.");
  } finally {
    setSubmitLoading(false);
  }
});

function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitText.classList.toggle("hidden", isLoading);
  submitSpinner.classList.toggle("hidden", !isLoading);
}

// ---------- Acciones de fila (editar / dar de baja) ----------
tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const estudiante = todosLosEstudiantes.find((e) => e.id === id);
  if (!estudiante) return;

  if (btn.dataset.action === "editar") {
    abrirModalEditar(estudiante);
  } else if (btn.dataset.action === "baja") {
    idPendienteDeBaja = id;
    bajaNombreEl.textContent = `${estudiante.nombre} ${estudiante.apellidos}`;
    modalBaja.classList.remove("hidden");
  }
});

document.getElementById("baja-cancel-btn").addEventListener("click", () => {
  idPendienteDeBaja = null;
  modalBaja.classList.add("hidden");
});

document.getElementById("baja-confirm-btn").addEventListener("click", async () => {
  if (!idPendienteDeBaja) return;
  try {
    await eliminarEstudiante(idPendienteDeBaja);
  } catch (error) {
    console.error(error);
  } finally {
    idPendienteDeBaja = null;
    modalBaja.classList.add("hidden");
  }
});
