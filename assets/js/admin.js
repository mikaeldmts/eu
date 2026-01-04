// ==================== IMPORTS DO FIREBASE ====================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
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
    deleteDoc,
    enableNetwork,
    disableNetwork,
    setDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { checkAuth, doLogout } from './auth.js';

// Configuração do Firebase - definida diretamente para evitar problemas de importação
const firebaseConfig = {
  apiKey: "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
  authDomain: "mikaelfmts.firebaseapp.com",
  projectId: "mikaelfmts",
  storageBucket: "mikaelfmts.appspot.com",
  messagingSenderId: "516762612351",
  appId: "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase Admin carregado com sucesso!');

// ==================== EXPORTAR FUNÇÕES PARA USO GLOBAL ====================
// Como estamos usando módulos ES6, precisamos exportar explicitamente as funções
window.showSection = showSection;
window.refreshChats = refreshChats;
window.selectChat = selectChat;
window.openResponseModal = openResponseModal;
window.closeResponseModal = closeResponseModal;
window.sendResponse = sendResponse;
window.doLogout = doLogout;
window.openCertificateModal = openCertificateModal;
window.closeCertificateModal = closeCertificateModal;
window.saveCertificate = saveCertificate;
window.editCertificate = editCertificate;
window.deleteCertificate = deleteCertificate;
window.toggleMaintenance = toggleMaintenance;
window.loadMaintenanceStatus = loadMaintenanceStatus;

// ==================== ADMIN PANEL JAVASCRIPT ====================

// Variáveis globais
let currentChatId = null;
let currentMessageId = null;
let chatsData = {};
let messagesListener = null;
let currentUser = null;
let currentCertificateId = null;
let certificatesData = {};
let maintenanceData = null;

// Aguardar carregamento completo e verificar autenticação
window.addEventListener('load', async function() {
    console.log('Admin panel carregado, verificando autenticação...');
    
    try {
        // Verificar se o usuário está autenticado
        currentUser = await checkAuth();
        console.log('Usuário autenticado:', currentUser.email);
        
        // Atualizar interface com informações do usuário
        document.querySelector('.text-sm').textContent = currentUser.email;
        
        // Adicionar botão de logout
        const headerRight = document.querySelector('.flex.items-center.space-x-4');
        const logoutButton = document.createElement('button');
        logoutButton.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt mr-2"></i>Sair';
        logoutButton.onclick = doLogout;
        headerRight.appendChild(logoutButton);          // Carregar os chats
        loadChats();
          // Carregar os certificados
        loadCertificates();
          // Carregar status de manutenção
        loadMaintenanceStatusWithFallback();
          // Carregar configurações de páginas
        loadPageSettings();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        // O redirecionamento já foi feito em checkAuth
    }
});

// ==================== NAVEGAÇÃO ====================

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostrar seção selecionada
    document.getElementById(`section-${sectionName}`).classList.remove('hidden');
    
    // Atualizar tabs
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active', 'bg-blue-500', 'text-white');
        tab.classList.add('bg-gray-300', 'text-gray-700');
    });
    
    document.getElementById(`tab-${sectionName}`).classList.add('active', 'bg-blue-500', 'text-white');
    document.getElementById(`tab-${sectionName}`).classList.remove('bg-gray-300', 'text-gray-700');
      // Carregar dados específicos da seção
    if (sectionName === 'certificates') {
        loadCertificates();    } else if (sectionName === 'maintenance') {
        loadMaintenanceStatusWithFallback();
    }
}

// ==================== GESTÃO DE CHATS ====================

async function loadChats() {
    try {
        const messagesRef = collection(db, 'mensagens');
        const q = query(messagesRef);
        
        onSnapshot(q, (snapshot) => {
            const chatsMap = new Map();
            const allMessages = [];
            
            // Coletar todas as mensagens
            snapshot.forEach((doc) => {
                allMessages.push({ data: doc.data(), id: doc.id });
            });
            
            // Ordenar por hora em JavaScript
            allMessages.sort((a, b) => {
                const horaA = a.data.hora;
                const horaB = b.data.hora;
                
                let timestampA, timestampB;
                
                if (horaA && typeof horaA.toDate === 'function') {
                    timestampA = horaA.toDate().getTime();
                } else if (horaA instanceof Date) {
                    timestampA = horaA.getTime();
                } else {
                    timestampA = 0;
                }
                
                if (horaB && typeof horaB.toDate === 'function') {
                    timestampB = horaB.toDate().getTime();
                } else if (horaB instanceof Date) {
                    timestampB = horaB.getTime();
                } else {
                    timestampB = 0;
                }
                
                return timestampB - timestampA; // Ordem decrescente
            });
            
            // Processar mensagens ordenadas
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
                
                // Atualizar com a mensagem mais recente
                if (!chat.ultimaHora || data.hora > chat.ultimaHora) {
                    chat.ultimaMensagem = data.mensagem;
                    chat.ultimaHora = data.hora;
                }
            });
            
            chatsData = Object.fromEntries(chatsMap);
            displayChats(Array.from(chatsMap.values()));
        });
        
    } catch (error) {
        console.error('Erro ao carregar chats:', error);
        showError('Erro ao carregar chats');
    }
}

