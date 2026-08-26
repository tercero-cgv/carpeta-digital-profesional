// ============================================================
// ASISTENCIA UI — Pestañas de mes, matriz de días laborables,
// totales automáticos, bitácora anual, respaldo .json
// ============================================================
import { obtenerListaTripulacion } from "./estudiantes-data.js";
import {
  escucharAsistencia,
  marcarCelda,
  marcarCodigoGrupal,
  obtenerAnoEscolar,
  guardarAnoEscolar
} from "./asistencia-data.js";

const CODIGOS_GRUPALES = ["NC", "GO"]; // afectan a todo el grupo, no solo a la celda tocada

// mesJS: índice de mes de JavaScript (0=enero ... 11=diciembre)
// anoOffset: 0 = año en que empieza el año escolar, 1 = el año siguiente
const MESES = [
  { key: "08", nombre: "Agosto", mesJS: 7, anoOffset: 0 },
  { key: "09", nombre: "Septiembre", mesJS: 8, anoOffset: 0 },
  { key: "10", nombre: "Octubre", mesJS: 9, anoOffset: 0 },
  { key: "11", nombre: "Noviembre", mesJS: 10, anoOffset: 0 },
  { key: "12", nombre: "Diciembre", mesJS: 11, anoOffset: 0 },
  { key: "01", nombre: "Enero", mesJS: 0, anoOffset: 1 },
  { key: "02", nombre: "Febrero", mesJS: 1, anoOffset: 1 },
  { key: "03", nombre: "Marzo", mesJS: 2, anoOffset: 1 },
  { key: "04", nombre: "Abril", mesJS: 3, anoOffset: 1 },
  { key: "05", nombre: "Mayo", mesJS: 4, anoOffset: 1 }
];
const DIA_LABEL = ["D", "L", "M", "X", "J", "V", "S"];
const CODIGOS = ["1", "0", "T", "J", "IMP", "GO", "NC"];

let anoEscolarInicio = null;
let mesActivo = null;
let cacheEstudiantes = [];
let cacheAsistencia = {};

const configBox = document.getElementById("config-ano-escolar");
const resumenBox = document.getElementById("ano-escolar-resumen");
const inputInicio = document.getElementById("ano-escolar-inicio");
const finLabel = document.getElementById("ano-escolar-fin");
const labelResumen = document.getElementById("ano-escolar-label");
const tabsContainer = document.getElementById("tabs-meses");
const gridWrap = document.getElementById("grid-mes-wrap");
const vistaAnual = document.getElementById("vista-anual");

async function initAnoEscolar() {
  anoEscolarInicio = await obtenerAnoEscolar();
  if (anoEscolarInicio) {
    mostrarResumenAno();
  } else {
    configBox.classList.remove("hidden");
    resumenBox.classList.add("hidden");
  }
  renderTabs();
}

function mostrarResumenAno() {
  configBox.classList.add("hidden");
  resumenBox.classList.remove("hidden");
  labelResumen.textContent = `${anoEscolarInicio}–${anoEscolarInicio + 1}`;
}

inputInicio.addEventListener("input", () => {
  const val = parseInt(inputInicio.value, 10);
  finLabel.textContent = val ? `${val + 1}` : "20__";
});

document.getElementById("btn-guardar-ano").addEventListener("click", async () => {
  const val = parseInt(inputInicio.value, 10);
  if (!val || val < 2020 || val > 2100) return;
  await guardarAnoEscolar(val);
  anoEscolarInicio = val;
  mostrarResumenAno();
  renderTabs();
  renderVistaActiva();
});

document.getElementById("btn-editar-ano").addEventListener("click", () => {
  configBox.classList.remove("hidden");
  resumenBox.classList.add("hidden");
  inputInicio.value = anoEscolarInicio || "";
  finLabel.textContent = anoEscolarInicio ? anoEscolarInicio + 1 : "20__";
});

