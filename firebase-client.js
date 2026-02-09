import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const cfg = window.APP_CONFIG?.firebaseConfig;
if (!cfg?.apiKey || !cfg?.projectId) {
  throw new Error("Firebase config ausente. Verifique config.js (firebaseConfig).");
}

const app = getApps().length ? getApps()[0] : initializeApp(cfg);

export const auth = getAuth(app);
export const db = getFirestore(app);

