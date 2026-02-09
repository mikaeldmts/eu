// Widget de Chat para o índice
import ChatManager from './chat.js';

class ChatWidget {
    constructor() {
        this.chatManager = new ChatManager();
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createWidgetHTML();
        this.attachEventListeners();
        this.applyPersistedSubmissionState();
        this.loadResponses();
    }

    createWidgetHTML() {
        // Se widget já existe, não criar novamente
        if (document.getElementById('chat-widget-container')) {
            return;
        }

        const widgetHTML = `
            <div id="chat-widget-container">
                <!-- Botão de Chat Flutuante -->
                <button id="chat-widget-toggle" class="chat-widget-button" title="Envie uma mensagem">
                    <i class="fas fa-comments"></i>
                    <span class="chat-widget-badge" id="unread-badge" style="display: none;">!</span>
                </button>

                <!-- Widget de Chat -->
                <div class="chat-widget" id="chat-widget">
                    <div class="chat-widget-header">
                        <div>
                            <h3>Deixe uma mensagem</h3>
                            <p>Responderei em breve</p>
                        </div>
                        <button id="chat-widget-close" class="chat-widget-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="chat-widget-content">
                        <div id="chat-widget-messages" class="chat-widget-messages">
                            <!-- Mensagens aparecerão aqui -->
                        </div>

                        <div class="chat-widget-input">
                            <form id="chat-form">
                                <div class="form-group">
                                    <input 
                                        type="text" 
                                        id="chat-name" 
                                        placeholder="Seu nome"
                                        required
                                        autocomplete="name"
                                    >
                                </div>

                                <div class="form-group">
                                    <textarea 
                                        id="chat-message" 
                                        placeholder="Sua mensagem..."
                                        rows="3"
                                        required
                                        maxlength="500"
                                    ></textarea>
                                    <small id="char-count">0/500</small>
                                </div>

                                <button type="submit" class="btn-send">
                                    <i class="fas fa-paper-plane"></i>
                                    Enviar
                                </button>

                                <div id="chat-status" style="margin-top: 10px; text-align: center; font-size: 12px;"></div>
                            </form>
                            <div id="chat-after-submit" class="chat-widget-after" style="display: none;">
                                <p class="chat-widget-after-title">Mensagem enviada</p>
                                <p class="chat-widget-after-text">Obrigado! Assim que eu responder, a mensagem vai aparecer aqui.</p>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        `;

        // Estilu do widget
        const styleHTML = `
            <style id="chat-widget-styles">
                #chat-widget-container {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 999;
                }

                .chat-widget-button {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s ease;
                    position: relative;
                }

                .chat-widget-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }

                .chat-widget-button:active {
                    transform: scale(0.95);
                }

                .chat-widget-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #f44336;
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                .chat-widget {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 400px;
                    height: 600px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
                    display: none;
                    flex-direction: column;
                    opacity: 0;
                    transition: all 0.3s ease;
                    animation: slideUp 0.3s ease forwards;
                }

                .chat-widget.open {
                    display: flex;
                    opacity: 1;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .chat-widget-header {
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .chat-widget-header h3 {
                    margin: 0;
                    font-size: 16px;
                }

                .chat-widget-header p {
                    margin: 5px 0 0 0;
                    font-size: 12px;
                    opacity: 0.9;
                }

                .chat-widget-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .chat-widget-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .chat-widget-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .chat-widget-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #fafafa;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .chat-widget-message {
                    padding: 12px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.4;
                    max-width: 85%;
                    word-wrap: break-word;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .chat-widget-message.user {
                    background: #667eea;
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 2px;
                }

                .chat-widget-message.admin {
                    background: white;
                    color: #333;
                    border: 1px solid #e0e0e0;
                    align-self: flex-start;
                    border-bottom-left-radius: 2px;
                }

                .chat-widget-input {
                    padding: 15px;
                    background: white;
                    border-top: 1px solid #e0e0e0;
                }

                .form-group {
                    margin-bottom: 12px;
                }

                #chat-name,
                #chat-message {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: 13px;
                    transition: all 0.3s ease;
                    resize: none;
                }

                #chat-name:focus,
                #chat-message:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
                }

                #chat-message {
                    min-height: 60px;
                }

                small {
                    display: block;
                    text-align: right;
                    color: #999;
                    font-size: 11px;
                    margin-top: 4px;
                }

                .btn-send {
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 13px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .btn-send:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .btn-send:active {
                    transform: translateY(0);
                }

                .btn-send:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                #chat-status {
                    color: #667eea;
                    font-size: 12px;
                }

                .chat-widget-after {
                    border: 1px solid #e0e0e0;
                    background: #fff;
                    border-radius: 10px;
                    padding: 12px;
                    text-align: center;
                }

                .chat-widget-after-title {
                    margin: 0 0 6px 0;
                    font-size: 13px;
                    font-weight: 700;
                    color: #2e7d32;
                }

                .chat-widget-after-text {
                    margin: 0;
                    font-size: 12px;
                    color: #555;
                    line-height: 1.4;
                }

                @media (max-width: 600px) {
                    .chat-widget {
                        width: calc(100vw - 20px);
                        height: 70vh;
                        bottom: 80px;
                        right: 10px;
                        left: 10px;
                        border-radius: 12px;
                        max-height: 500px;
                    }

                    .chat-widget-button {
                        bottom: 20px;
                        right: 20px;
                    }

                    .chat-widget-header {
                        padding: 15px;
                    }

                    .chat-widget-header h3 {
                        font-size: 14px;
                    }

                    .chat-widget-header p {
                        font-size: 11px;
                    }

                    .chat-widget-messages {
                        padding: 15px;
                        max-height: 300px;
                    }

                    .chat-widget-message {
                        font-size: 12px;
                        max-width: 90%;
                        padding: 10px 12px;
                    }

                    .form-group {
                        margin-bottom: 10px;
                    }

                    #chat-name,
                    #chat-message {
                        font-size: 14px;
                        padding: 8px;
                    }

                    #chat-message {
                        min-height: 50px;
                    }

                    .btn-send {
                        font-size: 12px;
                        padding: 8px;
                    }

                    small {
                        font-size: 10px;
                    }
                }
            </style>
        `;

        // Inserir HTML e CSS
        document.body.insertAdjacentHTML('beforeend', widgetHTML + styleHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chat-widget-toggle');
        const closeBtn = document.getElementById('chat-widget-close');
        const form = document.getElementById('chat-form');
        const messageInput = document.getElementById('chat-message');

        toggleBtn.addEventListener('click', () => this.toggleWidget());
        closeBtn.addEventListener('click', () => this.toggleWidget());
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Contador de caracteres
        messageInput.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('char-count').textContent = `${count}/500`;
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chat-widget-container')) {
                this.closeWidget();
            }
        });
    }

    toggleWidget() {
        this.isOpen ? this.closeWidget() : this.openWidget();
    }

    openWidget() {
        document.getElementById('chat-widget').classList.add('open');
        this.isOpen = true;
        if (localStorage.getItem('chat_widget_submitted') !== '1') {
            document.getElementById('chat-name').focus();
        }
    }

    closeWidget() {
        document.getElementById('chat-widget').classList.remove('open');
        this.isOpen = false;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const nomeInput = document.getElementById('chat-name');
        const mensagemInput = document.getElementById('chat-message');
        const nome = nomeInput.value.trim();
        const mensagem = mensagemInput.value.trim();
        const statusDiv = document.getElementById('chat-status');
        const submitBtn = document.querySelector('.btn-send');

        if (!nome || !mensagem) {
            statusDiv.textContent = '❌ Preencha todos os campos';
            return;
        }

        submitBtn.disabled = true;
        statusDiv.textContent = '⏳ Enviando...';

        const result = await this.chatManager.sendMessage(nome, mensagem);

        if (result.success) {
            // Guardar chat_id e nome para carregar respostas depois
            localStorage.setItem('current_chat_id', result.chatId);
            localStorage.setItem('current_chat_name', nome);
            localStorage.setItem('chat_widget_submitted', '1');

            // Adicionar mensagem ao widget
            this.addMessageToWidget(mensagem, 'user');

            // Limpar inputs de forma forçada e visível
            nomeInput.value = '';
            mensagemInput.value = '';
            
            // Disparar evento de input para atualizar contador
            const event = new Event('input', { bubbles: true });
            mensagemInput.dispatchEvent(event);
            
            // Limpar status anterior
            document.getElementById('char-count').textContent = '0/500';

            statusDiv.textContent = '✓ Mensagem enviada! Responderei em breve.';
            statusDiv.style.color = '#4caf50';

            // Carregar respostas
            this.loadResponses(nome);

            // Esconder o formulario apos o primeiro envio (comportamento de "deixar recado")
            this.setSubmissionUI(true);

            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.style.color = '#667eea';
            }, 3000);

            // Evitar focar em inputs que ficaram ocultos
        } else {
            statusDiv.textContent = `❌ Erro: ${result.error}`;
            statusDiv.style.color = '#f44336';
        }

        submitBtn.disabled = false;
    }

    addMessageToWidget(text, type, messageId = null) {
        const messagesDiv = document.getElementById('chat-widget-messages');
        const msgElement = document.createElement('div');
        msgElement.className = `chat-widget-message ${type}`;
        msgElement.textContent = text;
        if (messageId) {
            msgElement.setAttribute('data-msg-id', messageId);
        }
        messagesDiv.appendChild(msgElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    loadResponses(nome) {
        // Carregar respostas do admin para este visitante
        if (!nome) {
            nome = localStorage.getItem('current_chat_name');
        }

        if (nome) {
            const unsubscribe = this.chatManager.onChatsLoad((chats) => {
                // Encontrar chats do visitante atual
                const userChats = chats.filter(chat => chat.nome.toLowerCase() === nome.toLowerCase());

                userChats.forEach(chat => {
                    this.chatManager.onChatMessagesLoad(chat.chatId, (messages) => {
                        // Mostrar apenas respostas do admin
                        messages.forEach(msg => {
                            if (msg.resposta && msg.respondido && !document.querySelector(`[data-msg-id="${msg.id}"]`)) {
                                this.addMessageToWidget(msg.resposta, 'admin', msg.id);
                            }
                        });
                    });
                });
            });
        }
    }

    applyPersistedSubmissionState() {
        if (localStorage.getItem('chat_widget_submitted') === '1') {
            this.setSubmissionUI(true);
        }
    }

    setSubmissionUI(isSubmitted) {
        const form = document.getElementById('chat-form');
        const after = document.getElementById('chat-after-submit');
        if (!form || !after) return;
        form.style.display = isSubmitted ? 'none' : '';
        after.style.display = isSubmitted ? 'block' : 'none';
    }
}

// Inicializar widget quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatWidget();
    });
} else {
    new ChatWidget();
}

export default ChatWidget;
