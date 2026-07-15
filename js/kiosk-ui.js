// ============================================================
// KIOSK UI — Modo Kiosco para llenado de padres + listado admin
// ============================================================
import { auth } from "./firebase-config.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { obtenerListaTripulacion } from "./estudiantes-data.js";
import { agregarPerfil, escucharPerfiles } from "./perfiles-data.js";

// ---------- Referencias DOM ----------
const btnActivarKiosco = document.getElementById("btn-activar-kiosco");
const kioskOverlay = document.getElementById("kiosk-overlay");
const kioskFormView = document.getElementById("kiosk-form-view");
const kioskSuccessView = document.getElementById("kiosk-success-view");
const kioskExitBtn = document.getElementById("kiosk-exit-btn");

const modalSalir = document.getElementById("modal-salir-kiosco");
const salirPasswordInput = document.getElementById("salir-kiosco-password");
const salirError = document.getElementById("salir-kiosco-error");

const form = document.getElementById("form-ficha-padres");
const selectEstudiante = document.getElementById("ficha-select-estudiante");
const formError = document.getElementById("ficha-form-error");
const submitBtn = document.getElementById("ficha-submit-btn");
const submitText = document.getElementById("ficha-submit-text");
const submitSpinner = document.getElementById("ficha-submit-spinner");

const perfilesTableBody = document.getElementById("perfiles-table-body");
const perfilesEmptyState = document.getElementById("perfiles-empty-state");
let cachePerfilesAdmin = [];

const modalVerPerfil = document.getElementById("modal-ver-perfil");
const verPerfilContenido = document.getElementById("ver-perfil-contenido");
const printArea = document.getElementById("print-area");

// ============================================================
// 1. ACTIVAR / SALIR DEL MODO KIOSCO
// ============================================================
btnActivarKiosco.addEventListener("click", () => {
  poblarSelectorEstudiantes();
  resetFormularioFicha();
  kioskOverlay.classList.remove("hidden");
  kioskFormView.classList.remove("hidden");
  kioskSuccessView.classList.add("hidden");
  document.body.style.overflow = "hidden";
});

kioskExitBtn.addEventListener("click", () => {
  salirError.classList.add("hidden");
  salirPasswordInput.value = "";
  modalSalir.classList.remove("hidden");
});

document.getElementById("salir-kiosco-cancel-btn").addEventListener("click", () => {
  modalSalir.classList.add("hidden");
});

document.getElementById("salir-kiosco-confirm-btn").addEventListener("click", async () => {
  const password = salirPasswordInput.value;
  if (!password) {
    salirError.textContent = "Escribe tu contraseña.";
    salirError.classList.remove("hidden");
    return;
  }
  try {
    // Reautenticar contra Firebase Auth en vez de comparar contra una
    // clave guardada en el código — así ninguna contraseña ni PIN
    // queda expuesto en el HTML/JS que cualquiera puede leer.
    const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, cred);
    modalSalir.classList.add("hidden");
    kioskOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  } catch (error) {
    salirError.textContent = "Contraseña incorrecta.";
    salirError.classList.remove("hidden");
  }
});

// ============================================================
// 2. POBLAR SELECTOR DE ESTUDIANTES (reutiliza Fase 2)
// ============================================================
function poblarSelectorEstudiantes() {
  const lista = obtenerListaTripulacion();
  selectEstudiante.innerHTML =
    '<option value="" disabled selected>Selecciona el nombre...</option>' +
    lista
      .map((e) => `<option value="${e.id}">${escapeHtml(e.nombreCompleto)}</option>`)
      .join("");
}

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================
// 3. CAMPOS CONDICIONALES — Educación Especial → Terapias
// ============================================================
document.querySelectorAll('input[name="educ-especial"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const grupoTerapias = document.getElementById("grupo-terapias");
    const mostrar = document.querySelector('input[name="educ-especial"]:checked')?.value === "Si";
    grupoTerapias.classList.toggle("hidden", !mostrar);
  });
});

// ============================================================
// 4. FIRMA DIGITAL (canvas táctil, funciona con dedo o mouse)
// ============================================================
const canvas = document.getElementById("firma-canvas");
const ctx = canvas.getContext("2d");
let firmando = false;
let firmaVacia = true;

function ajustarCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = 160 * ratio;
  canvas.style.height = "160px";
  ctx.scale(ratio, ratio);
  ctx.strokeStyle = "#0B0E2C";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}
