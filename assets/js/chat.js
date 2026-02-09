// Chat System - Gerencia mensagens no Firestore
import { 
    initializeApp, 
    getApps 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    updateDoc, 
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
  authDomain: "mikaelfmts.firebaseapp.com",
  projectId: "mikaelfmts",
  storageBucket: "mikaelfmts.firebasestorage.app",
  messagingSenderId: "516762612351",
  appId: "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Classe para gerenciar o chat
export class ChatManager {
    constructor() {
        this.listeners = [];
    }

    // Enviar mensagem do visitante
    async sendMessage(nome, mensagem) {
        try {
            // Gerar chat_id único (hash do nome + timestamp)
            const chatId = `${nome.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
            
            const docRef = await addDoc(collection(db, 'mensagens'), {
                chat_id: chatId,
                nome: nome,
                mensagem: mensagem,
                hora: serverTimestamp(),
                respondido: false,
                resposta: null,
                horaResposta: null
            });

            console.log('Mensagem enviada com ID:', docRef.id);
            return {
                success: true,
                messageId: docRef.id,
                chatId: chatId
            };
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Carregar todos os chats (para o admin)
    onChatsLoad(callback) {
        try {
            const messagesRef = collection(db, 'mensagens');
            const q = query(messagesRef);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log('Snapshot recebido:', snapshot.docs.length, 'documentos');
                
                const chatsMap = new Map();
                const allMessages = [];

                snapshot.forEach((doc) => {
                    allMessages.push({ data: doc.data(), id: doc.id });
                });

                console.log('Total de mensagens:', allMessages.length);

                // Ordenar por hora
                allMessages.sort((a, b) => {
                    const horaA = a.data.hora ? (typeof a.data.hora.toDate === 'function' ? a.data.hora.toDate().getTime() : 0) : 0;
                    const horaB = b.data.hora ? (typeof b.data.hora.toDate === 'function' ? b.data.hora.toDate().getTime() : 0) : 0;
                    return horaB - horaA;
                });

                // Processar mensagens
                allMessages.forEach((message) => {
                    const data = message.data;
                    const chatId = data.chat_id;

                    if (!chatsMap.has(chatId)) {
                        chatsMap.set(chatId, {
                            chatId: chatId,
                            nome: data.nome,
                            ultimaMensagem: data.mensagem,
                            ultimaHora: data.hora,
                            mensagensNaoRespondidas: 0,
                            totalMensagens: 0
                        });
                    }

                    const chat = chatsMap.get(chatId);
                    chat.totalMensagens++;

                    if (!data.respondido) {
                        chat.mensagensNaoRespondidas++;
                    }

                    if (!chat.ultimaHora || data.hora > chat.ultimaHora) {
                        chat.ultimaMensagem = data.mensagem;
                        chat.ultimaHora = data.hora;
                    }
                });

                const chatsArray = Array.from(chatsMap.values());
                console.log('Chats mapeados:', chatsArray);
                callback(chatsArray);
            }, (error) => {
                console.error('Erro ao carregar chats:', error);
            });

            this.listeners.push(unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erro ao configurar listener de chats:', error);
        }
    }

    // Carregar mensagens de um chat específico
    onChatMessagesLoad(chatId, callback) {
        try {
            const messagesRef = collection(db, 'mensagens');
            const q = query(
                messagesRef,
                where('chat_id', '==', chatId)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messages = [];
                snapshot.forEach((doc) => {
                    messages.push({ id: doc.id, ...doc.data() });
                });

                console.log('Mensagens carregadas para chat', chatId, ':', messages.length);

                // Ordenar por hora
                messages.sort((a, b) => {
                    const horaA = a.hora ? (typeof a.hora.toDate === 'function' ? a.hora.toDate().getTime() : 0) : 0;
                    const horaB = b.hora ? (typeof b.hora.toDate === 'function' ? b.hora.toDate().getTime() : 0) : 0;
                    return horaA - horaB;
                });

                callback(messages);
            }, (error) => {
                console.error('Erro ao carregar mensagens:', error);
            });

            this.listeners.push(unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Erro ao configurar listener de mensagens:', error);
        }
    }

    // Responder mensagem (apenas admin)
    async respondMessage(messageId, resposta) {
        try {
            console.log('Respondendo mensagem:', messageId);
            const messageRef = doc(db, 'mensagens', messageId);
            await updateDoc(messageRef, {
                resposta: resposta,
                respondido: true,
                horaResposta: serverTimestamp()
            });

            console.log('Resposta enviada para mensagem:', messageId);
            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar resposta:', error);
            return { success: false, error: error.message };
        }
    }

    // Limpar listeners
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
}

export default ChatManager;