function displayChats(chats) {
    const chatsList = document.getElementById('chats-list');
    const loadingChats = document.getElementById('loading-chats');
    const noChats = document.getElementById('no-chats');
    
    loadingChats.classList.add('hidden');
    
    if (chats.length === 0) {
        noChats.classList.remove('hidden');
        chatsList.classList.add('hidden');
        return;
    }
    
    noChats.classList.add('hidden');
    chatsList.classList.remove('hidden');
    
    // Ordenar por mensagens não respondidas primeiro, depois por data
    chats.sort((a, b) => {
        if (a.mensagensNaoRespondidas !== b.mensagensNaoRespondidas) {
            return b.mensagensNaoRespondidas - a.mensagensNaoRespondidas;
        }
        return new Date(b.ultimaHora.toDate()) - new Date(a.ultimaHora.toDate());
    });
    
    chatsList.innerHTML = chats.map(chat => {
        const ultimaHora = chat.ultimaHora ? new Date(chat.ultimaHora.toDate()).toLocaleString() : 'Sem data';
        const badgeClass = chat.mensagensNaoRespondidas > 0 ? 'bg-red-500' : 'bg-green-500';
        
        return `
            <div class="chat-card border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${currentChatId === chat.chatId ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}" 
                 onclick="selectChat('${chat.chatId}')">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-800 truncate">${chat.nome}</h4>
                    <span class="text-xs px-2 py-1 rounded-full text-white ${badgeClass}">
                        ${chat.mensagensNaoRespondidas}
                    </span>
                </div>
                <p class="text-sm text-gray-600 truncate mb-2">${chat.ultimaMensagem}</p>
                <div class="flex justify-between text-xs text-gray-400">
                    <span>${ultimaHora}</span>
                    <span>${chat.totalMensagens} mensagens</span>
                </div>
            </div>
        `;
    }).join('');
}