window.addEventListener("resize", ajustarCanvas);

function posicionEvento(e) {
  const rect = canvas.getBoundingClientRect();
  const punto = e.touches ? e.touches[0] : e;
  return { x: punto.clientX - rect.left, y: punto.clientY - rect.top };
}

function empezarTrazo(e) {
  firmando = true;
  firmaVacia = false;
  const { x, y } = posicionEvento(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  e.preventDefault();
}
function trazar(e) {
  if (!firmando) return;
  const { x, y } = posicionEvento(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  e.preventDefault();
}
function terminarTrazo() {
  firmando = false;
}

canvas.addEventListener("mousedown", empezarTrazo);
canvas.addEventListener("mousemove", trazar);
window.addEventListener("mouseup", terminarTrazo);
canvas.addEventListener("touchstart", empezarTrazo, { passive: false });
canvas.addEventListener("touchmove", trazar, { passive: false });
canvas.addEventListener("touchend", terminarTrazo);

document.getElementById("firma-limpiar-btn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  firmaVacia = true;
});

function fechaFirmaHoy() {
  return new Date().toLocaleDateString("es-PR", { day: "numeric", month: "long", year: "numeric" });
}

// ============================================================
// 5. RESET DEL FORMULARIO (al abrir kiosco y tras cada envío)
// ============================================================
function resetFormularioFicha() {
  form.reset();
  document.getElementById("grupo-terapias").classList.add("hidden");
  ajustarCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  firmaVacia = true;
  document.getElementById("firma-fecha").textContent = `Fecha: ${fechaFirmaHoy()}`;
  clearFormError();
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}
function clearFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

// ============================================================
// 6. ENVÍO DEL FORMULARIO → Firestore
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  if (!selectEstudiante.value) {
    showFormError("Selecciona para cuál estudiante es esta ficha.");
    return;
  }
  if (firmaVacia) {
    showFormError("Falta la firma digital del encargado.");
    return;
  }

  const terapias = Array.from(
    document.querySelectorAll('input[name="terapia"]:checked')
  ).map((el) => el.value);

  const datos = {
    estudianteId: selectEstudiante.value,
    estudianteNombreSeleccionado: selectEstudiante.options[selectEstudiante.selectedIndex].text,
    estudiante: {
      nombre: val("est-nombre"),
      inicial: val("est-inicial"),
      apellidoPaterno: val("est-apellido-paterno"),
      apellidoMaterno: val("est-apellido-materno"),
      nacimiento: { dia: val("est-nac-dia"), mes: val("est-nac-mes"), ano: val("est-nac-ano") },
      edad: val("est-edad"),
      direccion: val("est-direccion"),
      telefono: val("est-telefono")
    },
    madre: {
      nombre: val("madre-nombre"),
      ocupacion: val("madre-ocupacion"),
      trabajo: val("madre-trabajo"),
      telTrabajo: val("madre-tel-trabajo")
    },
    padre: {
      nombre: val("padre-nombre"),
      ocupacion: val("padre-ocupacion"),
      trabajo: val("padre-trabajo"),
      telTrabajo: val("padre-tel-trabajo")
    },
    viveCon: radioValue("vive-con"),
    tieneComputadora: radioValue("tiene-computadora"),
    tieneInternet: radioValue("tiene-internet"),
    repiteGrado: radioValue("repite-grado"),
    repitioAntes: radioValue("repitio-antes"),
    educacionEspecial: radioValue("educ-especial"),
    terapias,
    salud: {
      enfermedad: val("salud-enfermedad"),
      usaMedicamentos: radioValue("usa-medicamentos"),
      noAutorizados: val("salud-no-autorizados")
    },
    emergencia: {
      nombre: val("emerg-nombre"),
      parentesco: val("emerg-parentesco"),
      telefono: val("emerg-telefono")
    },
    autorizacion: {
      encargado: val("autoriza-encargado"),
      contacto: val("autoriza-contacto"),
      firmaBase64: canvas.toDataURL("image/png"),
      fecha: fechaFirmaHoy()
    }
  };

  setSubmitLoading(true);
  try {
    await agregarPerfil(datos);
    mostrarPantallaExito();
  } catch (error) {
    console.error(error);
    showFormError("No se pudo enviar. Intenta de nuevo o avisa al maestro/a.");
  } finally {
    setSubmitLoading(false);
  }
});

