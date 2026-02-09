import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  doc,
  getFirestore,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const config = window.APP_CONFIG;

if (!config?.firebaseConfig || !config?.firestorePath) {
  throw new Error("Configuração ausente. Preencha config.js.");
}

const app = initializeApp(config.firebaseConfig);
const db = getFirestore(app);
const profileRef = doc(db, config.firestorePath);

const el = {
  title: document.getElementById("title"),
  avatar: document.getElementById("avatar"),
  name: document.getElementById("name"),
  username: document.getElementById("username"),
  bio: document.getElementById("bio"),
  repos: document.getElementById("repos"),
  followers: document.getElementById("followers"),
  following: document.getElementById("following"),
  githubUpdated: document.getElementById("githubUpdated"),
  syncedAt: document.getElementById("syncedAt"),
  status: document.getElementById("status")
};

function formatDate(value) {
  if (!value) return "-";

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function updateUI(data) {
  el.title.textContent = `GitHub Profile: ${data.login ?? config.githubUsername}`;
  el.avatar.src = data.avatarUrl ?? "";
  el.name.textContent = data.name ?? "Sem nome";
  el.username.textContent = `@${data.login ?? config.githubUsername}`;
  el.username.href = data.htmlUrl ?? `https://github.com/${config.githubUsername}`;
  el.bio.textContent = data.bio ?? "Sem bio informada.";
  el.repos.textContent = String(data.publicRepos ?? 0);
  el.followers.textContent = String(data.followers ?? 0);
  el.following.textContent = String(data.following ?? 0);
  el.githubUpdated.textContent = formatDate(data.githubUpdatedAt);
  el.syncedAt.textContent = formatDate(data.syncedAt);
}

onSnapshot(
  profileRef,
  (snapshot) => {
    if (!snapshot.exists()) {
      el.status.textContent = "Aguardando primeira sincronização...";
      return;
    }

    updateUI(snapshot.data());
    el.status.textContent = "Online";
  },
  (error) => {
    el.status.textContent = "Erro";
    console.error("Erro Firestore:", error);
  }
);