async function selectChat(chatId) {
    currentChatId = chatId;
    
    // Atualizar visual da seleção
    document.querySelectorAll('.chat-card').forEach(card => {
        card.classList.remove('bg-blue-50', 'border-blue-300');
        card.classList.add('border-gray-200');
    });
    
    // Encontrar o card do chat selecionado pelo seu chatId (mais robusto que usar event.target)
    const selectedCard = document.querySelector(`.chat-card[onclick*="${chatId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('bg-blue-50', 'border-blue-300');
        selectedCard.classList.remove('border-gray-200');
    }
    
    // Mostrar área de conversa
    document.getElementById('no-chat-selected').classList.add('hidden');
    document.getElementById('chat-conversation').classList.remove('hidden');
    
    // Atualizar título
    const chatData = chatsData[chatId];
    document.getElementById('chat-title').textContent = `Chat com ${chatData.nome}`;
    document.getElementById('chat-info').textContent = `${chatData.totalMensagens} mensagens • ${chatData.mensagensNaoRespondidas} não respondidas`;
    
    // Carregar mensagens
    loadChatMessages(chatId);
}

async function loadChatMessages(chatId) {
    try {
        if (messagesListener) {
            messagesListener();
        }
        
        const messagesRef = collection(db, 'mensagens');
        const q = query(
            messagesRef,
            where('chat_id', '==', chatId)
        );
          messagesListener = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            
            // Ordenar mensagens por hora em JavaScript
            messages.sort((a, b) => {
                const horaA = a.hora;
                const horaB = b.hora;
                
                let timestampA, timestampB;
                
                if (horaA && typeof horaA.toDate === 'function') {
                    timestampA = horaA.toDate().getTime();
                } else if (horaA instanceof Date) {
                    timestampA = horaA.getTime();
                } else {
                    timestampA = 0;
                }
                
                if (horaB && typeof horaB.toDate === 'function') {
                    timestampB = horaB.toDate().getTime();
                } else if (horaB instanceof Date) {
                    timestampB = horaB.getTime();
                } else {
                    timestampB = 0;
                }
                
                return timestampA - timestampB; // Ordem crescente (mais antigas primeiro)
            });
            
            displayMessages(messages);
        });
        
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        showError('Erro ao carregar mensagens');
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    
    container.innerHTML = messages.map(message => {
        const hora = message.hora ? new Date(message.hora.toDate()).toLocaleTimeString() : 'Sem hora';
        const responded = message.respondido;
        
        return `
            <div class="mb-4">
                <!-- Mensagem do usuário -->
                <div class="flex justify-end mb-2">
                    <div class="message-bubble user-message bg-blue-500 text-white p-3 rounded-lg">
                        <p class="text-sm">${message.mensagem}</p>
                        <p class="text-xs opacity-75 mt-1">${hora}</p>
                    </div>
                </div>
                  <!-- Resposta do Mikael (se existir) -->
                ${message.resposta ? `
                    <div class="flex justify-start mb-2">
                        <div class="message-bubble admin-message bg-gray-200 text-gray-800 p-3 rounded-lg">
                            <p class="text-sm">${message.resposta}</p>
                            <p class="text-xs text-gray-500 mt-1">Respondido</p>
                        </div>
                    </div>
                ` : `
                    <div class="flex justify-start">
                        <button onclick="openResponseModal('${message.id}', '${message.mensagem.replace(/'/g, "\\'")}', '${message.nome}')" 
                                class="text-blue-500 hover:text-blue-700 text-sm font-medium transition">
                            <i class="fas fa-reply mr-1"></i>Responder
                        </button>
                    </div>
                `}
            </div>
        `;
    }).join('');
    
    // Scroll para o final
    container.scrollTop = container.scrollHeight;
}

// ==================== MODAL DE RESPOSTA ====================

function openResponseModal(messageId, originalMessage, userName) {
    currentMessageId = messageId;
    
    document.getElementById('original-message').textContent = originalMessage;
    document.getElementById('response-text').value = '';
    document.getElementById('response-modal').classList.remove('hidden');
    
    // Focar no textarea
    setTimeout(() => {
        document.getElementById('response-text').focus();
    }, 100);
}

function closeResponseModal() {
    document.getElementById('response-modal').classList.add('hidden');
    currentMessageId = null;
}

async function sendResponse() {
    const responseText = document.getElementById('response-text').value.trim();
    
    if (!responseText) {
        alert('Por favor, digite uma resposta!');
        return;
    }
    
    if (!currentMessageId) {
        alert('Erro: ID da mensagem não encontrado!');
        return;
    }
    
    try {
        const messageRef = doc(db, 'mensagens', currentMessageId);
        
        await updateDoc(messageRef, {
            resposta: responseText,
            respondido: true,
            horaResposta: new Date()
        });
        
        closeResponseModal();
        showSuccess('Resposta enviada com sucesso!');
        
        // Recarregar chats para atualizar contadores
        loadChats();
        
    } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        showError('Erro ao enviar resposta');
    }
}

// ==================== GESTÃO DE CERTIFICADOS ====================

async function loadCertificates() {
    try {
        const certificatesRef = collection(db, 'certificados');
        const q = query(certificatesRef);
        
        onSnapshot(q, (snapshot) => {
            const certificates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Ordenar certificados por data de conclusão em JavaScript
            certificates.sort((a, b) => {
                const dateA = a.dataConclusao;
                const dateB = b.dataConclusao;
                
                let timestampA, timestampB;
                
                if (dateA && typeof dateA.toDate === 'function') {
                    timestampA = dateA.toDate().getTime();
                } else if (dateA instanceof Date) {
                    timestampA = dateA.getTime();
                } else if (typeof dateA === 'string') {
                    timestampA = new Date(dateA).getTime();
                } else {
                    timestampA = 0;
                }
                
                if (dateB && typeof dateB.toDate === 'function') {
                    timestampB = dateB.toDate().getTime();
                } else if (dateB instanceof Date) {
                    timestampB = dateB.getTime();
                } else if (typeof dateB === 'string') {
                    timestampB = new Date(dateB).getTime();
                } else {
                    timestampB = 0;
                }
                
                return timestampB - timestampA; // Ordem decrescente (mais recentes primeiro)
            });
            
            certificatesData = certificates.reduce((acc, cert) => {
                acc[cert.id] = cert;
                return acc;
            }, {});
            
            displayCertificates(certificates);
        });
        
    } catch (error) {
        console.error('Erro ao carregar certificados:', error);
        showError('Erro ao carregar certificados');
    }
}

function displayCertificates(certificates) {
    const certificatesList = document.getElementById('certificates-list');
    const loadingCertificates = document.getElementById('loading-certificates');
    const noCertificates = document.getElementById('no-certificates');
    
    loadingCertificates.classList.add('hidden');
    
    if (certificates.length === 0) {
        noCertificates.classList.remove('hidden');
        certificatesList.classList.add('hidden');
        return;
    }
    
    noCertificates.classList.add('hidden');
    certificatesList.classList.remove('hidden');
    
    certificatesList.innerHTML = certificates.map(cert => {
        const statusColor = cert.status === 'concluido' ? 'bg-green-500' : 'bg-yellow-500';
        const statusText = cert.status === 'concluido' ? 'Concluído' : 'Em Progresso';
        
        return `
            <div class="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="font-semibold text-gray-800 text-lg">${cert.titulo}</h3>
                    <span class="text-xs px-2 py-1 rounded-full text-white ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                
                <p class="text-gray-600 mb-2">${cert.instituicao}</p>
                
                ${cert.dataConclusao ? `
                    <p class="text-sm text-gray-500 mb-4">
                        ${cert.status === 'concluido' ? 'Concluído em:' : 'Previsão:'} ${cert.dataConclusao}
                    </p>
                ` : ''}
                
                ${cert.certificadoUrl ? `
                    <a href="${cert.certificadoUrl}" target="_blank" class="text-blue-600 hover:underline text-sm block mb-4">
                        <i class="fas fa-external-link-alt mr-1"></i>Ver Certificado
                    </a>
                ` : ''}
                
                <div class="flex justify-end space-x-2">
                    <button onclick="editCertificate('${cert.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button onclick="deleteCertificate('${cert.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition">
                        <i class="fas fa-trash mr-1"></i>Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openCertificateModal(certificateId = null) {
    const modal = document.getElementById('certificate-modal');
    const modalTitle = document.getElementById('certificate-modal-title');
    const form = document.getElementById('certificate-form');
    
    currentCertificateId = certificateId;
    
    if (certificateId && certificatesData[certificateId]) {
        // Editar certificado existente
        const cert = certificatesData[certificateId];
        modalTitle.textContent = 'Editar Certificado';
        
        document.getElementById('cert-titulo').value = cert.titulo || '';
        document.getElementById('cert-instituicao').value = cert.instituicao || '';
        document.getElementById('cert-data').value = cert.dataConclusao || '';
        document.getElementById('cert-status').value = cert.status || '';
        document.getElementById('cert-url').value = cert.certificadoUrl || '';
    } else {
        // Novo certificado
        modalTitle.textContent = 'Adicionar Certificado';
        form.reset();
    }
    
    modal.classList.remove('hidden');
}

function closeCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    const form = document.getElementById('certificate-form');
    
    modal.classList.add('hidden');
    form.reset();
    currentCertificateId = null;
}

async function saveCertificate() {
    try {
        const titulo = document.getElementById('cert-titulo').value.trim();
        const instituicao = document.getElementById('cert-instituicao').value.trim();
        const dataConclusao = document.getElementById('cert-data').value;
        const status = document.getElementById('cert-status').value;
        const certificadoUrl = document.getElementById('cert-url').value.trim();
        
        if (!titulo || !instituicao || !status) {
            showError('Por favor, preencha todos os campos obrigatórios');
            return;
        }
        
        const certificateData = {
            titulo,
            instituicao,
            dataConclusao,
            status,
            certificadoUrl,
            updatedAt: new Date()
        };
        
        if (currentCertificateId) {
            // Atualizar certificado existente
            await updateDoc(doc(db, 'certificados', currentCertificateId), certificateData);
            showSuccess('Certificado atualizado com sucesso!');
        } else {
            // Criar novo certificado
            await addDoc(collection(db, 'certificados'), {
                ...certificateData,
                createdAt: new Date()
            });
            showSuccess('Certificado adicionado com sucesso!');
        }
        
        closeCertificateModal();
        
    } catch (error) {
        console.error('Erro ao salvar certificado:', error);
        showError('Erro ao salvar certificado');
    }
}

function editCertificate(certificateId) {
    openCertificateModal(certificateId);
}

async function deleteCertificate(certificateId) {
    if (!confirm('Tem certeza que deseja excluir este certificado?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'certificados', certificateId));
        showSuccess('Certificado excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir certificado:', error);
        showError('Erro ao excluir certificado');
    }
}

// ==================== FALLBACK LOCAL STORAGE ====================

// Funções para fallback usando localStorage
function saveMaintenanceToLocal(data) {
    try {
        localStorage.setItem('maintenanceStatus', JSON.stringify(data));
        console.log('Status de manutenção salvo localmente:', data);
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
    }
}

function loadMaintenanceFromLocal() {
    try {
        const stored = localStorage.getItem('maintenanceStatus');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
    }
    
    // Retorna valor padrão
    return {
        ativo: false,
        titulo: 'Site em Manutenção',
        mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
        previsao: '',
        ultimaAtualizacao: new Date()
    };
}

// Versão alternativa que usa localStorage como fallback
async function loadMaintenanceStatusWithFallback() {
    console.log('Carregando status de manutenção...');
    
    try {
        const maintenanceRef = doc(db, 'configuracoes', 'manutencao');
        
        onSnapshot(maintenanceRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                maintenanceData = docSnapshot.data();
                console.log('Status carregado do Firebase:', maintenanceData);
                // Também salva localmente como backup
                saveMaintenanceToLocal(maintenanceData);
            } else {
                // Tentar carregar do localStorage
                maintenanceData = loadMaintenanceFromLocal();
                console.log('Status carregado do localStorage:', maintenanceData);
            }
            
            updateMaintenanceUI();
        }, (error) => {
            console.warn('Erro no Firebase, usando localStorage:', error);
            // Em caso de erro, usar localStorage
            maintenanceData = loadMaintenanceFromLocal();
            updateMaintenanceUI();
        });
        
    } catch (error) {
        console.warn('Erro ao conectar Firebase, usando localStorage:', error);
        maintenanceData = loadMaintenanceFromLocal();
        updateMaintenanceUI();
    }
}

// Versão alternativa do toggle que usa localStorage como fallback
async function toggleMaintenanceWithFallback() {
    try {
        // Verificar se maintenanceData está carregado
        if (!maintenanceData) {
            maintenanceData = loadMaintenanceFromLocal();
        }
        
        const novoStatus = !maintenanceData.ativo;
        console.log('Alterando status de manutenção para:', novoStatus);
        
        let dadosAtualizacao = {
            ativo: novoStatus,
            ultimaAtualizacao: new Date()
        };
        
        // Se estiver ativando manutenção, pegar os valores do formulário
        if (novoStatus) {
            const tituloInput = document.getElementById('maintenance-title');
            const mensagemInput = document.getElementById('maintenance-message');
            const previsaoInput = document.getElementById('maintenance-eta');
            
            dadosAtualizacao.titulo = tituloInput ? tituloInput.value.trim() || 'Site em Manutenção' : 'Site em Manutenção';
            dadosAtualizacao.mensagem = mensagemInput ? mensagemInput.value.trim() || 'Estamos realizando melhorias no site. Voltamos em breve!' : 'Estamos realizando melhorias no site. Voltamos em breve!';
            dadosAtualizacao.previsao = previsaoInput ? previsaoInput.value.trim() || '' : '';
        }
        
        // Tentar salvar no Firebase primeiro
        try {
            const maintenanceRef = doc(db, 'configuracoes', 'manutencao');
            await setDoc(maintenanceRef, dadosAtualizacao, { merge: true });
            console.log('Salvo no Firebase com sucesso');
        } catch (firebaseError) {
            console.warn('Erro ao salvar no Firebase, usando localStorage:', firebaseError);
        }
        
        // Sempre salvar localmente como backup
        maintenanceData = { ...maintenanceData, ...dadosAtualizacao };
        saveMaintenanceToLocal(maintenanceData);
        updateMaintenanceUI();
        
        showSuccess(novoStatus ? 'Site em manutenção ativado!' : 'Site reativado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao alterar status de manutenção:', error);
        showError('Erro ao alterar status de manutenção: ' + error.message);
    }
}

// Exportar versões com fallback
window.loadMaintenanceStatusWithFallback = loadMaintenanceStatusWithFallback;
window.toggleMaintenanceWithFallback = toggleMaintenanceWithFallback;

// ==================== CONTROLE GRANULAR DE PÁGINAS ====================

// Lista das páginas alvo para controle
const targetPages = [
    { id: 'index', name: 'Página Inicial', file: 'index.html' },
    { id: 'certificates-in-progress', name: 'Certificados em Progresso', file: 'certificates-in-progress.html' },
    { id: 'curriculum', name: 'Currículo', file: 'curriculum.html' },
    { id: 'games', name: 'Jogos', file: 'games.html' },
    { id: 'interactive-projects', name: 'Projetos Interativos', file: 'interactive-projects.html' },
    { id: 'mentors', name: 'Mentores', file: 'mentors.html' },
    { id: 'projetos', name: 'Projetos', file: 'projetos.html' }
];

// Dados das configurações de páginas
let pageControlData = {}

// Função para carregar configurações das páginas
async function loadPageSettings() {
    console.log('Carregando configurações de páginas...');
    
    try {
        const pageControlRef = doc(db, 'configuracoes', 'controle-paginas');
        
        onSnapshot(pageControlRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                pageControlData = docSnapshot.data();
                console.log('Configurações de páginas carregadas do Firebase:', pageControlData);
                // Também salva localmente como backup
                savePageSettingsToLocal(pageControlData);
            } else {
                // Tentar carregar do localStorage
                pageControlData = loadPageSettingsFromLocal();
                console.log('Configurações de páginas carregadas do localStorage:', pageControlData);
            }
            
            updatePageControlUI();
        }, (error) => {
            console.warn('Erro no Firebase, usando localStorage:', error);
            // Em caso de erro, usar localStorage
            pageControlData = loadPageSettingsFromLocal();
            updatePageControlUI();
        });
        
    } catch (error) {
        console.warn('Erro ao conectar Firebase, usando localStorage:', error);
        pageControlData = loadPageSettingsFromLocal();
        updatePageControlUI();
    }
}

