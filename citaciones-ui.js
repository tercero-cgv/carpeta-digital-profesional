// ============================================================
// CITACIONES E INTERVENCIONES UI
// ============================================================
import { obtenerListaTripulacion } from "./estudiantes-data.js";
import {
  escucharCitaciones,
  escucharIntervenciones,
  guardarCitacion,
  guardarIntervencion,
  obtenerConfigEscuela,
  guardarConfigEscuela
} from "./citaciones-data.js";

let tipoActivo = "citaciones";
let cacheEstudiantes = [];
let cacheCitaciones = [];
let cacheIntervenciones = [];
let configEscuela = null;
let filtroEstudianteId = "";

const configBox = document.getElementById("config-escuela");
const resumenBox = document.getElementById("escuela-resumen");
const tabsCitInt = document.getElementById("tabs-cit-int");
const filtroSelect = document.getElementById("filtro-estudiante-cit");
const thead = document.getElementById("cit-int-thead");
const tbody = document.getElementById("cit-int-body");
const emptyState = document.getElementById("cit-int-empty");
const printArea = document.getElementById("print-area");

async function initConfigEscuela() {
  configEscuela = await obtenerConfigEscuela();
  if (configEscuela) {
    mostrarResumenEscuela();
  } else {
    configBox.classList.remove("hidden");
    resumenBox.classList.add("hidden");
  }
}

function mostrarResumenEscuela() {
  configBox.classList.add("hidden");
  resumenBox.classList.remove("hidden");
}

document.getElementById("btn-guardar-escuela").addEventListener("click", async () => {
  const datos = {
    institucion: document.getElementById("esc-institucion").value.trim(),
    grado: document.getElementById("esc-grado").value.trim(),
    direccion: document.getElementById("esc-direccion").value.trim(),
    telefono: document.getElementById("esc-telefono").value.trim(),
    maestroNombre: document.getElementById("esc-maestro-nombre").value.trim(),
    maestroCargo: document.getElementById("esc-maestro-cargo").value.trim()
  };
  await guardarConfigEscuela(datos);
  configEscuela = datos;
  mostrarResumenEscuela();
});

document.getElementById("btn-editar-escuela").addEventListener("click", () => {
  configBox.classList.remove("hidden");
  resumenBox.classList.add("hidden");
  if (configEscuela) {
    document.getElementById("esc-institucion").value = configEscuela.institucion || "";
    document.getElementById("esc-grado").value = configEscuela.grado || "";
    document.getElementById("esc-direccion").value = configEscuela.direccion || "";
    document.getElementById("esc-telefono").value = configEscuela.telefono || "";
    document.getElementById("esc-maestro-nombre").value = configEscuela.maestroNombre || "";
    document.getElementById("esc-maestro-cargo").value = configEscuela.maestroCargo || "";
  }
});

tabsCitInt.querySelectorAll(".month-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    tipoActivo = btn.dataset.tipo;
    tabsCitInt.querySelectorAll(".month-tab").forEach((b) => b.classList.toggle("month-tab-active", b === btn));
    renderLista();
  });
});

filtroSelect.addEventListener("change", () => {
  filtroEstudianteId = filtroSelect.value;
  renderLista();
});

