// ============================================================
// FIREBASE — Configuración e inicialización
// ============================================================
// Reglas de seguridad de Firestore (publicadas en la consola real):
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if request.auth != null
//                           && request.auth.token.email == "de128954@miescuela.pr";
//     }
//     match /estudiantes/{estudianteId} {
//       allow read: if request.auth != null
//                   && request.auth.token.firebase.sign_in_provider == 'anonymous';
//     }
//     match /perfiles_estudiantes/{perfilId} {
//       allow create: if request.auth != null
//                     && request.auth.token.firebase.sign_in_provider == 'anonymous';
//     }
//   }
// }
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