function val(id) {
  return document.getElementById(id).value.trim();
}
function radioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitText.classList.toggle("hidden", isLoading);
  submitSpinner.classList.toggle("hidden", !isLoading);
}

function mostrarPantallaExito() {
  kioskFormView.classList.add("hidden");
  kioskSuccessView.classList.remove("hidden");
  setTimeout(() => {
    resetFormularioFicha();
    poblarSelectorEstudiantes();
    kioskSuccessView.classList.add("hidden");
    kioskFormView.classList.remove("hidden");
    kioskFormView.scrollTop = 0;
  }, 2600);
}

// ============================================================
// 7. LISTADO ADMINISTRATIVO (vista del maestro)
// ============================================================
escucharPerfiles((perfiles) => {
  cachePerfilesAdmin = perfiles;
  if (perfiles.length === 0) {
    perfilesTableBody.innerHTML = "";
    perfilesEmptyState.classList.remove("hidden");
    return;
  }
  perfilesEmptyState.classList.add("hidden");
  perfilesTableBody.innerHTML = perfiles
    .map((p) => {
      const fecha = p.enviadoEn?.toDate
        ? p.enviadoEn.toDate().toLocaleDateString("es-PR")
        : "—";
      const estadoClase = p.estado === "pendiente" ? "estado-pendiente" : "estado-aprobado";
      const origen = p.origen === "formulario-publico" ? "Enlace público" : "Kiosco del salón";
      return `
        <tr>
          <td class="crew-name">${escapeHtml(p.estudianteNombreSeleccionado || "—")}</td>
          <td class="hide-sm font-mono text-xs text-slate-400">${fecha}</td>
          <td class="hide-sm text-xs text-slate-400">${origen}</td>
          <td><span class="estado-pill ${estadoClase}">${escapeHtml(p.estado)}</span></td>
          <td class="text-right"><button class="row-action-btn" data-ver-perfil="${p.id}">👁</button></td>
        </tr>
      `;
    })
    .join("");

  perfilesTableBody.querySelectorAll("[data-ver-perfil]").forEach((btn) => {
    btn.addEventListener("click", () => abrirVerPerfil(cachePerfilesAdmin.find((p) => p.id === btn.dataset.verPerfil)));
  });
});

// ============================================================
// 8. VER / IMPRIMIR FICHA INDIVIDUAL
// ============================================================
function campo(label, valor) {
  return `<div style="margin-bottom:.6rem"><span class="text-slate-500 font-mono text-xs">${label}:</span> ${escapeHtml(valor) || "—"}</div>`;
}

function abrirVerPerfil(p) {
  if (!p) return;
  const est = p.estudiante || {};
  const fecha = p.enviadoEn?.toDate ? p.enviadoEn.toDate().toLocaleDateString("es-PR") : "—";

  verPerfilContenido.innerHTML = `
    <p class="text-xs text-slate-500 font-mono mb-3">Enviado ${fecha} · ${p.origen === "formulario-publico" ? "Enlace público" : "Kiosco del salón"} · Estado: ${escapeHtml(p.estado)}</p>
    <h5 class="font-display text-slate-200 mb-2">Datos del Estudiante</h5>
    ${campo("Nombre completo", `${est.nombre || ""} ${est.inicial || ""} ${est.apellidoPaterno || ""} ${est.apellidoMaterno || ""}`)}
    ${campo("Nacimiento", `${est.nacimiento?.dia || "—"}/${est.nacimiento?.mes || "—"}/${est.nacimiento?.ano || "—"}`)}
    ${campo("Edad", est.edad)}
    ${campo("Dirección", est.direccion)}
    ${campo("Teléfono", est.telefono)}
    <h5 class="font-display text-slate-200 mt-4 mb-2">Madre/Encargada</h5>
    ${campo("Nombre", p.madre?.nombre)} ${campo("Ocupación", p.madre?.ocupacion)} ${campo("Trabajo", p.madre?.trabajo)} ${campo("Tel. trabajo", p.madre?.telTrabajo)}
    <h5 class="font-display text-slate-200 mt-4 mb-2">Padre/Encargado</h5>
    ${campo("Nombre", p.padre?.nombre)} ${campo("Ocupación", p.padre?.ocupacion)} ${campo("Trabajo", p.padre?.trabajo)} ${campo("Tel. trabajo", p.padre?.telTrabajo)}
    <h5 class="font-display text-slate-200 mt-4 mb-2">Entorno y Servicios</h5>
    ${campo("Vive con", p.viveCon)} ${campo("Computadora en el hogar", p.tieneComputadora)} ${campo("Internet", p.tieneInternet)}
    ${campo("Repite grado", p.repiteGrado)} ${campo("Repitió antes", p.repitioAntes)} ${campo("Educación especial", p.educacionEspecial)}
    ${p.terapias?.length ? campo("Terapias", p.terapias.join(", ")) : ""}
    <h5 class="font-display text-slate-200 mt-4 mb-2">Salud y Emergencia</h5>
    ${campo("Enfermedad", p.salud?.enfermedad)} ${campo("Usa medicamentos", p.salud?.usaMedicamentos)}
    ${campo("Contacto de emergencia", `${p.emergencia?.nombre || ""} (${p.emergencia?.parentesco || ""}) — ${p.emergencia?.telefono || ""}`)}
    ${campo("NO autorizados a retirar", p.salud?.noAutorizados)}
    ${campo("Autorización", `${p.autorizacion?.encargado || ""} autoriza a ${p.autorizacion?.contacto || ""}`)}
    ${p.autorizacion?.firmaBase64 ? `<div class="mt-2"><span class="text-slate-500 font-mono text-xs">Firma:</span><br/><img src="${p.autorizacion.firmaBase64}" style="background:#fff;border-radius:.4rem;max-width:200px;margin-top:.3rem" /></div>` : ""}
  `;

  document.getElementById("ver-perfil-imprimir-btn").onclick = () => imprimirFichaPerfil(p);
  modalVerPerfil.classList.remove("hidden");
}