function generarDiasLaborables(mesInfo) {
  const anoReal = anoEscolarInicio + mesInfo.anoOffset;
  const ultimoDia = new Date(anoReal, mesInfo.mesJS + 1, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(anoReal, mesInfo.mesJS, d);
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    const fechaISO = `${anoReal}-${String(mesInfo.mesJS + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dias.push({ fechaISO, numero: d, label: DIA_LABEL[diaSemana] });
  }
  return dias;
}

function renderTabs() {
  const botones = MESES.map(
    (m) => `<button class="month-tab" data-mes="${m.key}">${m.nombre}</button>`
  ).join("");
  tabsContainer.innerHTML =
    botones + `<button class="month-tab month-tab-annual" data-mes="anual">🛸 Bitácora Anual</button>`;

  if (!mesActivo) mesActivo = MESES[0].key;
  actualizarTabActiva();

  tabsContainer.querySelectorAll(".month-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      mesActivo = btn.dataset.mes;
      actualizarTabActiva();
      renderVistaActiva();
    });
  });
}

function actualizarTabActiva() {
  tabsContainer.querySelectorAll(".month-tab").forEach((btn) => {
    btn.classList.toggle("month-tab-active", btn.dataset.mes === mesActivo);
  });
}

function renderVistaActiva() {
  if (!anoEscolarInicio) {
    gridWrap.innerHTML = `<p class="text-slate-500 text-sm p-4">Configura el año escolar arriba para generar el calendario.</p>`;
    vistaAnual.classList.add("hidden");
    gridWrap.classList.remove("hidden");
    return;
  }
  if (mesActivo === "anual") {
    gridWrap.classList.add("hidden");
    vistaAnual.classList.remove("hidden");
    renderBitacoraAnual();
  } else {
    vistaAnual.classList.add("hidden");
    gridWrap.classList.remove("hidden");
    renderGridMes();
  }
}

function calcularTotalesMes(estudianteId, mesKeyCompleto) {
  const docu = cacheAsistencia[`${estudianteId}_${mesKeyCompleto}`];
  const dias = docu?.dias || {};
  const totales = { presente: 0, ausente: 0, tardanza: 0, justificada: 0 };
  Object.values(dias).forEach((codigo) => {
    if (codigo === "1" || codigo === "GO") totales.presente++;
    else if (codigo === "0" || codigo === "IMP") totales.ausente++;
    else if (codigo === "T") totales.tardanza++;
    else if (codigo === "J") totales.justificada++;
  });
  return totales;
}

function renderGridMes() {
  const mesInfo = MESES.find((m) => m.key === mesActivo);
  const mesKeyCompleto = `${anoEscolarInicio + mesInfo.anoOffset}-${mesInfo.key}`;
  const dias = generarDiasLaborables(mesInfo);

  if (cacheEstudiantes.length === 0) {
    gridWrap.innerHTML = `<p class="text-slate-500 text-sm p-4">Añade estudiantes en "Lista de Estudiantes" primero.</p>`;
    return;
  }

  const headerDias = dias
    .map((d) => `<th class="att-day-col">${d.label}<br/><span class="att-day-num">${d.numero}</span></th>`)
    .join("");

  const filas = cacheEstudiantes
    .map((est) => {
      const totales = calcularTotalesMes(est.id, mesKeyCompleto);
      const docActual = cacheAsistencia[`${est.id}_${mesKeyCompleto}`]?.dias || {};

      const celdas = dias
        .map((d) => {
          const valor = docActual[d.fechaISO] || "";
          const opciones = [`<option value="">–</option>`]
            .concat(CODIGOS.map((c) => `<option value="${c}" ${c === valor ? "selected" : ""}>${c}</option>`))
            .join("");
          return `<td>
            <select class="att-cell att-cell-${valor || "vacia"}" data-estudiante="${est.id}" data-fecha="${d.fechaISO}">
              ${opciones}
            </select>
          </td>`;
        })
        .join("");

      return `
        <tr>
          <td class="att-name-col">${escapeHtml(est.nombreCompleto)}</td>
          ${celdas}
          <td class="att-total att-total-presente">${totales.presente}</td>
          <td class="att-total att-total-ausente">${totales.ausente}</td>
          <td class="att-total att-total-tardanza">${totales.tardanza}</td>
          <td class="att-total att-total-justificada">${totales.justificada}</td>
        </tr>
      `;
    })
    .join("");

  gridWrap.innerHTML = `
    <table class="attendance-table">
      <thead>
        <tr>
          <th class="att-name-col">Tripulante</th>
          ${headerDias}
          <th class="att-total-header">Presente</th>
          <th class="att-total-header">Ausente</th>
          <th class="att-total-header">Tardanza</th>
          <th class="att-total-header">Justif.</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;

  gridWrap.querySelectorAll(".att-cell").forEach((select) => {
    select.addEventListener("change", async () => {
      const estudianteId = select.dataset.estudiante;
      const fechaISO = select.dataset.fecha;
      const codigo = select.value;

      select.className = `att-cell att-cell-${codigo || "vacia"}`;

      if (CODIGOS_GRUPALES.includes(codigo)) {
        const todosLosIds = cacheEstudiantes.map((e) => e.id);
        await marcarCodigoGrupal(mesKeyCompleto, fechaISO, todosLosIds, codigo);
      } else {
        await marcarCelda(estudianteId, mesKeyCompleto, fechaISO, codigo);
      }
      renderGridMes();
    });
  });
}

function renderBitacoraAnual() {
  if (cacheEstudiantes.length === 0) {
    vistaAnual.innerHTML = `<p class="text-slate-500 text-sm p-4">Añade estudiantes en "Lista de Estudiantes" primero.</p>`;
    return;
  }

  const filas = cacheEstudiantes
    .map((est) => {
      const acumulado = { presente: 0, ausente: 0, tardanza: 0, justificada: 0 };
      MESES.forEach((m) => {
        const mesKeyCompleto = `${anoEscolarInicio + m.anoOffset}-${m.key}`;
        const t = calcularTotalesMes(est.id, mesKeyCompleto);
        acumulado.presente += t.presente;
        acumulado.ausente += t.ausente;
        acumulado.tardanza += t.tardanza;
        acumulado.justificada += t.justificada;
      });
      return `
        <tr>
          <td class="att-name-col">${escapeHtml(est.nombreCompleto)}</td>
          <td class="att-total att-total-presente">${acumulado.presente}</td>
          <td class="att-total att-total-ausente">${acumulado.ausente}</td>
          <td class="att-total att-total-tardanza">${acumulado.tardanza}</td>
          <td class="att-total att-total-justificada">${acumulado.justificada}</td>
        </tr>
      `;
    })
    .join("");

  vistaAnual.innerHTML = `
    <table class="attendance-table">
      <thead>
        <tr>
          <th class="att-name-col">Tripulante</th>
          <th class="att-total-header">Presencias<br/>Anuales</th>
          <th class="att-total-header">Ausencias<br/>Anuales</th>
          <th class="att-total-header">Tardanzas<br/>Anuales</th>
          <th class="att-total-header">Justif.<br/>Anuales</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("btn-respaldo-json").addEventListener("click", () => {
  const payload = {
    generadoEn: new Date().toISOString(),
    anoEscolarInicio,
    estudiantes: cacheEstudiantes,
    asistencia: cacheAsistencia
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respaldo-asistencia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

escucharAsistencia((datos) => {
  cacheAsistencia = datos;
  renderVistaActiva();
});

// Como Fase 2 solo expone la función ya resuelta (no un listener),
// refrescamos el caché de estudiantes cada vez que se entra a esta sección.
export function refrescarEstudiantesAsistencia() {
  cacheEstudiantes = obtenerListaTripulacion();
  renderVistaActiva();
}

initAnoEscolar();
refrescarEstudiantesAsistencia();
