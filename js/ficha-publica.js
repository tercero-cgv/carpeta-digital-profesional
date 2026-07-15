// ============================================================
// FICHA PÚBLICA — Página standalone para padres (enlace/QR compartido)
// Usa Firebase Anonymous Auth: cada visitante obtiene una sesión
// temporal sin contraseña. Las reglas de Firestore solo permiten,
// con esa sesión anónima, LEER nombres de estudiantes (para el
// desplegable) y CREAR una ficha nueva — nunca leer perfiles ya
// guardados de nadie. Todo lo demás de Roll Book sigue bloqueado
// para cualquiera que no sea la cuenta real del maestro.
// ============================================================
import { auth, db } from "./firebase-config.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cargandoAviso = document.getElementById("cargando-aviso");
const form = document.getElementById("form-ficha-padres");
const selectEstudiante = document.getElementById("ficha-select-estudiante");
const formError = document.getElementById("ficha-form-error");
const submitBtn = document.getElementById("ficha-submit-btn");
const submitText = document.getElementById("ficha-submit-text");
const submitSpinner = document.getElementById("ficha-submit-spinner");
const kioskScroll = document.getElementById("kiosk-scroll-standalone");
const exitoView = document.getElementById("exito-standalone");

function escapeHtml(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================
// 1. AUTENTICACIÓN ANÓNIMA + CARGA DEL ROSTER (solo nombres)
// ============================================================
async function init() {
  try {
    await signInAnonymously(auth);
    const q = query(collection(db, "estudiantes"), orderBy("apellidos"));
    const snap = await getDocs(q);
    const activos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.activo !== false);

    selectEstudiante.innerHTML =
      '<option value="" disabled selected>Selecciona el nombre...</option>' +
      activos.map((e) => `<option value="${e.id}">${escapeHtml(e.nombre)} ${escapeHtml(e.apellidos)}</option>`).join("");

    cargandoAviso.classList.add("hidden");
    form.classList.remove("hidden");
    ajustarCanvas();
    document.getElementById("firma-fecha").textContent = `Fecha: ${fechaFirmaHoy()}`;
  } catch (err) {
    cargandoAviso.textContent = "No se pudo cargar el formulario. Verifica tu conexión e intenta de nuevo.";
    console.error(err);
  }
}

// ============================================================
// 2. CAMPOS CONDICIONALES
// ============================================================
document.querySelectorAll('input[name="educ-especial"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const grupoTerapias = document.getElementById("grupo-terapias");
    const mostrar = document.querySelector('input[name="educ-especial"]:checked')?.value === "Si";
    grupoTerapias.classList.toggle("hidden", !mostrar);
  });
});

// ============================================================
// 3. FIRMA DIGITAL
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
function terminarTrazo() { firmando = false; }

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
// 4. ENVÍO — misma estructura que el modo kiosco del panel admin
// ============================================================
function val(id) { return document.getElementById(id).value.trim(); }
function radioValue(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || ""; }

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}
function clearFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}
function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitText.classList.toggle("hidden", isLoading);
  submitSpinner.classList.toggle("hidden", !isLoading);
}

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

  const terapias = Array.from(document.querySelectorAll('input[name="terapia"]:checked')).map((el) => el.value);

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
      nombre: val("madre-nombre"), ocupacion: val("madre-ocupacion"),
      trabajo: val("madre-trabajo"), telTrabajo: val("madre-tel-trabajo")
    },
    padre: {
      nombre: val("padre-nombre"), ocupacion: val("padre-ocupacion"),
      trabajo: val("padre-trabajo"), telTrabajo: val("padre-tel-trabajo")
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
      nombre: val("emerg-nombre"), parentesco: val("emerg-parentesco"), telefono: val("emerg-telefono")
    },
    autorizacion: {
      encargado: val("autoriza-encargado"),
      contacto: val("autoriza-contacto"),
      firmaBase64: canvas.toDataURL("image/png"),
      fecha: fechaFirmaHoy()
    },
    origen: "formulario-publico" // distingue estas fichas de las llenadas en el kiosco del salón
  };

  setSubmitLoading(true);
  try {
    await addDoc(collection(db, "perfiles_estudiantes"), {
      ...datos,
      estado: "pendiente",
      enviadoEn: serverTimestamp()
    });
    kioskScroll.classList.add("hidden");
    exitoView.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showFormError("No se pudo enviar. Intenta de nuevo o avisa al maestro/a.");
  } finally {
    setSubmitLoading(false);
  }
});

init();
