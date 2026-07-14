// ============================================================
// FIREBASE — Configuración e inicialización
// ============================================================
// INSTRUCCIONES PARA HÉCTOR:
// 1. Ve a https://console.firebase.google.com/ y crea un proyecto nuevo
//    (ej. "digital-space-roll-book").
// 2. Dentro del proyecto: Project Settings (⚙️) → General → "Your apps"
//    → click en el ícono </> (Web) → registra la app.
// 3. Firebase te dará un objeto firebaseConfig como el de abajo.
//    Copia TUS valores reales y pégalos aquí, reemplazando los de ejemplo.
// 4. En la consola de Firebase, activa:
//    - Authentication → Sign-in method → Email/Password (habilitar)
//    - Authentication → Users → Add user (crea TU único usuario, con
//      tu correo y una contraseña fuerte). Esta app NO permite
//      auto-registro: solo el correo que tú crees aquí podrá entrar.
//    - Firestore Database → Create database (modo producción)
// 5. IMPORTANTE — Reglas de seguridad de Firestore (Fase 2 en adelante):
//    Ve a Firestore → Rules y pega esto para que SOLO tu cuenta
//    autenticada pueda leer/escribir datos (nadie más, aunque tenga
//    la URL pública de GitHub Pages):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /{document=**} {
//          allow read, write: if request.auth != null
//                              && request.auth.token.email == "TU_CORREO_AQUI@gmail.com";
//        }
//      }
//    }
//
//    Esto es lo que hace que "solo para mi uso" sea cierto a nivel de
//    servidor, no solo a nivel de interfaz.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⬇️ REEMPLAZA con los valores de TU proyecto de Firebase ⬇️
const firebaseConfig = {
  apiKey: "AIzaSyDv7kYRAPrWRDH7j-hWj8WKMNWnL0sm2JE",
  authDomain: "carpeta-digitalhl.firebaseapp.com",
  projectId: "carpeta-digitalhl",
  storageBucket: "carpeta-digitalhl.firebasestorage.app",
  messagingSenderId: "13511526310",
  appId: "1:13511526310:web:cebf45e5db3c6ec439f167"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
