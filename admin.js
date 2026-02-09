import { auth, db } from "./firebase-client.js";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
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

const adminEmails = Array.isArray(window.APP_CONFIG?.adminEmails) ? window.APP_CONFIG.adminEmails : [];

const ui = {
  adminStatus: document.getElementById("adminStatus"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  chatsList: document.getElementById("chatsList"),
  chatsCountNote: document.getElementById("chatsCountNote"),
  convoTitle: document.getElementById("convoTitle"),
  convoSub: document.getElementById("convoSub"),
  messagesList: document.getElementById("messagesList"),
  replyInput: document.getElementById("replyInput"),
  sendReplyBtn: document.getElementById("sendReplyBtn")
};

let currentChatId = null;
let unsubscribeChats = null;
let unsubscribeMessages = null;

function setStatus(text) {
  ui.adminStatus.textContent = text;
}

function isAdminUser(user) {
  const email = user?.email || "";
  return adminEmails.includes(email);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChats(chats) {
  ui.chatsList.innerHTML = "";
  ui.chatsCountNote.textContent = `${chats.length} chat(s)`;

  if (!chats.length) {
    ui.chatsList.innerHTML = "<p class='section-note'>Nenhum chat encontrado.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();
  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = `admin-chat-item ${currentChatId === chat.chatId ? "active" : ""}`;
    item.addEventListener("click", () => selectChat(chat.chatId, chat.visitorName));

    const title = document.createElement("p");
    title.className = "admin-chat-title";
    title.textContent = chat.visitorName || chat.chatId;

    const sub = document.createElement("p");
    sub.className = "admin-chat-sub";
    sub.textContent = chat.lastMessageText ? chat.lastMessageText : "Sem mensagens";

    item.append(title, sub);
    fragment.appendChild(item);
  });

  ui.chatsList.appendChild(fragment);
}

function renderMessages(messages) {
  ui.messagesList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = `admin-msg ${m.sender === "admin" ? "admin" : "visitor"}`;
    const who = m.sender === "admin" ? "Admin" : "Visitante";
    div.innerHTML = `<div class="message-content"><strong>${who}:</strong> ${escapeHtml(m.text || "")}</div>`;
    fragment.appendChild(div);
  });

  ui.messagesList.appendChild(fragment);
  ui.messagesList.scrollTop = ui.messagesList.scrollHeight;
}

function subscribeChats() {
  if (unsubscribeChats) unsubscribeChats();

  const q = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"), limit(50));
  unsubscribeChats = onSnapshot(
    q,
    (snapshot) => {
      const chats = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        chats.push({
          chatId: docSnap.id,
          visitorName: data.visitorName || "",
          lastMessageText: data.lastMessageText || ""
        });
      });
      renderChats(chats);
    },
    (error) => {
      console.error("Erro chats:", error);
      setStatus("Erro ao carregar chats.");
    }
  );
}

function subscribeMessages(chatId) {
  if (unsubscribeMessages) unsubscribeMessages();

  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(200));
  unsubscribeMessages = onSnapshot(
    q,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((docSnap) => messages.push(docSnap.data()));
      renderMessages(messages);
    },
    (error) => {
      console.error("Erro messages:", error);
      setStatus("Erro ao carregar mensagens.");
    }
  );
}

async function selectChat(chatId, visitorName) {
  currentChatId = chatId;
  ui.convoTitle.textContent = `Chat: ${visitorName || chatId}`;
  ui.convoSub.textContent = chatId;
  subscribeMessages(chatId);

  // Marcar como lido para admin
  await setDoc(doc(db, "chats", chatId), { unreadForAdmin: 0 }, { merge: true });
}

async function sendAdminMessage() {
  if (!currentChatId) return;

  const text = (ui.replyInput.value || "").trim();
  if (!text) return;
  ui.replyInput.value = "";

  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    sender: "admin",
    text,
    createdAt: serverTimestamp()
  });

  await setDoc(
    doc(db, "chats", currentChatId),
    {
      lastMessageAt: serverTimestamp(),
      lastMessageText: text,
      unreadForVisitor: 1
    },
    { merge: true }
  );
}

async function doGoogleLogin() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

function clearUi() {
  ui.chatsList.innerHTML = "";
  ui.messagesList.innerHTML = "";
  ui.chatsCountNote.textContent = "-";
  ui.convoTitle.textContent = "Selecione um chat";
  ui.convoSub.textContent = "-";
  currentChatId = null;
}

ui.signInBtn.addEventListener("click", () => doGoogleLogin().catch((e) => setStatus(`Falha no login: ${e.message}`)));
ui.signOutBtn.addEventListener("click", () => signOut(auth).catch((e) => setStatus(`Falha no logout: ${e.message}`)));
ui.sendReplyBtn.addEventListener("click", () => sendAdminMessage().catch((e) => setStatus(`Falha ao enviar: ${e.message}`)));
ui.replyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendAdminMessage().catch((err) => setStatus(`Falha ao enviar: ${err.message}`));
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    setStatus("Nao autenticado. Entre com Google.");
    ui.signInBtn.style.display = "";
    ui.signOutBtn.style.display = "none";
    if (unsubscribeChats) unsubscribeChats();
    if (unsubscribeMessages) unsubscribeMessages();
    clearUi();
    return;
  }

  if (!isAdminUser(user)) {
    setStatus(`Usuario ${user.email || "(sem email)"} nao autorizado. Ajuste APP_CONFIG.adminEmails em config.js.`);
    ui.signInBtn.style.display = "none";
    ui.signOutBtn.style.display = "";
    if (unsubscribeChats) unsubscribeChats();
    if (unsubscribeMessages) unsubscribeMessages();
    clearUi();
    return;
  }

  setStatus(`Logado como ${user.email}.`);
  ui.signInBtn.style.display = "none";
  ui.signOutBtn.style.display = "";
  subscribeChats();
});

