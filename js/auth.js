// ============================================================
// AUTH — Inicio de sesión, cierre de sesión, estado de autenticación
// ============================================================
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginBtnText = document.getElementById("login-btn-text");
const loginSpinner = document.getElementById("login-spinner");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userEmailLabel = document.getElementById("user-email");

// Mensajes de error en el "voz" de la interfaz: directos, sin culpar al usuario,
// sin confirmar si el correo existe (evita filtrar información de la cuenta).
function mapAuthError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Ese formato de correo no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento antes de volver a intentar.";
    case "auth/network-request-failed":
      return "No hay conexión. Revisa tu internet e intenta de nuevo.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtnText.classList.toggle("hidden", isLoading);
  loginSpinner.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove("hidden");
}

function clearError() {
  loginError.textContent = "";
  loginError.classList.add("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encarga de mostrar el dashboard.
  } catch (error) {
    showError(mapAuthError(error));
  } finally {
    setLoading(false);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    userEmailLabel.textContent = user.email;
  } else {
    dashboard.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    loginForm.reset();
  }
});