function poblarSelectoresEstudiante() {
  const opciones = cacheEstudiantes.map((e) => `<option value="${e.id}">${escapeHtml(e.nombreCompleto)}</option>`).join("");
  filtroSelect.innerHTML = `<option value="">— Ver todos los estudiantes —</option>${opciones}`;
  document.getElementById("cit-estudiante").innerHTML = `<option value="" disabled selected>Selecciona el estudiante...</option>${opciones}`;
  document.getElementById("int-estudiante").innerHTML = `<option value="" disabled selected>Selecciona el estudiante...</option>${opciones}`;
}

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderLista() {
  const datos = (tipoActivo === "citaciones" ? cacheCitaciones : cacheIntervenciones).filter(
    (d) => !filtroEstudianteId || d.estudianteId === filtroEstudianteId
  );

  if (tipoActivo === "citaciones") {
    thead.innerHTML = `<tr><th>Estudiante</th><th class="hide-sm">Fecha</th><th>Motivo</th><th class="hide-sm">Encargado</th><th class="text-right">Imprimir</th></tr>`;
  } else {
    thead.innerHTML = `<tr><th>Estudiante</th><th class="hide-sm">Fecha</th><th>Método</th><th class="hide-sm">Razón</th><th class="text-right">Imprimir</th></tr>`;
  }

  if (datos.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  if (tipoActivo === "citaciones") {
    tbody.innerHTML = datos
      .map(
        (c) => `
        <tr>
          <td class="crew-name">${escapeHtml(c.estudianteNombre)}</td>
          <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(c.fecha)}</td>
          <td class="text-sm text-slate-300">${escapeHtml((c.motivos || []).join(", "))}</td>
          <td class="hide-sm text-sm text-slate-400">${escapeHtml(c.encargadoNombre)}</td>
          <td class="text-right"><button class="row-action-btn" data-imprimir-cit="${c.id}">🖨️</button></td>
        </tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-imprimir-cit]").forEach((btn) => {
      btn.addEventListener("click", () => imprimirCitacion(cacheCitaciones.find((c) => c.id === btn.dataset.imprimirCit)));
    });
  } else {
    tbody.innerHTML = datos
      .map(
        (i) => `
        <tr>
          <td class="crew-name">${escapeHtml(i.estudianteNombre)}</td>
          <td class="hide-sm font-mono text-xs text-slate-400">${escapeHtml(i.fecha)}</td>
          <td class="text-sm text-slate-300">${escapeHtml((i.metodo || []).join(", "))}</td>
          <td class="hide-sm text-sm text-slate-400 truncate-notes">${escapeHtml(i.razon)}</td>
          <td class="text-right"><button class="row-action-btn" data-imprimir-int="${i.id}">🖨️</button></td>
        </tr>`
      )
      .join("");
    tbody.querySelectorAll("[data-imprimir-int]").forEach((btn) => {
      btn.addEventListener("click", () => imprimirIntervencion(cacheIntervenciones.find((i) => i.id === btn.dataset.imprimirInt)));
    });
  }
}

const modalCitacion = document.getElementById("modal-citacion");
document.getElementById("btn-nuevo-registro-cit").addEventListener("click", () => {
  if (tipoActivo === "citaciones") {
    document.getElementById("form-citacion").reset();
    document.getElementById("citacion-form-error").classList.add("hidden");
    modalCitacion.classList.remove("hidden");
  } else {
    document.getElementById("form-intervencion").reset();
    document.getElementById("intervencion-form-error").classList.add("hidden");
    document.getElementById("modal-intervencion").classList.remove("hidden");
  }
});
document.getElementById("modal-citacion-close-btn").addEventListener("click", () => modalCitacion.classList.add("hidden"));
document.getElementById("modal-citacion-cancel-btn").addEventListener("click", () => modalCitacion.classList.add("hidden"));

document.getElementById("form-citacion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("citacion-form-error");
  const estudianteId = document.getElementById("cit-estudiante").value;
  if (!estudianteId) {
    errorEl.textContent = "Selecciona un estudiante.";
    errorEl.classList.remove("hidden");
    return;
  }
  const estudiante = cacheEstudiantes.find((e) => e.id === estudianteId);
  const motivos = Array.from(document.querySelectorAll('input[name="cit-motivo"]:checked')).map((el) => el.value);
  const motivoOtro = document.getElementById("cit-motivo-otro").value.trim();
  if (motivoOtro) motivos.push(`Otro: ${motivoOtro}`);

  const datos = {
    estudianteId,
    estudianteNombre: estudiante.nombreCompleto,
    fecha: document.getElementById("cit-fecha").value,
    hora: document.getElementById("cit-hora").value,
    lugar: document.getElementById("cit-lugar").value.trim(),
    encargadoNombre: document.getElementById("cit-encargado-nombre").value.trim(),
    encargadoTelefono: document.getElementById("cit-encargado-telefono").value.trim(),
    encargadoCorreo: document.getElementById("cit-encargado-correo").value.trim(),
    motivos,
    observaciones: document.getElementById("cit-observaciones").value.trim()
  };

  await guardarCitacion(datos);
  modalCitacion.classList.add("hidden");
});

const modalIntervencion = document.getElementById("modal-intervencion");
document.getElementById("modal-intervencion-close-btn").addEventListener("click", () => modalIntervencion.classList.add("hidden"));
document.getElementById("modal-intervencion-cancel-btn").addEventListener("click", () => modalIntervencion.classList.add("hidden"));

document.getElementById("form-intervencion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("intervencion-form-error");
  const estudianteId = document.getElementById("int-estudiante").value;
  if (!estudianteId) {
    errorEl.textContent = "Selecciona un estudiante.";
    errorEl.classList.remove("hidden");
    return;
  }
  const estudiante = cacheEstudiantes.find((e) => e.id === estudianteId);
  const metodo = Array.from(document.querySelectorAll('input[name="int-metodo"]:checked')).map((el) => el.value);

  const datos = {
    estudianteId,
    estudianteNombre: estudiante.nombreCompleto,
    contacto: document.getElementById("int-contacto").value.trim(),
    fecha: document.getElementById("int-fecha").value,
    hora: document.getElementById("int-hora").value,
    metodo,
    razon: document.getElementById("int-razon").value.trim(),
    notas: document.getElementById("int-notas").value.trim()
  };

  await guardarIntervencion(datos);
  modalIntervencion.classList.add("hidden");
});

function imprimirCitacion(c) {
  if (!c) return;
  const esc = configEscuela || {};
  printArea.innerHTML = `
    <div class="print-doc">
      <h1>CITACIÓN DE PADRES</h1>
      <div class="print-box">
        <div class="print-row"><span><strong>Institución:</strong> ${escapeHtml(esc.institucion)}</span><span><strong>Fecha:</strong> ${escapeHtml(c.fecha)}</span></div>
        <div class="print-row"><span><strong>Dirección:</strong> ${escapeHtml(esc.direccion)}</span><span><strong>Hora:</strong> ${escapeHtml(c.hora)}</span></div>
        <div class="print-row"><span><strong>Teléfono:</strong> ${escapeHtml(esc.telefono)}</span><span><strong>Lugar:</strong> ${escapeHtml(c.lugar)}</span></div>
      </div>
      <div class="print-section-title">DATOS DEL ESTUDIANTE</div>
      <div class="print-box"><strong>Nombre:</strong> ${escapeHtml(c.estudianteNombre)} &nbsp;&nbsp; <strong>Grado/Grupo:</strong> ${escapeHtml(esc.grado)}</div>
      <div class="print-section-title">DATOS DEL PADRE, MADRE O ENCARGADO</div>
      <div class="print-box">
        <div><strong>Nombre:</strong> ${escapeHtml(c.encargadoNombre)}</div>
        <div class="print-row"><span><strong>Teléfono:</strong> ${escapeHtml(c.encargadoTelefono)}</span><span><strong>Correo:</strong> ${escapeHtml(c.encargadoCorreo) || "—"}</span></div>
      </div>
      <div class="print-section-title">MOTIVO DE LA CITACIÓN</div>
      <div class="print-box">${(c.motivos || []).map((m) => `☑ ${escapeHtml(m)}`).join(" &nbsp;&nbsp; ") || "—"}</div>
      <div class="print-section-title">OBSERVACIONES / DETALLES</div>
      <div class="print-box print-lines">${escapeHtml(c.observaciones) || ""}</div>
      <div class="print-footnote">Agradecemos su atención y puntual asistencia. Favor confirmar al teléfono de la institución.</div>
      <div class="print-signatures">
        <div>
          <div class="print-sig-label">CITACIÓN REALIZADA POR</div>
          <div class="print-sig-line">${escapeHtml(esc.maestroNombre) || "&nbsp;"}</div>
          <div class="print-sig-line">${escapeHtml(esc.maestroCargo) || "&nbsp;"}</div>
          <div class="print-sig-line">Firma: ______________________</div>
        </div>
        <div>
          <div class="print-sig-label">RECIBIDO POR (Padre/Madre/Encargado)</div>
          <div class="print-sig-line">Nombre: ______________________</div>
          <div class="print-sig-line">Relación: ______________________</div>
          <div class="print-sig-line">Firma: ______________________ &nbsp; Fecha: _____/_____/_____</div>
        </div>
      </div>
    </div>
  `;
  window.print();
}

function imprimirIntervencion(i) {
  if (!i) return;
  printArea.innerHTML = `
    <div class="print-doc">
      <h1 style="font-family:cursive">Registro de intervención con los estudiantes</h1>
      <table class="print-table">
        <tr>
          <td><strong>NOMBRE DEL ESTUDIANTE:</strong><br/>${escapeHtml(i.estudianteNombre)}</td>
          <td><strong>NOMBRE DE CONTACTO:</strong><br/>${escapeHtml(i.contacto)}</td>
          <td rowspan="3"><strong>NOTAS:</strong><br/>${escapeHtml(i.notas)}</td>
        </tr>
        <tr>
          <td><strong>FECHA:</strong> ${escapeHtml(i.fecha)}<br/><strong>HORA:</strong> ${escapeHtml(i.hora)}</td>
          <td><strong>RAZÓN PARA CONTACTAR:</strong><br/>${escapeHtml(i.razon)}</td>
        </tr>
        <tr>
          <td><strong>MÉTODO DE CONTACTO:</strong><br/>${(i.metodo || []).map((m) => `☑ ${escapeHtml(m)}`).join("<br/>") || "—"}</td>
          <td></td>
        </tr>
      </table>
    </div>
  `;
  window.print();
}

escucharCitaciones((datos) => {
  cacheCitaciones = datos;
  if (tipoActivo === "citaciones") renderLista();
});
escucharIntervenciones((datos) => {
  cacheIntervenciones = datos;
  if (tipoActivo === "intervenciones") renderLista();
});

export function refrescarEstudiantesCitaciones() {
  cacheEstudiantes = obtenerListaTripulacion();
  poblarSelectoresEstudiante();
  renderLista();
}

initConfigEscuela();
refrescarEstudiantesCitaciones();