// Função para salvar configurações localmente
function savePageSettingsToLocal(data) {
    try {
        localStorage.setItem('pageControlStatus', JSON.stringify(data));
        console.log('Configurações de páginas salvas localmente:', data);
    } catch (error) {
        console.error('Erro ao salvar configurações no localStorage:', error);
    }
}

// Função para carregar configurações localmente
function loadPageSettingsFromLocal() {
    try {
        const stored = localStorage.getItem('pageControlStatus');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Erro ao carregar configurações do localStorage:', error);
    }
    
    // Retorna configuração padrão (todas as páginas online)
    const defaultConfig = {
        ultimaAtualizacao: new Date()
    };
    
    targetPages.forEach(page => {
        defaultConfig[page.id] = {
            online: true,
            dataManutencao: '',
            customMessage: ''
        };
    });
    
    return defaultConfig;
}

// Função para atualizar a UI do controle de páginas
function updatePageControlUI() {
    const pagesControl = document.getElementById('pages-control');
    if (!pagesControl) return;
    
    // Garantir que pageControlData existe
    if (!pageControlData || Object.keys(pageControlData).length === 0) {
        pageControlData = loadPageSettingsFromLocal();
    }
    
    // Limpar conteúdo existente
    pagesControl.innerHTML = '';
    
    // Criar controles para cada página
    targetPages.forEach(page => {
        const pageData = pageControlData[page.id] || { online: true, dataManutencao: '', customMessage: '' };
        
        const pageDiv = document.createElement('div');
        pageDiv.className = 'bg-gray-50 p-4 rounded-lg border';
        
        pageDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-gray-900">${page.name}</h4>
                <div class="flex items-center">
                    <span class="mr-2 text-sm ${pageData.online ? 'text-green-600' : 'text-red-600'}">
                        <i class="fas ${pageData.online ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>
                        ${pageData.online ? 'Online' : 'Offline'}
                    </span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${pageData.online ? 'checked' : ''} 
                               class="sr-only peer" 
                               onchange="togglePageStatus('${page.id}')">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            
            <div class="space-y-2 ${pageData.online ? 'hidden' : ''}" id="offline-settings-${page.id}">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Data de Manutenção
                    </label>
                    <input type="date" 
                           id="maintenance-date-${page.id}"
                           value="${pageData.dataManutencao || ''}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Mensagem Personalizada (opcional)
                    </label>
                    <textarea id="custom-message-${page.id}"
                              placeholder="Deixe em branco para usar a mensagem padrão"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows="2">${pageData.customMessage || ''}</textarea>
                </div>
            </div>
        `;
        
        pagesControl.appendChild(pageDiv);
    });
}

// Função para alternar status de uma página
function togglePageStatus(pageId) {
    if (!pageControlData[pageId]) {
        pageControlData[pageId] = { online: true, dataManutencao: '', customMessage: '' };
    }
    
    pageControlData[pageId].online = !pageControlData[pageId].online;
    
    // Mostrar/esconder configurações offline
    const offlineSettings = document.getElementById(`offline-settings-${pageId}`);
    if (offlineSettings) {
        if (pageControlData[pageId].online) {
            offlineSettings.classList.add('hidden');
        } else {
            offlineSettings.classList.remove('hidden');
        }
    }
    
    // Atualizar status visual
    updatePageControlUI();
}

// Função para salvar configurações das páginas
async function savePageSettings() {
    try {
        // Coletar dados dos formulários
        targetPages.forEach(page => {
            if (!pageControlData[page.id]) {
                pageControlData[page.id] = { online: true, dataManutencao: '', customMessage: '' };
            }
            
            const maintenanceDate = document.getElementById(`maintenance-date-${page.id}`);
            const customMessage = document.getElementById(`custom-message-${page.id}`);
            
            if (maintenanceDate) {
                pageControlData[page.id].dataManutencao = maintenanceDate.value;
            }
            if (customMessage) {
                pageControlData[page.id].customMessage = customMessage.value.trim();
            }
        });
        
        pageControlData.ultimaAtualizacao = new Date();
        
        // Tentar salvar no Firebase primeiro
        try {
            const pageControlRef = doc(db, 'configuracoes', 'controle-paginas');
            await setDoc(pageControlRef, pageControlData, { merge: true });
            console.log('Configurações de páginas salvas no Firebase com sucesso');
        } catch (firebaseError) {
            console.warn('Erro ao salvar no Firebase, usando localStorage:', firebaseError);
        }
        
        // Sempre salvar localmente como backup
        savePageSettingsToLocal(pageControlData);
        
        showSuccess('Configurações de páginas salvas com sucesso!');
        
    } catch (error) {
        console.error('Erro ao salvar configurações de páginas:', error);
        showError('Erro ao salvar configurações: ' + error.message);
    }
}

// Exportar funções para uso global
window.loadPageSettings = loadPageSettings;
window.savePageSettings = savePageSettings;
window.togglePageStatus = togglePageStatus;

// ==================== GESTÃO DE MANUTENÇÃO ====================

async function loadMaintenanceStatus() {
    try {
        const maintenanceRef = doc(db, 'configuracoes', 'manutencao');
        
        onSnapshot(maintenanceRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                maintenanceData = docSnapshot.data();
                console.log('Status de manutenção carregado:', maintenanceData);
            } else {
                // Criar documento padrão se não existir
                maintenanceData = {
                    ativo: false,
                    titulo: 'Site em Manutenção',
                    mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
                    previsao: '',
                    ultimaAtualizacao: new Date()
                };
                console.log('Criando configuração padrão de manutenção');
            }
            
            updateMaintenanceUI();
        }, (error) => {
            console.error('Erro ao escutar mudanças de manutenção:', error);
            // Usar valores padrão em caso de erro de permissão
            maintenanceData = {
                ativo: false,
                titulo: 'Site em Manutenção',
                mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
                previsao: '',
                ultimaAtualizacao: new Date()
            };
            updateMaintenanceUI();
        });
        
    } catch (error) {
        console.error('Erro ao carregar status de manutenção:', error);
        // Usar valores padrão em caso de erro
        maintenanceData = {
            ativo: false,
            titulo: 'Site em Manutenção',
            mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
            previsao: '',
            ultimaAtualizacao: new Date()
        };
        updateMaintenanceUI();
    }
}

function updateMaintenanceUI() {
    console.log('Atualizando UI de manutenção com dados:', maintenanceData);
    
    const statusText = document.getElementById('maintenance-status-text');
    const toggleButton = document.getElementById('maintenance-toggle');
    const maintenanceForm = document.getElementById('maintenance-form');
    
    if (!statusText || !toggleButton) {
        console.warn('Elementos da UI de manutenção não encontrados');
        return;
    }
    
    // Garantir que maintenanceData existe
    if (!maintenanceData) {
        maintenanceData = {
            ativo: false,
            titulo: 'Site em Manutenção',
            mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
            previsao: '',
            ultimaAtualizacao: new Date()
        };
    }
    
    if (maintenanceData.ativo) {
        statusText.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>Site em Manutenção';
        statusText.className = 'font-medium text-red-600';
        toggleButton.innerHTML = '<i class="fas fa-play mr-2"></i>Reativar Site';
        toggleButton.className = 'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition';
        
        // Mostrar formulário quando em manutenção
        if (maintenanceForm) {
            maintenanceForm.classList.remove('hidden');
            const titleInput = document.getElementById('maintenance-title');
            const messageInput = document.getElementById('maintenance-message');
            const etaInput = document.getElementById('maintenance-eta');
            
            if (titleInput) titleInput.value = maintenanceData.titulo || '';
            if (messageInput) messageInput.value = maintenanceData.mensagem || '';
            if (etaInput) etaInput.value = maintenanceData.previsao || '';
        }
    } else {
        statusText.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Site Online';
        statusText.className = 'font-medium text-green-600';
        toggleButton.innerHTML = '<i class="fas fa-power-off mr-2"></i>Ativar Manutenção';
        toggleButton.className = 'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition';
        
        // Esconder formulário quando site está online
        if (maintenanceForm) {
            maintenanceForm.classList.add('hidden');
        }
    }
}

async function toggleMaintenance() {
    try {
        // Verificar se maintenanceData está carregado
        if (!maintenanceData) {
            console.log('maintenanceData não carregado, usando valor padrão');
            maintenanceData = {
                ativo: false,
                titulo: 'Site em Manutenção',
                mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
                previsao: '',
                ultimaAtualizacao: new Date()
            };
        }
        
        const novoStatus = !maintenanceData.ativo;
        console.log('Alterando status de manutenção para:', novoStatus);
        
        let dadosAtualizacao = {
            ativo: novoStatus,
            ultimaAtualizacao: new Date()
        };
        
        // Se estiver ativando manutenção, pegar os valores do formulário
        if (novoStatus) {
            const tituloInput = document.getElementById('maintenance-title');
            const mensagemInput = document.getElementById('maintenance-message');
            const previsaoInput = document.getElementById('maintenance-eta');
            
            dadosAtualizacao.titulo = tituloInput ? tituloInput.value.trim() || 'Site em Manutenção' : 'Site em Manutenção';
            dadosAtualizacao.mensagem = mensagemInput ? mensagemInput.value.trim() || 'Estamos realizando melhorias no site. Voltamos em breve!' : 'Estamos realizando melhorias no site. Voltamos em breve!';
            dadosAtualizacao.previsao = previsaoInput ? previsaoInput.value.trim() || '' : '';
        }
        
        const maintenanceRef = doc(db, 'configuracoes', 'manutencao');
        await setDoc(maintenanceRef, dadosAtualizacao, { merge: true });
        
        // Atualizar dados locais imediatamente
        maintenanceData = { ...maintenanceData, ...dadosAtualizacao };
        updateMaintenanceUI();
        
        showSuccess(novoStatus ? 'Site em manutenção ativado!' : 'Site reativado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao alterar status de manutenção:', error);
        showError('Erro ao alterar status de manutenção: ' + error.message);
    }
}

// ==================== FUNÇÃO DE TESTE PARA MANUTENÇÃO ====================

// Função para testar manutenção manualmente
async function testMaintenanceToggle() {
    console.log('=== TESTE DE MANUTENÇÃO ===');
    console.log('maintenanceData atual:', maintenanceData);
    
    try {
        // Força inicialização se necessário
        if (!maintenanceData) {
            console.log('Inicializando maintenanceData...');
            maintenanceData = {
                ativo: false,
                titulo: 'Site em Manutenção',
                mensagem: 'Estamos realizando melhorias no site. Voltamos em breve!',
                previsao: '',
                ultimaAtualizacao: new Date()
            };
        }
        
        // Testa alternar status
        await toggleMaintenance();
        
    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

// Exportar função de teste
window.testMaintenanceToggle = testMaintenanceToggle;

console.log('Admin panel carregado!');

// ==================== UTILIDADES ====================

function refreshChats() {
    document.getElementById('loading-chats').classList.remove('hidden');
    document.getElementById('chats-list').classList.add('hidden');
    document.getElementById('no-chats').classList.add('hidden');
    
    setTimeout(() => {
        loadChats();
    }, 500);
}

function showError(message) {
    // Implementar notificação de erro
    alert('Erro: ' + message);
}

function showSuccess(message) {
    // Implementar notificação de sucesso
    alert('Sucesso: ' + message);
}

// ==================== EVENT LISTENERS ====================

// Permitir envio de resposta com Enter (Ctrl+Enter)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        const modal = document.getElementById('response-modal');
        if (!modal.classList.contains('hidden')) {
            sendResponse();
        }
    }
    
    if (e.key === 'Escape') {
        const responseModal = document.getElementById('response-modal');
        const certificateModal = document.getElementById('certificate-modal');
        
        if (!responseModal.classList.contains('hidden')) {
            closeResponseModal();
        }
        
        if (!certificateModal.classList.contains('hidden')) {
            closeCertificateModal();
        }
    }
});

// Fechar modal clicando fora
document.getElementById('response-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeResponseModal();
    }
});

console.log('Admin panel carregado!');
