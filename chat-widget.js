import { auth, db } from "./firebase-client.js";
import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const LS = {
  visitorName: "chat_visitor_name_v1",
  chatId: "chat_id_v1"
};

const ui = {
  root: document.getElementById("chatbot"),
  toggleBtn: document.getElementById("chat-toggle-btn"),
  popup: document.getElementById("chat-popup"),
  nameForm: document.getElementById("name-form"),
  chatArea: document.getElementById("chat-area"),
  nameInput: document.getElementById("name-input"),
  chatHeader: document.getElementById("chat-header"),
  chatMessages: document.getElementById("chat-messages"),
  chatInput: document.getElementById("chat-input"),
  sendBtn: document.getElementById("chat-send-btn")
};

if (!ui.root) {
  // Chat widget nao esta no HTML.
  // Nao falhar a pagina.
  // eslint-disable-next-line no-console
  console.warn("Chat widget nao encontrado no DOM.");
}

let currentUid = null;
let currentChatId = null;
let unsubscribeMessages = null;

function getOrCreateChatId() {
  const saved = localStorage.getItem(LS.chatId);
  if (saved) return saved;

  const id = (globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`).toString();
  localStorage.setItem(LS.chatId, id);
  return id;
}

function scrollMessagesToBottom() {
  if (!ui.chatMessages) return;
  ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
}

function renderSystemMessage(text) {
  if (!ui.chatMessages) return;

  const div = document.createElement("div");
  div.className = "message system-message";
  div.innerHTML = `<div class="message-content"><strong>Sistema:</strong> ${escapeHtml(text)}</div>`;
  ui.chatMessages.appendChild(div);
  scrollMessagesToBottom();
}

function renderMessage(msg) {
  if (!ui.chatMessages) return;

  const mine = msg.sender === "visitor";
  const div = document.createElement("div");
  div.className = `message ${mine ? "visitor-message" : "admin-message"}`;
  const label = mine ? "Voce" : "Admin";
  div.innerHTML = `
    <div class="message-content">
      <strong>${label}:</strong> ${escapeHtml(msg.text || "")}
    </div>
  `;
  ui.chatMessages.appendChild(div);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function openChat() {
  if (!ui.popup) return;
  ui.popup.classList.remove("hidden");

  if (ui.nameForm?.style.display !== "none") {
    ui.nameInput?.focus();
  } else {
    ui.chatInput?.focus();
  }
}

function closeChat() {
  if (!ui.popup) return;
  ui.popup.classList.add("hidden");
}

function toggleChat() {
  if (!ui.popup) return;
  const hidden = ui.popup.classList.contains("hidden");
  if (hidden) openChat();
  else closeChat();
}

async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

async function setVisitorName(name) {
  const trimmed = String(name || "").trim();
  if (trimmed.length < 2) throw new Error("Digite um nome com pelo menos 2 caracteres.");

  localStorage.setItem(LS.visitorName, trimmed);
  currentChatId = getOrCreateChatId();

  const user = await ensureAnonymousAuth();
  currentUid = user.uid;

  // Criar/atualizar chat (documento raiz)
  await setDoc(
    doc(db, "chats", currentChatId),
    {
      chatId: currentChatId,
      visitorUid: currentUid,
      visitorName: trimmed,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: "Inicio do chat",
      unreadForAdmin: 0,
      unreadForVisitor: 0
    },
    { merge: true }
  );

  // UI
  if (ui.nameForm) ui.nameForm.style.display = "none";
  if (ui.chatArea) ui.chatArea.style.display = "block";
  if (ui.chatHeader) ui.chatHeader.innerHTML = `Chat - ${escapeHtml(trimmed)}`;

  subscribeToMessages();
  renderSystemMessage(`Ola ${trimmed}! Suas mensagens chegam em tempo real. Como posso ajudar?`);
}

function subscribeToMessages() {
  if (!currentChatId) return;
  if (unsubscribeMessages) unsubscribeMessages();

  if (ui.chatMessages) ui.chatMessages.innerHTML = "";

  const q = query(
    collection(db, "chats", currentChatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  unsubscribeMessages = onSnapshot(
    q,
    (snapshot) => {
      if (!ui.chatMessages) return;

      ui.chatMessages.innerHTML = "";
      snapshot.forEach((docSnap) => {
        renderMessage(docSnap.data());
      });
      scrollMessagesToBottom();
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("Erro listener chat:", error);
      renderSystemMessage("Falha ao conectar ao chat. Tente recarregar a pagina.");
    }
  );
}

async function sendVisitorMessage() {
  const name = localStorage.getItem(LS.visitorName) || "";
  if (!name) {
    renderSystemMessage("Defina seu nome antes de enviar mensagens.");
    return;
  }

  const text = (ui.chatInput?.value || "").trim();
  if (!text) return;
  ui.chatInput.value = "";

  await ensureAnonymousAuth();
  currentChatId = getOrCreateChatId();

  const msg = {
    sender: "visitor",
    text,
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "chats", currentChatId, "messages"), msg);
  await setDoc(
    doc(db, "chats", currentChatId),
    {
      lastMessageAt: serverTimestamp(),
      lastMessageText: text,
      unreadForAdmin: 1
    },
    { merge: true }
  );
}

function hydrateFromStorage() {
  const name = localStorage.getItem(LS.visitorName);
  if (name) {
    currentChatId = getOrCreateChatId();
    if (ui.nameForm) ui.nameForm.style.display = "none";
    if (ui.chatArea) ui.chatArea.style.display = "block";
    if (ui.chatHeader) ui.chatHeader.innerHTML = `Chat - ${escapeHtml(name)}`;
    subscribeToMessages();
  }
}

function wireUi() {
  if (!ui.toggleBtn) return;

  ui.toggleBtn.addEventListener("click", toggleChat);
  ui.sendBtn?.addEventListener("click", sendVisitorMessage);

  ui.nameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      setVisitorName(ui.nameInput.value).catch((err) => renderSystemMessage(err.message));
    }
  });

  ui.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendVisitorMessage().catch((err) => renderSystemMessage(err.message));
    }
  });
}

// Expor funcoes globais (compatibilidade com HTML estilo exemplo)
window.toggleChat = toggleChat;
window.setUserName = () => setVisitorName(ui.nameInput?.value).catch((err) => renderSystemMessage(err.message));
window.sendMessage = () => sendVisitorMessage().catch((err) => renderSystemMessage(err.message));

wireUi();
hydrateFromStorage();

onAuthStateChanged(auth, (user) => {
  currentUid = user?.uid || null;
});