document.getElementById("modal-ver-perfil-close-btn").addEventListener("click", () => modalVerPerfil.classList.add("hidden"));
document.getElementById("ver-perfil-cerrar-btn").addEventListener("click", () => modalVerPerfil.classList.add("hidden"));

function imprimirFichaPerfil(p) {
  const est = p.estudiante || {};
  printArea.innerHTML = `
    <div class="print-doc">
      <h1>FICHA DE INSCRIPCIÓN DEL TRIPULANTE</h1>
      <div class="print-section-title">DATOS DEL ESTUDIANTE</div>
      <div class="print-box">
        <div><strong>Nombre:</strong> ${escapeHtml(est.nombre)} ${escapeHtml(est.inicial)} ${escapeHtml(est.apellidoPaterno)} ${escapeHtml(est.apellidoMaterno)}</div>
        <div class="print-row"><span><strong>Nacimiento:</strong> ${escapeHtml(est.nacimiento?.dia)}/${escapeHtml(est.nacimiento?.mes)}/${escapeHtml(est.nacimiento?.ano)}</span><span><strong>Edad:</strong> ${escapeHtml(est.edad)}</span></div>
        <div><strong>Dirección:</strong> ${escapeHtml(est.direccion)}</div>
        <div><strong>Teléfono:</strong> ${escapeHtml(est.telefono)}</div>
      </div>
      <div class="print-section-title">MADRE/ENCARGADA</div>
      <div class="print-box">${escapeHtml(p.madre?.nombre)} — ${escapeHtml(p.madre?.ocupacion)} — ${escapeHtml(p.madre?.trabajo)} — ${escapeHtml(p.madre?.telTrabajo)}</div>
      <div class="print-section-title">PADRE/ENCARGADO</div>
      <div class="print-box">${escapeHtml(p.padre?.nombre)} — ${escapeHtml(p.padre?.ocupacion)} — ${escapeHtml(p.padre?.trabajo)} — ${escapeHtml(p.padre?.telTrabajo)}</div>
      <div class="print-section-title">ENTORNO Y SERVICIOS</div>
      <div class="print-box">
        Vive con: ${escapeHtml(p.viveCon)} &nbsp;·&nbsp; Computadora: ${escapeHtml(p.tieneComputadora)} &nbsp;·&nbsp; Internet: ${escapeHtml(p.tieneInternet)}<br/>
        Repite grado: ${escapeHtml(p.repiteGrado)} &nbsp;·&nbsp; Repitió antes: ${escapeHtml(p.repitioAntes)} &nbsp;·&nbsp; Ed. Especial: ${escapeHtml(p.educacionEspecial)}
        ${p.terapias?.length ? `<br/>Terapias: ${escapeHtml(p.terapias.join(", "))}` : ""}
      </div>
      <div class="print-section-title">SALUD Y EMERGENCIA</div>
      <div class="print-box">
        <strong>Enfermedad:</strong> ${escapeHtml(p.salud?.enfermedad) || "Ninguna"} &nbsp;·&nbsp; <strong>Medicamentos:</strong> ${escapeHtml(p.salud?.usaMedicamentos)}<br/>
        <strong>Contacto de emergencia:</strong> ${escapeHtml(p.emergencia?.nombre)} (${escapeHtml(p.emergencia?.parentesco)}) — ${escapeHtml(p.emergencia?.telefono)}<br/>
        <strong>NO autorizados a retirar:</strong> ${escapeHtml(p.salud?.noAutorizados) || "Ninguna"}<br/>
        <strong>Autorización:</strong> ${escapeHtml(p.autorizacion?.encargado)} autoriza a ${escapeHtml(p.autorizacion?.contacto)} — Fecha: ${escapeHtml(p.autorizacion?.fecha)}
      </div>
      ${p.autorizacion?.firmaBase64 ? `<div class="print-section-title">FIRMA</div><div class="print-box"><img src="${p.autorizacion.firmaBase64}" style="max-width:220px" /></div>` : ""}
    </div>
  `;
  window.print();
}

// ============================================================
// 9. DESCARGAR TODAS LAS FICHAS COMO EXCEL
// ============================================================
document.getElementById("btn-descargar-excel-perfiles").addEventListener("click", () => {
  if (cachePerfilesAdmin.length === 0) {
    alert("Todavía no hay fichas para descargar.");
    return;
  }

  // La firma (imagen Base64) se excluye del Excel a propósito — una
  // hoja de cálculo no es el formato para verla; para eso está
  // "Ver/Imprimir" en cada fila, que sí la incluye.
  const filas = cachePerfilesAdmin.map((p) => {
    const est = p.estudiante || {};
    return {
      Estudiante: p.estudianteNombreSeleccionado || "",
      "Enviado el": p.enviadoEn?.toDate ? p.enviadoEn.toDate().toLocaleDateString("es-PR") : "",
      Origen: p.origen === "formulario-publico" ? "Enlace público" : "Kiosco del salón",
      Estado: p.estado || "",
      "Nombre completo": `${est.nombre || ""} ${est.inicial || ""} ${est.apellidoPaterno || ""} ${est.apellidoMaterno || ""}`.trim(),
      "Fecha nacimiento": `${est.nacimiento?.dia || ""}/${est.nacimiento?.mes || ""}/${est.nacimiento?.ano || ""}`,
      Edad: est.edad || "",
      Dirección: est.direccion || "",
      "Teléfono estudiante": est.telefono || "",
      "Madre - Nombre": p.madre?.nombre || "",
      "Madre - Ocupación": p.madre?.ocupacion || "",
      "Madre - Trabajo": p.madre?.trabajo || "",
      "Madre - Tel. trabajo": p.madre?.telTrabajo || "",
      "Padre - Nombre": p.padre?.nombre || "",
      "Padre - Ocupación": p.padre?.ocupacion || "",
      "Padre - Trabajo": p.padre?.trabajo || "",
      "Padre - Tel. trabajo": p.padre?.telTrabajo || "",
      "Vive con": p.viveCon || "",
      "Computadora en hogar": p.tieneComputadora || "",
      Internet: p.tieneInternet || "",
      "Repite grado": p.repiteGrado || "",
      "Repitió antes": p.repitioAntes || "",
      "Educación especial": p.educacionEspecial || "",
      Terapias: (p.terapias || []).join(", "),
      Enfermedad: p.salud?.enfermedad || "",
      "Usa medicamentos": p.salud?.usaMedicamentos || "",
      "Contacto emergencia - Nombre": p.emergencia?.nombre || "",
      "Contacto emergencia - Parentesco": p.emergencia?.parentesco || "",
      "Contacto emergencia - Teléfono": p.emergencia?.telefono || "",
      "NO autorizados a retirar": p.salud?.noAutorizados || "",
      "Autorización - Encargado": p.autorizacion?.encargado || "",
      "Autorización - Contacto": p.autorizacion?.contacto || "",
      "Fecha autorización": p.autorizacion?.fecha || ""
    };
  });

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Fichas de Padres");
  XLSX.writeFile(libro, `fichas-perfil-estudiantes-${new Date().toISOString().slice(0, 10)}.xlsx`);
});
