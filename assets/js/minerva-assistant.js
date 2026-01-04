// Ultra Evolved Minerva Assistant with Groq AI Integration
// Importar sistema centralizado de rate limiting
import { gitHubAPI } from './github-rate-limit.js';

class MinervaUltraAssistant {
    constructor() {
        this.isOpen = false;
        this.isProcessing = false;
        this.messageHistory = [];
        this.knowledgeBase = this.initializeKnowledgeBase();
        
        // Groq API Configuration (compatível com formato OpenAI)
        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        this.apiKey = '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';
        this.aiModel = 'llama-3.3-70b-versatile'; // Modelo rápido e capaz
        
        // Verificar se há override via localStorage
        try {
            const overrideKey = localStorage.getItem('minerva_groq_api_key');
            if (overrideKey && typeof overrideKey === 'string' && overrideKey.trim().length > 20) {
                this.apiKey = overrideKey.trim();
            }
        } catch {}
        
        this._aiAuthBlocked = false;
        this.conversationCache = new Map();
        this.lastInteraction = Date.now();
        this.isActive = false;
        this.isThinking = false;
        this.isUltraMode = false;
        this.userSession = {
            questionsAsked: 0,
            topics: [],
            startTime: Date.now(),
            userPreferences: { responseStyle: 'concise' },
            conversationHistory: []
        };
        
        // GitHub Integration System - usando sistema centralizado
        this.githubIntegration = {
            enabled: true,
            cache: new Map(),
            fileContentCache: new Map(),
            // Rate limiting agora gerenciado pelo sistema centralizado
            api: gitHubAPI, // Referência ao sistema centralizado
            fileAnalysis: {
                enabled: true,
                maxFileSize: 500 * 1024, // 500KB máximo por arquivo
                allowedExtensions: ['.js', '.html', '.css', '.json', '.md', '.txt', '.py', '.jsx', '.ts', '.tsx'],
                cacheDuration: 60 * 60 * 1000, // 1 hora cache para arquivos (mudam menos)
                priorityFiles: ['README.md', 'package.json', 'index.html', 'script.js'], // Arquivos mais importantes
                maxFilesPerRepo: 10 // Máximo 10 arquivos por repositório
            },
            lastFetch: 0,
            cacheDuration: 15 * 60 * 1000 // 15 minutos cache para Minerva
        };

        // Indexador de conteúdo do site
        this.siteIndex = new Map();
        this.siteIndexReady = false;
        this.siteIndexer = {
            enabled: true,
            ttlMs: 24 * 60 * 60 * 1000,
            storageKey: 'minervaSiteIndex_v1',
            pages: [
                'index.html',
                'admin.html',
                'login.html',
                'curriculo-generator.html',
                'midia-admin.html',
                'relatorios-admin.html',
                'pages/curriculum.html',
                'pages/projetos.html',
                'pages/mentors.html',
                'pages/certificates-in-progress.html',
                'pages/interactive-projects.html',
                'pages/galeria-midia.html',
                'pages/relatorios-galeria.html'
            ]
        };
        
        // Rate limiting para Groq (mais generoso que Gemini - 30 req/min na versão free)
    this._aiQueue = [];
    this._aiProcessing = false;
    this._aiMinInterval = 2000; // 2s entre requisições (30/min = 1 a cada 2s)
    this._aiLastRequest = 0;
    // Controle adicional por janela
    this._aiWindowMs = 60000; // 1 minuto
    this._aiWindowStart = Date.now();
    this._aiUsedInWindow = 0;
    this._aiMaxPerWindow = 25; // margem segura para Groq free tier
    this._aiCooldownUntil = 0; // timestamp até quando devemos aguardar após 429
    // Deduplicação e throttle de UI
    this._inflightQuestions = new Map(); // cacheKey -> Promise
    this._lastUserAskAt = 0;
    // Controle global persistente
    this._globalRateKey = 'minerva_groq_rate';
    this._globalLockKey = 'minerva_groq_lock';

    // Limpar estado antigo para evitar locks
    this._resetAIRateState();

        this.init();
    }    initializeKnowledgeBase() {
        return {
            owner: {
                name: "Mikael Ferreira",
                profession: "Desenvolvedor Web Full Stack",
                specialties: ["Frontend", "Backend", "JavaScript", "Python", "React", "Node.js", "Firebase", "APIs REST", "UI/UX Design", "PWA Development"],
                experience: "Desenvolvedor apaixonado por criar experiências digitais únicas e funcionais",
                skills: {
                    frontend: {
                        languages: ["HTML5", "CSS3", "JavaScript ES6+", "TypeScript"],
                        frameworks: ["React.js", "Vue.js", "Angular basics"],
                        styling: ["Tailwind CSS", "Bootstrap", "SASS/SCSS", "CSS Grid", "Flexbox"],
                        tools: ["Webpack", "Vite", "Parcel", "NPM", "Yarn"]
                    },
                    backend: {
                        languages: ["Node.js", "Python", "PHP basics"],
                        databases: ["Firebase Firestore", "MongoDB", "MySQL", "PostgreSQL"],
                        apis: ["REST", "GraphQL", "WebSockets", "Real-time systems"],
                        cloud: ["Firebase", "Vercel", "Netlify", "Heroku"]
                    },
                    tools: ["Git", "VS Code", "Chrome DevTools", "Lighthouse", "Figma", "Adobe XD"],
                    gamedev: ["Phaser.js", "Canvas API", "WebGL", "Game mechanics", "Interactive animations"]
                },
                github: {
                    username: "mikaeldmts",
                    profile_url: "https://github.com/mikaeldmts",
                    integration_enabled: true
                },
                contact: {
                    email: "Contato através do formulário do site",
                    github: "https://github.com/mikaeldmts",
                    linkedin: "Perfil profissional disponível no site",
                    availability: "Aberto para oportunidades, projetos freelance e colaborações"
                },
                personality: {
                    traits: ["Autodidata", "Detalhista", "Criativo", "Orientado a resultados", "Comunicativo"],
                    approach: "Combina conhecimento técnico sólido com design thinking",
                    philosophy: "Acredita em código limpo, bem documentado e experiências de usuário excepcionais"
                }
            },
            website: {
                name: "Portfolio Mikael Ferreira",
                theme: "Inspirado em League of Legends/Riot Games com elementos dourados e azuis",
                architecture: {
                    type: "Single Page Application (SPA)",
                    pattern: "Vanilla JavaScript modular com ES6+",
                    structure: "Arquitetura serverless com Firebase backend",
                    performance: "Otimizado para Core Web Vitals e SEO"
                },
                features: [
                    "Sistema de chat em tempo real com Firebase listeners",
                    "Painel administrativo completo com autenticação",
                    "PWA (Progressive Web App) instalável",
                    "Sistema de partículas WebGL interativo",
                    "Gerador de currículo dinâmico com export PDF",
                    "Galeria de mídia com upload base64",
                    "Sistema de certificados em progresso",
                    "Modo alternativo de tema (dark/light)",
                    "Assistente IA Minerva powered by Google Gemini",
                    "Integração GitHub API para dados dinâmicos",
                    "Sistema de relatórios/dashboards com iframe",
                    "Jogos interativos com Phaser.js"
                ],
                pages: {
                    "index.html": {
                        description: "Página principal com perfil, habilidades, projetos e seções Recent Media/Reports",
                        features: ["Hero section", "Skills showcase", "Featured projects", "LinkedIn card", "Chat system", "Minerva assistant"],
                        technical: "Controle de página dinâmico, lazy loading, animações CSS"
                    },
                    "admin.html": {
                        description: "Painel administrativo completo para gestão do site",
                        features: ["Gestão de mensagens", "Resposta a chats", "Certificados", "Configurações", "Manutenção"],
                        technical: "Tailwind CSS, Firebase Auth, real-time listeners, CRUD operations"
                    },
                    "login.html": {
                        description: "Sistema de autenticação com Firebase Auth",
                        features: ["Login seguro", "Validação", "Redirecionamento", "Recuperação de senha"],
                        technical: "Firebase Authentication, validação client-side, UX otimizada"
                    },
                    "curriculo-generator.html": {
                        description: "Ferramenta avançada para gerar currículos personalizados",
                        features: ["Formulário multi-etapas", "Preview em tempo real", "Export PDF", "Templates"],
                        technical: "HTML2PDF, dados estruturados, validação forms, responsive design"
                    },
                    "midia-admin.html": {
                        description: "Administração completa de arquivos de mídia",
                        features: ["Upload files", "Base64 conversion", "Preview gallery", "Metadata management"],
                        technical: "FileReader API, base64 encoding, Firebase Storage, drag-and-drop"
                    },
                    "relatorios-admin.html": {
                        description: "Administração de relatórios e dashboards",
                        features: ["Upload dashboards", "Power BI integration", "iframe embed", "Featured reports"],
                        technical: "Dashboard embedding, URL validation, category management"
                    },
                    "pages/projetos.html": {
                        description: "Portfolio detalhado com demonstrações de projetos",
                        features: ["Project showcase", "Live demos", "GitHub links", "Technology stack"],
                        technical: "Interactive demos, code previews, responsive gallery"
                    },
                    "pages/certificates-in-progress.html": {
                        description: "Certificados em andamento e jornada de aprendizado",
                        features: ["Progress tracking", "Course links", "Completion dates", "Skills roadmap"],
                        technical: "Dynamic content loading, progress bars, certification APIs"
                    },
                    "pages/galeria-midia.html": {
                        description: "Galeria pública de mídia do site",
                        features: ["Media showcase", "Lightbox", "Categorias", "Search/filter"],
                        technical: "Lazy loading, modal previews, responsive grid, Firebase integration"
                    },
                    "pages/games.html": {
                        description: "Projetos de jogos e aplicações interativas",
                        features: ["Phaser.js games", "Interactive demos", "Game mechanics", "Leaderboards"],
                        technical: "Game engines, Canvas API, WebGL, physics engines"
                    },
                    "pages/relatorios-galeria.html": {
                        description: "Galeria de relatórios e dashboards públicos",
                        features: ["Dashboard gallery", "Interactive reports", "Data visualization", "Embedded analytics"],
                        technical: "iframe optimization, responsive embeds, loading states"
                    }
                },
                navigation: {
                    primary: "Menu lateral acionado pela foto de perfil",
                    secondary: "Chat system na parte inferior direita",
                    assistant: "Minerva IA sempre disponível no canto inferior direito",
                    mobile: "Responsivo com touch gestures e navigation drawer"
                }
            },
            technologies: {
                frontend: {
                    core: ["HTML5 semântico", "CSS3 avançado", "JavaScript ES6+ modular"],
                    styling: ["Tailwind CSS", "CSS Grid", "Flexbox", "Custom Properties", "Animations"],
                    libraries: ["Font Awesome", "Google Fonts", "HTML2PDF", "Lightbox"],
                    apis: ["FileReader", "Canvas", "WebGL", "ServiceWorker", "Intersection Observer"]
                },
                backend: {
                    database: ["Firebase Firestore (NoSQL)", "Real-time listeners", "Compound queries"],
                    auth: ["Firebase Authentication", "Role-based access", "Security rules"],
                    storage: ["Firebase Storage", "Base64 encoding", "File management"],
                    hosting: ["Firebase Hosting", "CDN", "SSL certificates"]
                },
                tools: {
                    development: ["VS Code", "Git", "Chrome DevTools", "Firebase Console"],
                    performance: ["Lighthouse", "Web Vitals", "Performance monitoring"],
                    design: ["Figma", "Adobe Creative Suite", "Color theory"],
                    testing: ["Manual testing", "Cross-browser testing", "Mobile testing"]
                },
                integrations: {
                    ai: ["Google Gemini API", "Natural language processing", "Context awareness"],
                    social: ["GitHub API", "LinkedIn integration", "Social sharing"],
                    analytics: ["Custom analytics", "User behavior tracking", "Performance metrics"]
                }
            },
            security: {
                firebase_rules: "Regras de segurança robustas no Firestore",
                authentication: "Sistema de autenticação baseado em roles",
                data_validation: "Validação client-side e server-side",
                api_security: "Rate limiting e key management"
            },
            performance: {
                optimization: ["Lazy loading", "Code splitting", "Minification", "Compression"],
                caching: ["Browser caching", "ServiceWorker", "CDN", "Firebase caching"],
                metrics: "Core Web Vitals otimizados para SEO e UX"
            },
            capabilities: [
                "Explicar qualquer aspecto técnico do desenvolvimento",
                "Demonstrar funcionalidades específicas do site",
                "Orientar navegação detalhada por todas as seções",
                "Fornecer informações profissionais sobre Mikael",
                "Explicar decisões de arquitetura e design",
                "Ajudar com dúvidas sobre implementação",
                "Contextualizar projetos e tecnologias",
                "Facilitar contato para oportunidades profissionais",
                "Análise em tempo real de repositórios GitHub",
                "Suporte técnico para uso do site"
            ]
        };
    }init() {
        this.createMinervaUI();
        this.setupEventListeners();
        // this.setupAdvancedFeatures(); // Função não implementada
        this.startAmbientAnimation();
        // Inicializa indexação de conteúdo do site para contexto aprimorado
        this.bootstrapSiteIndexer();
          // Inicializar dados do GitHub de forma assíncrona
        this.enrichKnowledgeWithGitHub()
            .then(() => {
                console.log('🎉 Minerva: Integração GitHub concluída com sucesso!');
                this.notifyGitHubIntegrationReady();
            })
            .catch(error => {
                console.log('⚠️ Minerva: Falha na inicialização do GitHub, continuando sem integração:', error.message);
            });
    }
    _resetAIRateState() {
        try {
            localStorage.removeItem(this._globalRateKey);
            localStorage.removeItem(this._globalLockKey);
        } catch {}
        this._aiWindowStart = Date.now();
        this._aiUsedInWindow = 0;
        this._aiCooldownUntil = 0;
        this._aiQueue = [];
        this._aiProcessing = false;
    }

    createMinervaUI() {
        // Verificar se já existe
        if (document.getElementById('minerva-container')) {
            return;
        }

        // Criar container da Minerva Ultra (apenas a coruja/CTA). O chat fica FORA no body
        // para evitar bug de "position: fixed" quando o pai tem transform.
        const minervaContainer = document.createElement('div');
        minervaContainer.id = 'minerva-container';
        minervaContainer.classList.add('minerva-container');
        minervaContainer.innerHTML = `
            <!-- Sistema de Partículas -->
            <div class="minerva-particles">
                <div class="minerva-particle"></div>
                <div class="minerva-particle"></div>
                <div class="minerva-particle"></div>
                <div class="minerva-particle"></div>
                <div class="minerva-particle"></div>
                <div class="minerva-particle"></div>
            </div>

            <!-- CTA Sutil acima da Minerva -->
            <div class="minerva-cta">Fale com a Minerva</div>

            <!-- Coruja Ultra Imponente e Realista -->
            <div id="minerva-owl" class="minerva-owl" title="Clique para falar com Minerva - Assistente IA Ultra Inteligente">
                <div class="owl-head">
                    <div class="owl-tufts">
                        <div class="tuft-left"></div>
                        <div class="tuft-right"></div>
                    </div>
                    <div class="owl-eyes">
                        <div class="eye left-eye">
                            <div class="pupil"></div>
                        </div>
                        <div class="eye right-eye">
                            <div class="pupil"></div>
                        </div>
                    </div>
                    <div class="owl-beak"></div>
                </div>
                <div class="thinking-dots" id="thinking-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;

        // Inserir no body
        document.body.appendChild(minervaContainer);

        // Criar o chat como elemento separado (fora do container) para centralizar corretamente
        const chat = document.createElement('div');
        chat.id = 'minerva-chat';
        chat.className = 'minerva-chat hidden';
        chat.innerHTML = `
            <div class="minerva-header">
                <div class="minerva-title">
                    <i class="fas fa-feather-alt"></i>
                    Minerva
                </div>
                <div class="minerva-status" id="minerva-status">
                    <span class="status-dot active"></span>
                    <span class="status-text">Online</span>
                </div>
                <button class="minerva-close" id="minerva-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="minerva-messages" id="minerva-messages">
                <div class="minerva-welcome">
                    <div class="welcome-avatar">
                        <i class="fas fa-feather-alt"></i>
                    </div>
                    <div class="welcome-message">
                        <h3>Olá! Sou a Minerva 🦉</h3>
                        <p>Assistente virtual do portfolio. Pergunte sobre projetos, tecnologias ou o Mikael!</p>
                    </div>
                    <div class="quick-suggestions">
                        <button class="suggestion-btn" data-question="Quais são os projetos do Mikael?">📁 Projetos</button>
                        <button class="suggestion-btn" data-question="Quais tecnologias são usadas neste site?">💻 Tecnologias</button>
                        <button class="suggestion-btn" data-question="Como posso entrar em contato?">📧 Contato</button>
                    </div>
                </div>
            </div>

            <div class="minerva-input-area">
                <div class="input-container">
                    <input type="text" id="minerva-input" placeholder="Digite sua pergunta..." maxlength="500" autocomplete="off">
                    <button id="minerva-send" class="minerva-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(chat);

        // Aplicar estilos dinâmicos adicionais
        this.applyDynamicStyles();
    }

    applyDynamicStyles() {
        // Garantir compatibilidade com todas as páginas
        const style = document.createElement('style');
        style.textContent = `
            /* Estilos dinâmicos da Minerva para garantir funcionamento em todas as páginas */
            .minerva-container {
                z-index: 99999 !important;
                pointer-events: none;
            }
            
            .minerva-owl, .minerva-chat {
                pointer-events: auto;
            }
            
            .minerva-chat.hidden {
                display: none !important;
            }
            
            /* CHAT CENTRALIZADO NA TELA */
            .minerva-chat:not(.hidden) {
                display: flex !important;
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                right: auto !important;
                bottom: auto !important;
                transform: translate(-50%, -50%) !important;
                width: 380px !important;
                max-width: calc(100vw - 40px) !important;
                height: 500px !important;
                max-height: calc(100vh - 80px) !important;
                z-index: 100000 !important;
            }
            
            .thinking-dots {
                display: none;
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .thinking-dots span {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--primary-gold);
                margin: 0 2px;
                animation: thinking 1.4s infinite ease-in-out both;
            }
            
            .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
            .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
            
            @keyframes thinking {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }    setupEventListeners() {
        // O clique da coruja será gerenciado dentro do setupDragFunctionality
        // para compatibilidade com drag

        // Fechar chat
        document.getElementById('minerva-close').addEventListener('click', () => {
            this.closeChat();
        });

        // Enviar mensagem
        document.getElementById('minerva-send').addEventListener('click', () => {
            this.sendMessage();
        });        // Enter no input e comandos especiais
        document.getElementById('minerva-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (e.ctrlKey) {
                    // Ctrl+Enter para nova linha (se implementarmos textarea)
                    return;
                }
                this.sendMessage();
            }
        });

        // Suporte a comandos especiais e autocomplete
        document.getElementById('minerva-input').addEventListener('input', (e) => {
            this.handleSpecialCommands(e.target.value);
        });

        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.closeChat();
            }
        });

        // Sugestões rápidas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                const question = e.target.getAttribute('data-question');
                this.sendMessage(question);
            }
        });

        // Mouse tracking para olhos da coruja
        document.addEventListener('mousemove', (e) => {
            this.updateOwlEyes(e);
        });

        // Detectar quando o usuário fica inativo
        this.setupIdleDetection();
        
        // Configurar funcionalidade de drag (AssistiveTouch)
        this.setupDragFunctionality();
    }    setupDragFunctionality() {
        const container = document.getElementById('minerva-container');
        const owlButton = container.querySelector('.minerva-owl');
        
        let isDragging = false;
        let dragStarted = false;
        let startX, startY, initialX, initialY;
        let dragThreshold = 5; // pixels de movimento necessários para começar o drag
        let downX, downY; // posição inicial do mouse/touch

        // Prevenir comportamentos padrão
        container.addEventListener('dragstart', (e) => e.preventDefault());
        container.addEventListener('selectstart', (e) => e.preventDefault());

        // Funções auxiliares
        const getDistance = (x1, y1, x2, y2) => {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        };

        const startDrag = (clientX, clientY) => {
            isDragging = true;
            dragStarted = false;
            downX = clientX;
            downY = clientY;
            startX = clientX;
            startY = clientY;
            
            const rect = container.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            // Adicionar cursor de movimento apenas quando começar o drag
            document.body.style.cursor = 'grabbing';
        };

        const drag = (clientX, clientY) => {
            if (!isDragging) return;
            
            // Verificar se moveu o suficiente para ser considerado drag
            const distance = getDistance(downX, downY, clientX, clientY);
            
            if (!dragStarted && distance < dragThreshold) {
                return; // Ainda não é um drag, pode ser apenas um clique
            }
            
            if (!dragStarted) {
                dragStarted = true;
                container.classList.add('dragging');
            }
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            let newX = initialX + deltaX;
            let newY = initialY + deltaY;
            
            // Limites da tela
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const maxX = window.innerWidth - containerWidth;
            const maxY = window.innerHeight - containerHeight;
            
            newX = Math.max(0, Math.min(maxX, newX));
            newY = Math.max(0, Math.min(maxY, newY));
            
            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
        };

        const endDrag = () => {
            if (!isDragging) return;
            
            isDragging = false;
            document.body.style.cursor = '';
            
            // Se não foi um drag real (movimento insuficiente), é um clique
            if (!dragStarted) {
                this.toggleChat();
                return;
            }
            
            dragStarted = false;
            container.classList.remove('dragging');
            container.classList.add('snapping');
            
            // Snap para as bordas (como AssistiveTouch)
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const screenCenter = window.innerWidth / 2;
            
            let finalX, finalY;
            
            // Snap horizontal para a borda mais próxima
            if (centerX < screenCenter) {
                finalX = 20; // Margem da esquerda
            } else {
                finalX = window.innerWidth - rect.width - 20; // Margem da direita
            }
            
            // Manter Y atual mas dentro dos limites
            finalY = Math.max(20, Math.min(window.innerHeight - rect.height - 20, rect.top));
            
            container.style.left = finalX + 'px';
            container.style.top = finalY + 'px';
            
            // Remover classe de snapping após animação
            setTimeout(() => {
                container.classList.remove('snapping');
            }, 400);
        };

        // Mouse events
        owlButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startDrag(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                drag(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                endDrag();
            }
        });

        // Touch events para mobile
        owlButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                drag(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                endDrag();
            }
        });
    }

    startAmbientAnimation() {
        // Iniciar partículas
        const particles = document.querySelector('.minerva-particles');
        if (particles) {
            particles.classList.add('active');
        }

        // Animação sutil da coruja quando inativa
        setInterval(() => {
            if (!this.isActive && !this.isThinking) {
                const owl = document.getElementById('minerva-owl');
                if (owl && Math.random() < 0.3) {
                    owl.style.animation = 'owlGlow 2s ease-in-out';
                    setTimeout(() => {
                        owl.style.animation = '';
                    }, 2000);
                }
            }
        }, 8000);
    }

    detectCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        const pageMap = {
            'index.html': 'home',
            'admin.html': 'admin',
            'login.html': 'login',
            'curriculo-generator.html': 'curriculo',
            'midia-admin.html': 'midia-admin',
            'projetos.html': 'projetos',
            'certificates-in-progress.html': 'certificados',
            'galeria-midia.html': 'galeria',
            'games.html': 'games'
        };
        
        return pageMap[page] || 'unknown';
    }

    // ========== SITE INDEXER (melhor compreensão do portfolio) ==========
    bootstrapSiteIndexer() {
        try {
            if (!this.siteIndexer.enabled) return;
            // Tenta carregar do localStorage
            const raw = localStorage.getItem(this.siteIndexer.storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.expiresAt && parsed.expiresAt > Date.now() && parsed.index) {
                    this.siteIndex = new Map(parsed.index);
                    this.siteIndexReady = true;
                }
            }

            // Atualiza em background
            this.buildSiteIndexInBackground();
        } catch (e) {
            console.log('⚠️ Minerva: erro ao iniciar indexador do site:', e.message);
        }
    }

    async buildSiteIndexInBackground() {
        try {
            const promises = this.siteIndexer.pages.map(async (page) => {
                const summary = await this.extractPageSummarySafe(page);
                if (summary) this.siteIndex.set(page, summary);
            });
            await Promise.all(promises);
            this.siteIndexReady = true;

            // Persistir em localStorage
            const payload = {
                index: Array.from(this.siteIndex.entries()),
                createdAt: Date.now(),
                expiresAt: Date.now() + this.siteIndexer.ttlMs
            };
            localStorage.setItem(this.siteIndexer.storageKey, JSON.stringify(payload));
        } catch (e) {
            console.log('⚠️ Minerva: erro ao construir índice do site:', e.message);
        }
    }

    async extractPageSummarySafe(url) {
        try {
            const res = await fetch(url, { credentials: 'omit' });
            if (!res.ok) return null;
            const html = await res.text();
            const summary = this.extractSummaryFromHTML(html, url);
            return summary;
        } catch (e) {
            return null;
        }
    }

    extractSummaryFromHTML(html, url) {
        // Parsing leve via regex para evitar custo de DOMParser em todos browsers
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const metas = Array.from(html.matchAll(/<meta[^>]+(name|property)=["']([^"']+)["'][^>]*?(content)=["']([^"']+)["'][^>]*>/gi))
            .map((m) => ({ key: m[2], value: m[4] }))
            .filter(m => /description|og:title|og:description|keywords/i.test(m.key));
        const h2s = Array.from(html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).slice(0, 8).map(m => m[1].trim());
        const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi))
            .slice(0, 12)
            .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }))
            .filter(l => l.text && l.href);

        return {
            url,
            title: titleMatch ? titleMatch[1].trim() : null,
            metas,
            sections: h2s,
            links
        };
    }

    getIndexedPageSummary(currentPageKey) {
        // Mapeia chave amigável para caminho real
        const map = {
            home: 'index.html',
            admin: 'admin.html',
            login: 'login.html',
            curriculo: 'curriculo-generator.html',
            'midia-admin': 'midia-admin.html',
            projetos: 'pages/projetos.html',
            certificados: 'pages/certificates-in-progress.html',
            galeria: 'pages/galeria-midia.html',
            games: 'pages/games.html'
        };
        const path = map[currentPageKey] || 'index.html';
        return {
            ready: this.siteIndexReady,
            page: path,
            summary: this.siteIndex.get(path) || null
        };
    }

    async toggleChat() {
        if (this.isActive) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }    openChat() {
        const chat = document.getElementById('minerva-chat');
        const owl = document.getElementById('minerva-owl');
        const container = document.getElementById('minerva-container');
        
        // Criar overlay para escurecer o fundo
        this.createOverlay();
        
        // Transformar o chat em modal centralizado
        chat.classList.remove('hidden');
        chat.classList.add('modal-open');
        owl.classList.add('active');
        container.classList.add('ultra-active');
        
        this.isActive = true;
        this.isUltraMode = true;
        
        // Focar no input
        setTimeout(() => {
            document.getElementById('minerva-input').focus();
        }, 400);
        
        // Saudação contextual
        if (this.userSession.questionsAsked === 0) {
            this.showContextualGreeting();
        }
        
        // Ativar modo ultra visual
        this.activateUltraMode();
    }    createOverlay() {
        // Remover overlay existente se houver
        const existingOverlay = document.getElementById('minerva-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Criar novo overlay
        const overlay = document.createElement('div');
        overlay.id = 'minerva-overlay';
        overlay.className = 'minerva-overlay';
        
        // Adicionar ao body ANTES do modal para garantir que fique atrás
        document.body.appendChild(overlay);
        
        // Fechar ao clicar no overlay
        overlay.addEventListener('click', () => {
            this.closeChat();
        });
        
        // Ativar overlay após um pequeno delay para garantir ordem correta
        setTimeout(() => {
            overlay.classList.add('active');
            document.body.classList.add('modal-open');
        }, 10);
    }

    removeOverlay() {
        const overlay = document.getElementById('minerva-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            // Remover o overlay do DOM após a transição
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
        document.body.classList.remove('modal-open');
    }

    closeChat() {
        const chat = document.getElementById('minerva-chat');
        const owl = document.getElementById('minerva-owl');
        const container = document.getElementById('minerva-container');
        
        // Remover modal e overlay
        chat.classList.add('hidden');
        chat.classList.remove('modal-open');
        this.removeOverlay();
        
        owl.classList.remove('active', 'thinking', 'processing');
        container.classList.remove('ultra-active');
        
        this.isActive = false;
        this.isUltraMode = false;
        this.isThinking = false;
    }

    activateUltraMode() {
        const owl = document.getElementById('minerva-owl');
        const particles = document.querySelector('.minerva-particles');
        
        // Ativar efeitos visuais ultra
        if (particles) {
            particles.style.opacity = '1';
        }
        
        // Animação de entrada majestosa
        owl.style.animation = 'owlPulse 2s ease-in-out infinite';
        
        // Atualizar status para ultra mode
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Ultra Mode ON';
        }
    }

    async sendMessage(customMessage = null) {
        const input = document.getElementById('minerva-input');
        const message = customMessage || input.value.trim();
        
        if (!message) return;
        // Throttle básico para evitar spam de Enter
        const now = Date.now();
        if (!customMessage && (now - this._lastUserAskAt) < 2000) {
            this.showNotification('⏳ Aguarde 2s antes de enviar outra pergunta.', 'info');
            return;
        }
        this._lastUserAskAt = now;
        // Evitar enfileirar demais quando sistema está em cooldown ou bloqueio global
        if (now < this._aiCooldownUntil || this._isLockedGlobally() || this._aiQueue.length >= 6) {
            this.addMessage('⏰ Estou processando muitas solicitações agora. Vou responder com base no meu conhecimento local enquanto espero o limite da API liberar.', 'assistant');
            // Responde com fallback sem tocar na API
            const fallback = this.getFallbackResponse(message);
            this.addMessage(fallback, 'assistant');
            return;
        }
        // Checagem de janela global via localStorage antes de aceitar a pergunta
        try {
            const key = this._globalRateKey;
            const now2 = Date.now();
            let win = {};
            try { win = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
            let start = typeof win.start === 'number' ? win.start : now2;
            let used = typeof win.used === 'number' ? win.used : 0;
            if (now2 - start >= this._aiWindowMs) {
                start = now2;
                used = 0;
            }
            // margem forte: só permitir até 20 por minuto globalmente (Groq é mais generoso)
            if (used >= 20) {
                this.addMessage('🛑 A API atingiu o limite seguro por minuto. Responderei com base no conhecimento local para evitar bloqueios.', 'assistant');
                const fallback = this.getFallbackResponse(message);
                this.addMessage(fallback, 'assistant');
                return;
            }
        } catch {}
        
        // Limpar input se não for mensagem customizada
        if (!customMessage) {
            input.value = '';
        }
        
        // Adicionar mensagem do usuário
        this.addMessage(message, 'user');
        
        // Processar resposta
        await this.processQuestion(message);
    }

    addMessage(message, type, isTyping = false) {
        const messagesContainer = document.getElementById('minerva-messages');
        
        // Remover indicador de digitação anterior se existir
        const existingTyping = messagesContainer.querySelector('.typing-indicator');
        if (existingTyping && !isTyping) {
            existingTyping.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `minerva-message ${type}`;
        
        if (isTyping) {
            messageDiv.classList.add('typing-indicator');
            messageDiv.innerHTML = `
                <div class="message-content assistant-message typing">
                    <i class="fas fa-feather-alt"></i>
                    <div class="typing-animation">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
        } else {
            const contentHTML = this.renderRichText(String(message || ''));
            
            if (type === 'user') {
                messageDiv.innerHTML = `
                    <div class="message-content user-message">
                        <i class="fas fa-user"></i>
                        <div class="message-text">${contentHTML}</div>
                    </div>
                `;
            } else {
                const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                messageDiv.innerHTML = `
                    <div class="message-content assistant-message" data-message-id="${messageId}">
                        <i class="fas fa-feather-alt"></i>
                        <div class="message-text">${contentHTML}</div>
                        <div class="message-actions">
                            <button class="action-btn favorite-btn" onclick="minervaAssistant.toggleFavorite('${messageId}')" title="Favoritar mensagem">
                                <i class="far fa-star"></i>
                            </button>
                            <button class="action-btn copy-btn" onclick="minervaAssistant.copyMessage('${messageId}')" title="Copiar mensagem">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="action-btn share-btn" onclick="minervaAssistant.shareMessage('${messageId}')" title="Compartilhar">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Auto-remover indicador de digitação após um tempo
        if (isTyping) {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    showTypingIndicator() {
        this.addMessage('', 'assistant', true);
    }

    hideTypingIndicator() {
        const existingTyping = document.querySelector('.typing-indicator');
        if (existingTyping) {
            existingTyping.remove();
        }
    }

    // ========== RICH TEXT RENDERER (Markdown leve + Emoji) ==========
    escapeHTML(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    renderRichText(text) {
        // 1) Escape tudo para evitar XSS
        let html = this.escapeHTML(text);

        // 2) Converte shortcodes de emoji :smile: -> 😄 (mapeamento básico)
        const emojiMap = {
            smile: '😄', grin: '😁', joy: '😂', wink: '😉', sunglasses: '😎',
            fire: '🔥', star: '⭐', rocket: '🚀', heart: '❤️', hearts: '💕', clap: '👏',
            trophy: '🏆', party_popper: '🎉', tada: '🎉', thumbs_up: '👍', thumbsup: '👍',
            sparkle: '✨', owl: '🦉', thinking: '🤔', wave: '👋'
        };
        html = html.replace(/:([a-z0-9_+\-]+):/gi, (m, code) => emojiMap[code] || m);

        // 3) Inline code `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 4) Bold forte: **texto** ou __texto__
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        // 5) Itálico: *texto* ou _texto_
        html = html.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
        html = html.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');

        // 6) Links markdown [texto](url)
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // 7) URLs diretas
        html = html.replace(/(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)(?![^<]*>|[^<>]*<\/(?:a|code)>)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // 8) Listas simples (- ou *) por linha
        const lines = html.split(/\r?\n/);
        let inList = false;
        const out = [];
        for (const line of lines) {
            if (/^\s*[-*]\s+/.test(line)) {
                if (!inList) { out.push('<ul class="msg-list">'); inList = true; }
                out.push('<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>');
            } else {
                if (inList) { out.push('</ul>'); inList = false; }
                out.push(line);
            }
        }
        if (inList) out.push('</ul>');
        html = out.join('<br>');

        return html;
    }

    async processQuestion(question) {
        this.startThinking();
        this.setStatus('Processando...', 'processing');
        this.showTypingIndicator();
        
        try {
            // Verificar cache primeiro
            const cacheKey = question.toLowerCase().trim();
            if (this.conversationCache.has(cacheKey)) {
                // Simular tempo de resposta mesmo com cache para melhor UX
                await new Promise(resolve => setTimeout(resolve, 800));
                const response = this.conversationCache.get(cacheKey);
                this.stopThinking();
                this.hideTypingIndicator();
                this.setStatus('Online', 'online');
                this.addMessage(response, 'assistant');
                this.saveToHistory(question, response);
                return;
            }

            // Se já houver uma pergunta idêntica em processamento, aguardar a mesma resposta
            if (this._inflightQuestions.has(cacheKey)) {
                const inflight = this._inflightQuestions.get(cacheKey);
                const response = await inflight;
                this.stopThinking();
                this.hideTypingIndicator();
                this.setStatus('Online', 'online');
                this.addMessage(response, 'assistant');
                this.saveToHistory(question, response);
                return;
            }

            // Construir contexto
            const context = this.buildContext();
            
            // Consultar Groq AI API
            const inflightPromise = this.queryAI(question, context);
            this._inflightQuestions.set(cacheKey, inflightPromise);
            const response = await inflightPromise.finally(() => this._inflightQuestions.delete(cacheKey));
            
            // Cache da resposta
            this.conversationCache.set(cacheKey, response);
            
            // Exibir resposta
            this.stopThinking();
            this.hideTypingIndicator();
            this.setStatus('Online', 'online');
            this.addMessage(response, 'assistant');
            this.saveToHistory(question, response);
            
            // Atualizar sessão
            this.userSession.questionsAsked++;
            this.userSession.topics.push(question);
            this.userSession.conversationHistory.push({
                question,
                response,
                timestamp: Date.now()
            });
              } catch (error) {
            this.stopThinking();
            this.hideTypingIndicator();
            this.handleError(error, question);
        }
    }

    // ========== SISTEMA DE STATUS E FEEDBACK MELHORADO ==========
    setStatus(text, type = 'online') {
        const statusElement = document.getElementById('minerva-status');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('.status-text');
        
        if (statusText) statusText.textContent = text;
        
        // Remover classes antigas
        statusDot.classList.remove('active', 'processing', 'error');
        
        // Adicionar nova classe
        switch(type) {
            case 'online':
                statusDot.classList.add('active');
                break;
            case 'processing':
                statusDot.classList.add('processing');
                break;
            case 'error':
                statusDot.classList.add('error');
                break;
        }
    }

    handleError(error, originalQuestion) {
        console.error('Erro ao processar pergunta:', error);
        
        let errorMessage = '';
        let fallbackResponse = '';
        
        // Diferentes tipos de erro
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Problemas de conexão detectados';
            this.setStatus('Offline', 'error');
            fallbackResponse = `😔 Não foi possível conectar com a IA no momento. Mas posso responder baseado no meu conhecimento local sobre:\n\n${this.getFallbackResponse(originalQuestion)}`;
        } else if (error.message.includes('API key')) {
            errorMessage = 'Erro de autenticação da API';
            this.setStatus('Erro API', 'error');
            fallbackResponse = `🔐 Problemas temporários com a IA. Aqui está o que posso te ajudar:\n\n${this.getFallbackResponse(originalQuestion)}`;
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            errorMessage = 'Limite de uso da API atingido';
            this.setStatus('Limite atingido', 'error');
            fallbackResponse = `⏰ Limite temporário atingido. Resposta baseada no conhecimento local:\n\n${this.getFallbackResponse(originalQuestion)}`;
        } else {
            errorMessage = 'Erro interno';
            this.setStatus('Erro', 'error');
            fallbackResponse = `🤖 Ops! Algo deu errado, mas aqui está uma resposta baseada no meu conhecimento:\n\n${this.getFallbackResponse(originalQuestion)}`;
        }
        
        // Adicionar mensagem de erro detalhada
        this.addErrorMessage(errorMessage, fallbackResponse);
        
        // Tentar restaurar status depois de um tempo
        setTimeout(() => {
            this.setStatus('Online', 'online');
        }, 5000);
    }

    addErrorMessage(errorType, fallbackContent) {
        const messagesContainer = document.getElementById('minerva-messages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'minerva-message error-message';
        
        errorDiv.innerHTML = `
            <div class="message-content error-content">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="error-type">${errorType}</span>
                    <button class="retry-btn" onclick="this.closest('.error-message').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="error-fallback">
                    ${this.renderRichText(fallbackContent)}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(errorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // ========== SISTEMA DE HISTÓRICO PERSISTENTE ==========
    saveToHistory(question, response) {
        try {
            const historyKey = 'minerva_chat_history';
            const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            const entry = {
                id: Date.now(),
                question,
                response,
                timestamp: new Date().toISOString(),
                page: this.detectCurrentPage()
            };
            
            currentHistory.unshift(entry); // Adicionar no início
            
            // Manter apenas os últimos 50 itens
            if (currentHistory.length > 50) {
                currentHistory.splice(50);
            }
            
            localStorage.setItem(historyKey, JSON.stringify(currentHistory));
        } catch (error) {
            console.warn('Erro ao salvar histórico:', error);
        }
    }

    loadHistory() {
        try {
            const historyKey = 'minerva_chat_history';
            return JSON.parse(localStorage.getItem(historyKey) || '[]');
        } catch (error) {
            console.warn('Erro ao carregar histórico:', error);
            return [];
        }
    }

    clearHistory() {
        try {
            localStorage.removeItem('minerva_chat_history');
            this.addMessage('📝 Histórico de conversas limpo com sucesso!', 'assistant');
        } catch (error) {
            this.addMessage('❌ Erro ao limpar histórico.', 'assistant');
        }
    }

    exportHistory(format = 'json') {
        try {
            const history = this.loadHistory();
            const favorites = JSON.parse(localStorage.getItem('minerva_favorites') || '[]');
            const sessionInfo = this.userSession;
            
            const exportData = {
                exportDate: new Date().toISOString(),
                totalConversations: history.length,
                totalFavorites: favorites.length,
                sessionInfo: {
                    questionsAsked: sessionInfo.questionsAsked,
                    sessionDuration: Math.round((Date.now() - sessionInfo.startTime) / 1000 / 60),
                    userPreferences: sessionInfo.userPreferences
                },
                history: history,
                favorites: favorites,
                metadata: {
                    version: 'Minerva Ultra v2.1',
                    exportFormat: format,
                    userAgent: navigator.userAgent,
                    currentPage: this.detectCurrentPage()
                }
            };
            
            let blob, filename, mimeType;
            
            switch (format) {
                case 'txt':
                    const textContent = this.generateTextExport(exportData);
                    blob = new Blob([textContent], {type: 'text/plain'});
                    filename = `minerva_export_${new Date().toISOString().split('T')[0]}.txt`;
                    mimeType = 'text/plain';
                    break;
                    
                case 'csv':
                    const csvContent = this.generateCSVExport(exportData);
                    blob = new Blob([csvContent], {type: 'text/csv'});
                    filename = `minerva_export_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;
                    
                default: // json
                    blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
                    filename = `minerva_complete_export_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
            }
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            
            this.addMessage(`📥 Dados exportados com sucesso em formato ${format.toUpperCase()}!\n\n**Incluído no export:**\n- ${history.length} conversas\n- ${favorites.length} favoritos\n- Informações da sessão\n- Metadados completos`, 'assistant');
        } catch (error) {
            this.addMessage('❌ Erro ao exportar dados.', 'assistant');
        }
    }

    generateTextExport(data) {
        let content = `MINERVA IA - EXPORT COMPLETO\n`;
        content += `Data: ${new Date(data.exportDate).toLocaleString('pt-BR')}\n`;
        content += `=`.repeat(50) + '\n\n';
        
        content += `RESUMO DA SESSÃO:\n`;
        content += `- Perguntas realizadas: ${data.sessionInfo.questionsAsked}\n`;
        content += `- Duração da sessão: ${data.sessionInfo.sessionDuration} minutos\n`;
        content += `- Total de conversas: ${data.totalConversations}\n`;
        content += `- Total de favoritos: ${data.totalFavorites}\n\n`;
        
        if (data.favorites.length > 0) {
            content += `MENSAGENS FAVORITAS:\n`;
            content += `=`.repeat(30) + '\n';
            data.favorites.forEach((fav, index) => {
                content += `${index + 1}. [${new Date(fav.timestamp).toLocaleString('pt-BR')}] - ${fav.page}\n`;
                content += `${fav.content}\n\n`;
            });
        }
        
        content += `HISTÓRICO COMPLETO:\n`;
        content += `=`.repeat(30) + '\n';
        data.history.forEach((entry, index) => {
            content += `${index + 1}. [${new Date(entry.timestamp).toLocaleString('pt-BR')}] - ${entry.page}\n`;
            content += `P: ${entry.question}\n`;
            content += `R: ${entry.response}\n`;
            content += `\n${'─'.repeat(40)}\n\n`;
        });
        
        return content;
    }

    generateCSVExport(data) {
        let csv = 'Tipo,Data,Pagina,Pergunta,Resposta,Favorito\n';
        
        // Adicionar favoritos
        data.favorites.forEach(fav => {
            const row = [
                'Favorito',
                new Date(fav.timestamp).toLocaleString('pt-BR'),
                fav.page,
                '',
                `"${fav.content.replace(/"/g, '""')}"`,
                'Sim'
            ].join(',');
            csv += row + '\n';
        });
        
        // Adicionar histórico
        data.history.forEach(entry => {
            const isFavorite = data.favorites.some(fav => fav.content === entry.response);
            const row = [
                'Conversa',
                new Date(entry.timestamp).toLocaleString('pt-BR'),
                entry.page,
                `"${entry.question.replace(/"/g, '""')}"`,
                `"${entry.response.replace(/"/g, '""')}"`,
                isFavorite ? 'Sim' : 'Não'
            ].join(',');
            csv += row + '\n';
        });
        
        return csv;
    }

    showExportOptions() {
        const exportHTML = `
            <div class="export-options-menu">
                <h4>📥 Opções de Exportação</h4>
                <p>Escolha o formato para exportar seus dados:</p>
                <div class="export-grid">
                    <button class="export-item" onclick="minervaAssistant.exportHistory('json')">
                        <i class="fas fa-code"></i>
                        <span>JSON</span>
                        <small>Dados completos estruturados</small>
                    </button>
                    <button class="export-item" onclick="minervaAssistant.exportHistory('txt')">
                        <i class="fas fa-file-alt"></i>
                        <span>Texto</span>
                        <small>Formato legível e organizado</small>
                    </button>
                    <button class="export-item" onclick="minervaAssistant.exportHistory('csv')">
                        <i class="fas fa-table"></i>
                        <span>CSV</span>
                        <small>Para planilhas (Excel, Sheets)</small>
                    </button>
                </div>
                <p class="export-note">💡 Todos os formatos incluem histórico, favoritos e metadados completos</p>
            </div>
        `;
        
        this.addMessage(exportHTML, 'assistant');
    }

    // ========== SISTEMA DE COMANDOS ESPECIAIS ==========
    handleSpecialCommands(input) {
        const commands = {
            '/help': () => this.showHelpCommands(),
            '/history': () => this.showHistory(),
            '/export': () => this.exportHistory(),
            '/clear': () => this.clearHistory(),
            '/status': () => this.showSystemStatus(),
            '/debug': () => this.showDebugInfo(),
            '/shortcuts': () => this.showKeyboardShortcuts(),
            '/favorites': () => this.showFavorites(),
            '/clearfavorites': () => this.clearFavorites()
        };

        // Verificar se é um comando
        if (input.startsWith('/')) {
            const command = input.toLowerCase().trim();
            if (commands[command]) {
                // Executar comando após um pequeno delay para melhor UX
                setTimeout(() => {
                    commands[command]();
                    document.getElementById('minerva-input').value = '';
                }, 100);
            }
        }
    }

    showHelpCommands() {
        const helpText = `🤖 **Comandos Especiais da Minerva:**

**Comandos Disponíveis:**
- \`/help\` - Mostrar esta ajuda
- \`/history\` - Ver histórico de conversas
- \`/favorites\` - Ver mensagens favoritas
- \`/export\` - Exportar histórico
- \`/clear\` - Limpar histórico
- \`/clearfavorites\` - Limpar favoritos
- \`/status\` - Status do sistema
- \`/debug\` - Informações de debug
- \`/shortcuts\` - Atalhos de teclado

**Dicas Rápidas:**
- Use **Ctrl+Enter** para quebrar linha
- **ESC** para fechar o chat
- Clique no ícone 🎤 para mais funcionalidades
- Digite \`>\` seguido de espaço para sugestões rápidas`;

        this.addMessage(helpText, 'assistant');
    }

    showHistory() {
        const history = this.loadHistory();
        if (history.length === 0) {
            this.addMessage('📝 Nenhum histórico encontrado.', 'assistant');
            return;
        }

        let historyText = `📚 **Últimas ${Math.min(5, history.length)} conversas:**\n\n`;
        
        history.slice(0, 5).forEach((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleString('pt-BR');
            historyText += `**${index + 1}.** ${entry.question.substring(0, 50)}${entry.question.length > 50 ? '...' : ''}\n`;
            historyText += `   *${date} - ${entry.page}*\n\n`;
        });

        historyText += `\nTotal: **${history.length}** conversas salvas.\nUse \`/export\` para baixar o histórico completo.`;
        
        this.addMessage(historyText, 'assistant');
    }

    showSystemStatus() {
        const status = {
            isOnline: navigator.onLine,
            cacheSize: this.conversationCache.size,
            sessionsQuestions: this.userSession.questionsAsked,
            uptime: Math.round((Date.now() - this.userSession.startTime) / 1000 / 60),
            githubEnabled: this.githubIntegration.enabled,
            siteIndexed: this.siteIndexReady
        };

        const statusText = `⚡ **Status do Sistema:**

**Conexão:** ${status.isOnline ? '🟢 Online' : '🔴 Offline'}
**Cache:** ${status.cacheSize} respostas armazenadas
**Sessão:** ${status.sessionsQuestions} perguntas em ${status.uptime}min
**GitHub:** ${status.githubEnabled ? '✅ Ativo' : '❌ Inativo'}
**Indexação:** ${status.siteIndexed ? '✅ Completa' : '⏳ Em progresso'}

**Recursos Ativos:**
- 🧠 Groq AI
- 💾 Cache inteligente
- 📱 Interface responsiva
- 🔍 Busca contextual`;

        this.addMessage(statusText, 'assistant');
    }

    showDebugInfo() {
        const debug = {
            userAgent: navigator.userAgent,
            currentPage: this.detectCurrentPage(),
            cacheKeys: Array.from(this.conversationCache.keys()).length,
            lastInteraction: new Date(this.lastInteraction).toLocaleString('pt-BR'),
            sessionDuration: Math.round((Date.now() - this.userSession.startTime) / 1000 / 60)
        };

        const debugText = `🔧 **Informações de Debug:**

**Página:** ${debug.currentPage}
**Navegador:** ${debug.userAgent.split(' ').pop()}
**Cache:** ${debug.cacheKeys} entradas
**Última Interação:** ${debug.lastInteraction}
**Duração da Sessão:** ${debug.sessionDuration} minutos
**Versão:** Minerva Ultra v2.1`;

        this.addMessage(debugText, 'assistant');
    }

    showKeyboardShortcuts() {
        const shortcutsText = `⌨️ **Atalhos de Teclado:**

**Chat:**
- **Enter** - Enviar mensagem
- **Ctrl+Enter** - Nova linha (futuro)
- **ESC** - Fechar chat
- **/** - Comandos especiais

**Comandos:**
- **/help** - Ajuda
- **/history** - Histórico
- **/clear** - Limpar tudo
- **/export** - Baixar dados

**Dicas:**
- Use \`Ctrl+F\` para buscar no histórico
- \`F11\` para tela cheia
- Arraste a Minerva para mover`;

        this.addMessage(shortcutsText, 'assistant');
    }

    showAdvancedFeatures() {
        const featuresHTML = `
            <div class="advanced-features-menu">
                <h4>🚀 Funcionalidades Avançadas</h4>
                <div class="feature-grid">
                    <button class="feature-item" onclick="minervaAssistant.showExportOptions()">
                        <i class="fas fa-download"></i>
                        Exportar Dados
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.showHistory()">
                        <i class="fas fa-history"></i>
                        Ver Histórico
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.showFavorites()">
                        <i class="fas fa-star"></i>
                        Favoritos
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.clearHistory()">
                        <i class="fas fa-trash"></i>
                        Limpar Dados
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.showSystemStatus()">
                        <i class="fas fa-info-circle"></i>
                        Status Sistema
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.toggleFullscreen()">
                        <i class="fas fa-expand"></i>
                        Tela Cheia
                    </button>
                    <button class="feature-item" onclick="minervaAssistant.showHelpCommands()">
                        <i class="fas fa-question-circle"></i>
                        Comandos
                    </button>
                </div>
                <p class="feature-hint">💡 Digite <code>/help</code> para ver todos os comandos</p>
            </div>
        `;

        this.addMessage(featuresHTML, 'assistant');
    }

    toggleFullscreen() {
        const chat = document.getElementById('minerva-chat');
        chat.classList.toggle('fullscreen-mode');
        
        if (chat.classList.contains('fullscreen-mode')) {
            this.addMessage('🖥️ Modo tela cheia ativado! Pressione ESC para sair.', 'assistant');
        } else {
            this.addMessage('📱 Modo normal restaurado.', 'assistant');
        }
    }

    // ========== SISTEMA DE FAVORITOS E MENSAGENS IMPORTANTES ==========
    toggleFavorite(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const favoriteBtn = messageElement.querySelector('.favorite-btn i');
        const messageText = messageElement.querySelector('.message-text').textContent;
        
        try {
            const favoritesKey = 'minerva_favorites';
            const currentFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
            
            const existingFavorite = currentFavorites.find(fav => fav.id === messageId);
            
            if (existingFavorite) {
                // Remover dos favoritos
                const index = currentFavorites.indexOf(existingFavorite);
                currentFavorites.splice(index, 1);
                favoriteBtn.className = 'far fa-star';
                favoriteBtn.style.color = '';
                this.showNotification('⭐ Removido dos favoritos', 'info');
            } else {
                // Adicionar aos favoritos
                const favorite = {
                    id: messageId,
                    content: messageText,
                    timestamp: new Date().toISOString(),
                    page: this.detectCurrentPage()
                };
                
                currentFavorites.unshift(favorite);
                favoriteBtn.className = 'fas fa-star';
                favoriteBtn.style.color = '#FFD700';
                this.showNotification('⭐ Adicionado aos favoritos!', 'success');
                
                // Manter apenas os últimos 20 favoritos
                if (currentFavorites.length > 20) {
                    currentFavorites.splice(20);
                }
            }
            
            localStorage.setItem(favoritesKey, JSON.stringify(currentFavorites));
        } catch (error) {
            this.showNotification('❌ Erro ao gerenciar favoritos', 'error');
        }
    }

    copyMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const messageText = messageElement.querySelector('.message-text').textContent;
        
        navigator.clipboard.writeText(messageText).then(() => {
            this.showNotification('📋 Mensagem copiada!', 'success');
        }).catch(() => {
            // Fallback para navegadores sem suporte ao clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = messageText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('📋 Mensagem copiada!', 'success');
        });
    }

    shareMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const messageText = messageElement.querySelector('.message-text').textContent;
        const shareText = `Resposta da Minerva IA:\n\n${messageText}\n\nVia: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Minerva IA - Resposta',
                text: shareText,
                url: window.location.href
            }).then(() => {
                this.showNotification('📤 Compartilhado com sucesso!', 'success');
            }).catch(() => {
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('📋 Link de compartilhamento copiado!', 'success');
        }).catch(() => {
            this.showNotification('❌ Erro ao compartilhar', 'error');
        });
    }

    showFavorites() {
        try {
            const favoritesKey = 'minerva_favorites';
            const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
            
            if (favorites.length === 0) {
                this.addMessage('⭐ Nenhuma mensagem favorita encontrada.\n\nDica: Clique na ⭐ em qualquer resposta da Minerva para adicionar aos favoritos!', 'assistant');
                return;
            }

            let favoritesText = `⭐ **Suas Mensagens Favoritas (${favorites.length}):**\n\n`;
            
            favorites.slice(0, 10).forEach((fav, index) => {
                const date = new Date(fav.timestamp).toLocaleDateString('pt-BR');
                const preview = fav.content.length > 100 ? fav.content.substring(0, 100) + '...' : fav.content;
                favoritesText += `**${index + 1}.** ${preview}\n`;
                favoritesText += `   *${date} - ${fav.page}*\n\n`;
            });

            if (favorites.length > 10) {
                favoritesText += `\n... e mais ${favorites.length - 10} favoritos.\nUse \`/export\` para ver todos.`;
            }
            
            this.addMessage(favoritesText, 'assistant');
        } catch (error) {
            this.addMessage('❌ Erro ao carregar favoritos.', 'assistant');
        }
    }

    clearFavorites() {
        try {
            localStorage.removeItem('minerva_favorites');
            this.addMessage('⭐ Favoritos limpos com sucesso!', 'assistant');
        } catch (error) {
            this.addMessage('❌ Erro ao limpar favoritos.', 'assistant');
        }
    }

    showNotification(message, type = 'info') {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `minerva-notification ${type}`;
        notification.textContent = message;
        
        // Estilos inline para garantir visibilidade
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: 'Spiegel', 'Marcellus', serif;
        `;
        
        document.body.appendChild(notification);
        
        // Animação de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    buildContext() {
        const currentPage = this.detectCurrentPage();
        const pageInfo = this.getDetailedPageInfo(currentPage);
        const siteFeatures = this.getCurrentSiteFeatures();
        const userBehavior = this.analyzeUserBehavior();
        const pageIndexData = this.getIndexedPageSummary(currentPage);
        
        return {
            currentPage,
            pageInfo,
            siteFeatures,
            userBehavior,
            knowledgeBase: this.knowledgeBase,
            userSession: this.userSession,
            githubData: this.getGitHubDataFromCache(),
            siteIndex: pageIndexData,
            timestamp: new Date().toISOString(),
            contextLevel: "ultra-detailed"
        };
    }

    getDetailedPageInfo(page) {
        const pageDetails = {
            'home': {
                currentSection: "Homepage principal",
                mainFeatures: ["Hero section com apresentação", "Skills showcase interativo", "Projetos em destaque", "Recent Media section", "Recent Reports section", "LinkedIn card", "Chat system", "Sistema de partículas"],
                userActions: ["Navegar projetos", "Acessar chat", "Ver galeria de mídia", "Explorar relatórios", "Contatar via LinkedIn"],
                technicalHighlights: ["Lazy loading otimizado", "Animações CSS avançadas", "Integration com Firebase", "PWA features"]
            },
            'admin': {
                currentSection: "Painel administrativo",
                mainFeatures: ["Gestão de mensagens", "Sistema de resposta a chats", "Gerenciamento de certificados", "Configurações do site", "Modo manutenção"],
                userActions: ["Responder mensagens", "Atualizar certificados", "Configurar site", "Monitorar atividade"],
                technicalHighlights: ["Tailwind CSS styling", "Firebase real-time listeners", "Authentication system", "CRUD operations"]
            },
            'login': {
                currentSection: "Sistema de autenticação",
                mainFeatures: ["Login seguro", "Validação de credenciais", "Recuperação de senha", "Redirecionamento automático"],
                userActions: ["Fazer login", "Recuperar senha", "Acessar admin"],
                technicalHighlights: ["Firebase Auth integration", "Form validation", "Security best practices", "UX otimizada"]
            },
            'curriculo': {
                currentSection: "Gerador de currículo",
                mainFeatures: ["Formulário multi-etapas", "Preview em tempo real", "Export para PDF", "Templates personalizáveis"],
                userActions: ["Preencher dados", "Gerar PDF", "Customizar template", "Download currículo"],
                technicalHighlights: ["HTML2PDF integration", "Multi-step forms", "Real-time preview", "Responsive design"]
            },
            'midia-admin': {
                currentSection: "Administração de mídia",
                mainFeatures: ["Upload de arquivos", "Conversão base64", "Galeria de preview", "Gerenciamento de metadata"],
                userActions: ["Upload mídia", "Organizar galeria", "Editar posts", "Configurar visibilidade"],
                technicalHighlights: ["FileReader API", "Base64 encoding", "Drag and drop", "Firebase Storage"]
            },
            'projetos': {
                currentSection: "Portfolio de projetos",
                mainFeatures: ["Showcase de projetos", "Demonstrações ao vivo", "Links para GitHub", "Stack tecnológica"],
                userActions: ["Explorar projetos", "Ver demos", "Acessar código", "Entender tecnologias"],
                technicalHighlights: ["Interactive demos", "Responsive gallery", "Code previews", "Technology badges"]
            },
            'certificados': {
                currentSection: "Certificados em progresso",
                mainFeatures: ["Tracking de progresso", "Links para cursos", "Datas de conclusão", "Roadmap de skills"],
                userActions: ["Ver progresso", "Acessar cursos", "Entender roadmap", "Tracking learning"],
                technicalHighlights: ["Progress tracking", "Dynamic content", "API integrations", "Progress visualization"]
            },
            'galeria': {
                currentSection: "Galeria de mídia",
                mainFeatures: ["Showcase de mídia", "Lightbox interativo", "Categorização", "Sistema de busca"],
                userActions: ["Navegar mídia", "Visualizar conteúdo", "Filtrar categorias", "Buscar itens"],
                technicalHighlights: ["Lazy loading", "Modal previews", "Responsive grid", "Search algorithms"]
            },
            'games': {
                currentSection: "Projetos de jogos",
                mainFeatures: ["Jogos Phaser.js", "Demos interativas", "Game mechanics", "Leaderboards"],
                userActions: ["Jogar games", "Ver mechanics", "Competir scores", "Explorar código"],
                technicalHighlights: ["Phaser.js engine", "Canvas API", "WebGL rendering", "Physics systems"]
            }
        };

        return pageDetails[page] || {
            currentSection: "Seção desconhecida",
            mainFeatures: ["Funcionalidades básicas do portfolio"],
            userActions: ["Navegar pelo site", "Explorar conteúdo"],
            technicalHighlights: ["Arquitetura moderna", "Performance otimizada"]
        };
    }

    getCurrentSiteFeatures() {
        return {
            activeFeatures: [
                "Sistema de chat em tempo real funcionando",
                "Assistente IA Minerva ativa e responsiva",
                "Integração GitHub funcionando",
                "Sistema de partículas ativo",
                "PWA instalável",
                "Tema responsivo"
            ],
            availableActions: [
                "Navegar entre páginas via menu lateral",
                "Usar chat para contato direto",
                "Interagir com Minerva para suporte",
                "Explorar projetos e demos",
                "Baixar/visualizar currículo",
                "Acessar links externos (GitHub, LinkedIn)"
            ],
            technicalStatus: [
                "Firebase conectado e funcionando",
                "Google Gemini API ativa",
                "GitHub API integrada",
                "Performance otimizada",
                "SEO implementado"
            ]
        };
    }

    analyzeUserBehavior() {
        return {
            sessionInfo: {
                questionsAsked: this.userSession.questionsAsked,
                topicsExplored: this.userSession.topics.slice(-5), // Últimos 5 tópicos
                sessionDuration: Date.now() - this.userSession.startTime,
                isNewUser: this.userSession.questionsAsked === 0
            },
            recommendedActions: this.getRecommendedActions(),
            contextualHelp: this.getContextualHelp()
        };
    }

    getRecommendedActions() {
        const page = this.currentPage;
        const questionsAsked = this.userSession.questionsAsked;

        if (questionsAsked === 0) {
            return [
                "Explore as funcionalidades do site",
                "Pergunte sobre tecnologias específicas",
                "Conheça mais sobre o Mikael",
                "Veja demonstrações de projetos"
            ];
        }

        const pageRecommendations = {
            'home': ["Explore os projetos em destaque", "Acesse a galeria de mídia", "Veja os relatórios/dashboards"],
            'admin': ["Gerencie mensagens", "Configure certificados", "Monitore atividade do site"],
            'projetos': ["Teste as demos interativas", "Explore o código no GitHub", "Veja as tecnologias usadas"],
            'certificados': ["Acompanhe o progresso de aprendizado", "Acesse cursos em andamento"],
            'galeria': ["Explore o conteúdo visual", "Use os filtros de categoria"],
            'games': ["Teste os jogos desenvolvidos", "Veja os mechanics implementados"]
        };

        return pageRecommendations[page] || ["Explore outras seções do site", "Faça perguntas específicas sobre tecnologias"];
    }

    getContextualHelp() {
        const page = this.currentPage;
        
        const helpContext = {
            'home': "Página principal com overview completo. Use o menu lateral (foto de perfil) para navegar.",
            'admin': "Área restrita para administração. Todas as funcionalidades de gestão estão aqui.",
            'login': "Sistema de autenticação para acessar área administrativa.",
            'curriculo': "Ferramenta para gerar currículos personalizados com dados atualizados.",
            'projetos': "Portfolio completo com demonstrações ao vivo dos projetos.",
            'certificados': "Acompanhamento da jornada de aprendizado e certificações.",
            'galeria': "Conteúdo visual organizado e categorizado do portfolio.",
            'games': "Seção especial com projetos de game development."
        };

        return helpContext[page] || "Explore as funcionalidades disponíveis nesta seção.";
    }

    notifyGitHubIntegrationReady() {
        // Adicionar indicador visual sutil de que dados do GitHub estão disponíveis
        const owl = document.getElementById('minerva-owl');
        if (owl && this.githubIntegration.cache.size > 0) {
            owl.setAttribute('title', 'Clique para falar com Minerva - Assistente IA Ultra Inteligente (Dados GitHub atualizados)');
            
            // Breve animação para indicar atualização
            owl.style.filter = 'brightness(1.1)';
            setTimeout(() => {
                owl.style.filter = '';
            }, 1000);
        }
    }

    // ========== GITHUB INTEGRATION STATUS ==========
      getGitHubIntegrationStatus() {
        const status = {
            enabled: this.githubIntegration.enabled,
            lastFetch: this.githubIntegration.lastFetch ? new Date(this.githubIntegration.lastFetch).toLocaleString('pt-BR') : 'Nunca',
            cacheSize: this.githubIntegration.cache.size,
            rateLimitUsed: this.githubIntegration.api ? this.githubIntegration.api.getRemainingRequests() : 0,
            rateLimitMax: 50, // Sistema centralizado usa 50 requests/hora
            hasUserData: this.githubIntegration.cache.has('userData'),
            hasReposData: this.githubIntegration.cache.has('reposData'),
            knowledgeBaseUpdated: this.knowledgeBase.owner.github.profile_updated !== undefined
        };
        
        console.log('📊 Minerva GitHub Integration Status:', status);
        return status;
    }

    // ========== GITHUB INTEGRATION SYSTEM ==========
    
    checkGitHubRateLimit() {
        // Usar sistema centralizado se disponível
        if (this.githubIntegration.api && this.githubIntegration.api.rateLimit) {
            const status = this.githubIntegration.api.rateLimit.checkRateLimit();
            return status.canMakeRequest;
        }
        
        // Fallback para sistema próprio (compatibilidade)
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // Garantir que requests existe
        if (!this.githubIntegration.rateLimit.requests) {
            this.githubIntegration.rateLimit.requests = [];
        }
        
        // Limpar requests antigas (mais de 1 hora)
        this.githubIntegration.rateLimit.requests = this.githubIntegration.rateLimit.requests.filter(
            timestamp => now - timestamp < oneHour
        );
        
        // Verificar se podemos fazer uma nova request
        return this.githubIntegration.rateLimit.requests.length < this.githubIntegration.rateLimit.requestsPerHour;
    }

    addGitHubRateLimitRequest() {
        // Usar sistema centralizado se disponível
        if (this.githubIntegration.api && this.githubIntegration.api.rateLimit) {
            this.githubIntegration.api.rateLimit.incrementRateLimit();
            return;
        }
        
        // Fallback para sistema próprio (compatibilidade)
        if (!this.githubIntegration.rateLimit.requests) {
            this.githubIntegration.rateLimit.requests = [];
        }
        this.githubIntegration.rateLimit.requests.push(Date.now());
    }

    async fetchGitHubDataSafely(url, cacheKey) {
        try {
            // Verificar cache primeiro (prioridade máxima)
            if (this.githubIntegration.cache.has(cacheKey)) {
                const cached = this.githubIntegration.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.githubIntegration.cacheDuration) {
                    return cached.data;
                }
            }

            // Verificar se já está marcado como rate limited (flag global do site)
            const globalFlag = localStorage.getItem('github_rate_limited');
            if (globalFlag) {
                try {
                    const data = JSON.parse(globalFlag);
                    if (data.blocked && Date.now() < data.resetTime) {
                        // GitHub está bloqueando - usar fallback silenciosamente
                        return this.getExistingGitHubData(cacheKey);
                    }
                } catch {}
            }

            // Verificar rate limit
            if (!this.checkGitHubRateLimit()) {
                console.log('⚠️ Minerva: Rate limit atingido, usando cache ou dados existentes');
                return this.getExistingGitHubData(cacheKey);
            }

            // Verificar se outras partes do site já estão fazendo muitas requests
            const globalRateLimit = this.checkGlobalGitHubUsage();
            if (!globalRateLimit.canMakeRequest) {
                return this.getExistingGitHubData(cacheKey);
            }

            // Fazer request segura (sem token no frontend; token deve ficar no servidor/Actions)
            this.addGitHubRateLimitRequest();
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    // 'Authorization': 'token ...'  // NÃO usar token no client
                }
            });
            
            if (!response.ok) {
                // Marcar rate limit globalmente se recebeu 403
                if (response.status === 403) {
                    const resetHeader = response.headers.get('x-ratelimit-reset');
                    const resetTime = resetHeader ? parseInt(resetHeader) * 1000 : Date.now() + 3600000;
                    localStorage.setItem('github_rate_limited', JSON.stringify({
                        blocked: true,
                        resetTime: resetTime
                    }));
                }
                throw new Error(`GitHub API: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache da resposta
            this.githubIntegration.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            console.log(`✅ Minerva: Dados do GitHub obtidos e em cache: ${cacheKey}`);
            return data;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao buscar ${cacheKey}, usando dados existentes:`, error.message);
            return this.getExistingGitHubData(cacheKey);
        }
    }

    checkGlobalGitHubUsage() {
        // Verificar se o sistema principal do site está fazendo muitas requests
        const globalRateLimit = localStorage.getItem('github_rate_limit');
        if (globalRateLimit) {
            try {
                const data = JSON.parse(globalRateLimit);
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;
                
                const recentRequests = data.requests.filter(timestamp => now - timestamp < oneHour);
                const canMakeRequest = recentRequests.length < 45; // Deixar margem para o site principal
                
                return { canMakeRequest, requestsLeft: 45 - recentRequests.length };
            } catch (e) {
                return { canMakeRequest: true, requestsLeft: 45 };
            }
        }
        return { canMakeRequest: true, requestsLeft: 45 };
    }

    getExistingGitHubData(cacheKey) {
        // Tentar obter dados de outras fontes de cache do site
        const cacheMapping = {
            'user': ['github_user_cache', 'github_user_data'],
            'repos': ['github_repos_cache', 'github_repositories'],
            'profile': ['github_profile_cache', 'github-skills-cache']
        };

        const possibleKeys = cacheMapping[cacheKey] || [cacheKey];
        
        for (const key of possibleKeys) {
            try {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const data = JSON.parse(cached);
                    // Diferentes formatos de cache
                    if (data.data) return data.data;
                    if (data.timestamp) return data;
                    return data;
                }
            } catch (e) {
                continue;
            }
        }

        // Dados de fallback básicos
        if (cacheKey === 'user') {
            return {
                name: "Mikael Ferreira",
                login: "mikaeldmts",
                public_repos: 6,
                followers: 1,
                bio: "Desenvolvedor Web Full Stack",
                avatar_url: "https://avatars.githubusercontent.com/u/142128917?v=4",
                html_url: "https://github.com/mikaeldmts"
            };
        }

        if (cacheKey === 'repos') {
            return [
                {
                    name: "portfolio",
                    description: "Portfolio pessoal",
                    language: "JavaScript",
                    stargazers_count: 1,
                    html_url: "https://github.com/mikaeldmts/portfolio"
                },
                {
                    name: "api",
                    description: "API desenvolvida em JavaScript",
                    language: "JavaScript", 
                    stargazers_count: 1,
                    html_url: "https://github.com/mikaeldmts/api"
                }
            ];
        }

        return null;
    }

    async getGitHubUserData() {
        return await this.fetchGitHubDataSafely(
            'https://api.github.com/users/mikaeldmts',
            'user'
        );
    }

    async getGitHubRepos() {
        return await this.fetchGitHubDataSafely(
            'https://api.github.com/users/mikaeldmts/repos?sort=updated&per_page=10',
            'repos'
        );
    }

    getGitHubDataFromCache() {
        const cachedUser = this.githubIntegration.cache.get('user');
        const cachedRepos = this.githubIntegration.cache.get('repos');
        
        return {
            user: cachedUser?.data || this.getExistingGitHubData('user'),
            repositories: cachedRepos?.data || this.getExistingGitHubData('repos'),
            lastUpdate: Math.max(cachedUser?.timestamp || 0, cachedRepos?.timestamp || 0)
        };
    }

    async enrichKnowledgeWithGitHub() {
        try {
            const [userData, reposData] = await Promise.all([
                this.getGitHubUserData(),
                this.getGitHubRepos()
            ]);

            if (userData) {
                this.knowledgeBase.owner.github = {
                    ...this.knowledgeBase.owner.github,
                    profile: userData,
                    stats: {
                        repositories: userData.public_repos || 0,
                        followers: userData.followers || 0,
                        following: userData.following || 0
                    }
                };
            }

            if (reposData && Array.isArray(reposData)) {
                this.knowledgeBase.owner.github.repositories = reposData.map(repo => ({
                    name: repo.name,
                    description: repo.description,
                    language: repo.language,
                    stars: repo.stargazers_count || 0,
                    forks: repo.forks_count || 0,
                    url: repo.html_url,
                    updated: repo.updated_at
                }));

                // Analisar tecnologias dos repositórios
                const technologies = new Set();
                reposData.forEach(repo => {
                    if (repo.language) technologies.add(repo.language);
                });
                
                this.knowledgeBase.owner.github.technologies = Array.from(technologies);
            }            console.log('✅ Minerva: Base de conhecimento enriquecida com dados do GitHub');
            
        } catch (error) {
            console.log('⚠️ Minerva: Erro ao enriquecer base de conhecimento:', error.message);
        }
    }    // ========== GITHUB FILE CONTENT ANALYSIS ==========
    
    async getFileContent(repoName, filePath) {
        const cacheKey = `file_${repoName}_${filePath}`;
        
        try {
            // Verificar cache primeiro (cache de 1 hora para arquivos)
            if (this.githubIntegration.fileContentCache.has(cacheKey)) {
                const cached = this.githubIntegration.fileContentCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.githubIntegration.fileAnalysis.cacheDuration) {
                    console.log(`📁 Minerva: Arquivo do cache: ${filePath}`);
                    return cached.content;
                }
            }

            // Verificar se pode fazer request (rate limit ultra-conservador)
            if (!this.checkGitHubRateLimit()) {
                console.log('⚠️ Minerva: Rate limit para análise de arquivos');
                return this.getFileFromCache(cacheKey);
            }

            // Verificar extensão permitida
            const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
            if (!this.githubIntegration.fileAnalysis.allowedExtensions.includes(extension)) {
                console.log(`⚠️ Minerva: Extensão não permitida: ${extension}`);
                return null;
            }

            // Fazer request ultra-cuidadosa
            const url = `https://api.github.com/repos/mikaeldmts/${repoName}/contents/${filePath}`;
            this.addGitHubRateLimitRequest();
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GitHub API: ${response.status}`);
            }

            const data = await response.json();
            
            // Verificar tamanho do arquivo
            if (data.size > this.githubIntegration.fileAnalysis.maxFileSize) {
                console.log(`⚠️ Minerva: Arquivo muito grande: ${data.size} bytes`);
                return null;
            }

            // Decodificar conteúdo base64 corretamente
            const content = atob(data.content.replace(/\s/g, ''));
            
            // Cache do conteúdo no formato correto
            this.githubIntegration.fileContentCache.set(cacheKey, {
                content: content,
                size: data.size,
                path: filePath,
                sha: data.sha,
                encoding: data.encoding,
                timestamp: Date.now()
            });

            console.log(`✅ Minerva: Arquivo analisado: ${filePath} (${data.size} bytes)`);
            return content;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao acessar arquivo ${filePath}:`, error.message);
            return this.getFileFromCache(cacheKey);
        }
    }    getFileFromCache(cacheKey) {
        if (this.githubIntegration.fileContentCache.has(cacheKey)) {
            const cached = this.githubIntegration.fileContentCache.get(cacheKey);
            console.log(`📁 Minerva: Usando arquivo do cache: ${cacheKey}`);
            return cached.content;
        }
        return null;
    }async searchInCode(repoName, searchTerm) {
        // Implementação básica - buscar em arquivos prioritários
        const priorityFiles = this.githubIntegration.fileAnalysis.priorityFiles;
        const results = [];
        
        for (const fileName of priorityFiles) {
            const content = await this.getFileContent(repoName, fileName);
            if (content && content.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                    file: fileName,
                    matches: this.findMatches(content, searchTerm)
                });
            }
        }
        
        return results;
    }findMatches(content, searchTerm) {
        const lines = content.split('\n');
        const matches = [];
        
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
                matches.push({
                    lineNumber: index + 1,
                    line: line.trim()
                });
            }
        });        return matches.slice(0, 5); // Máximo 5 matches por arquivo
    }

    async analyzeProjectStructure(repoName) {
        try {
            const cacheKey = `structure_${repoName}`;
              // Verificar cache
            if (this.githubIntegration.cache.has(cacheKey)) {
                const cached = this.githubIntegration.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.githubIntegration.fileAnalysis.cacheDuration) {
                    return cached.data;
                }
            }

            // Rate limit check
            if (!this.checkGitHubRateLimit()) {
                return null;
            }

            const url = `https://api.github.com/repos/mikaeldmts/${repoName}/git/trees/main?recursive=1`;
            this.addGitHubRateLimitRequest();
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GitHub Tree API: ${response.status}`);
            }

            const data = await response.json();
            const structure = {
                totalFiles: 0,
                directories: [],
                files: [],
                fileTypes: {},
                languages: new Set(),
                frameworks: new Set()
            };

            data.tree.forEach(item => {
                if (item.type === 'blob') {
                    structure.totalFiles++;
                    structure.files.push({
                        path: item.path,
                        size: item.size || 0
                    });
                    
                    const ext = item.path.split('.').pop();
                    if (ext) {
                        structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
                    }
                } else if (item.type === 'tree') {
                    structure.directories.push(item.path);
                }
            });

            // Detectar tecnologias pela estrutura de arquivos
            structure.files.forEach(file => {
                const ext = file.path.toLowerCase().substring(file.path.lastIndexOf('.'));
                if (ext === '.js') structure.languages.add('JavaScript');
                if (ext === '.ts') structure.languages.add('TypeScript');
                if (ext === '.py') structure.languages.add('Python');
                if (ext === '.html') structure.languages.add('HTML');
                if (ext === '.css') structure.languages.add('CSS');
                
                if (file.path.includes('package.json')) structure.frameworks.add('Node.js');
                if (file.path.includes('requirements.txt')) structure.frameworks.add('Python');
            });

            structure.languages = Array.from(structure.languages);
            structure.frameworks = Array.from(structure.frameworks);            // Cache da estrutura
            this.githubIntegration.cache.set(cacheKey, {
                data: structure,
                timestamp: Date.now()
            });

            console.log(`✅ Minerva: Estrutura analisada: ${repoName}`);
            return structure;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao analisar estrutura de ${repoName}:`, error.message);
            return null;
        }
    }

    async getProjectDocumentation(repoName) {
        try {
            // Buscar arquivos de documentação importantes
            const docFiles = ['README.md', 'readme.md', 'README.txt', 'docs/README.md'];
            let documentation = null;

            for (const file of docFiles) {
                const content = await this.getFileContent(repoName, file);
                if (content) {
                    documentation = {
                        file: file,
                        content: content.slice(0, 3000) // Limitar a 3000 caracteres
                    };
                    break;
                }
            }

            return documentation;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao buscar documentação de ${repoName}:`, error.message);
            return null;
        }
    }

    async analyzeProjectDependencies(repoName) {
        try {
            const packageContent = await this.getFileContent(repoName, 'package.json');
            if (packageContent) {
                const packageJson = JSON.parse(packageContent);
                return {
                    name: packageJson.name,
                    description: packageJson.description,
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {},
                    scripts: packageJson.scripts || {}
                };
            }

            // Tentar requirements.txt para Python
            const requirementsContent = await this.getFileContent(repoName, 'requirements.txt');
            if (requirementsContent) {
                const dependencies = requirementsContent.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.trim());
                
                return {
                    type: 'python',
                    dependencies: dependencies
                };
            }

            return null;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao analisar dependências de ${repoName}:`, error.message);
            return null;
        }
    }    async searchInCode(repoName, searchQuery, maxFiles = 3) {
        try {
            const structure = await this.analyzeProjectStructure(repoName);
            if (!structure) return null;

            const relevantFiles = structure.files
                .filter(file => {
                    const ext = '.' + file.path.split('.').pop();
                    return this.githubIntegration.fileAnalysis.allowedExtensions.includes(ext);
                })
                .slice(0, maxFiles); // Limitar número de arquivos

            const results = [];

            for (const file of relevantFiles) {
                const content = await this.getFileContent(repoName, file.path);
                if (content && content.toLowerCase().includes(searchQuery.toLowerCase())) {
                    const lines = content.split('\n');
                    const matchingLines = lines
                        .map((line, index) => ({ line, number: index + 1 }))
                        .filter(({ line }) => line.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 3); // Máximo 3 linhas por arquivo

                    if (matchingLines.length > 0) {
                        results.push({
                            file: file.path,
                            matches: matchingLines
                        });
                    }
                }

                // Rate limit check between files
                if (!this.checkGitHubRateLimit()) {
                    break;
                }
            }

            return results;

        } catch (error) {
            console.log(`⚠️ Minerva: Erro ao buscar código em ${repoName}:`, error.message);
            return null;
        }
    }

    getFileAnalysisStatus() {
        return {
            enabled: this.githubIntegration.fileAnalysis.enabled,
            filesCached: this.githubIntegration.fileContentCache.size,
            maxFileSize: this.githubIntegration.fileAnalysis.maxFileSize / 1024 + 'KB',
            allowedExtensions: this.githubIntegration.fileAnalysis.allowedExtensions,
            maxFilesPerRepo: this.githubIntegration.fileAnalysis.maxFilesPerRepo,
            cacheDuration: this.githubIntegration.fileAnalysis.cacheDuration / (60 * 1000) + ' minutos'
        };
    }

    // ========== END GITHUB INTEGRATION ==========

    // ========== GROQ AI INTEGRATION ==========
    
    // Worker da fila para chamadas Groq (30 req/min no free tier)
    _processAIQueue() {
        if (this._aiProcessing) return;
        const next = this._aiQueue.shift();
        if (!next) return;
        this._aiProcessing = true;
        const now = Date.now();

        // Se houver bloqueio global pós-429, reagendar
        if (this._isLockedGlobally()) {
            const delay = Math.max(0, this._getGlobalLockUntil() - now);
            this._aiQueue.unshift(next);
            this._aiProcessing = false;
            setTimeout(() => this._processAIQueue(), delay + 25);
            return;
        }

        // Reset da janela se necessário
        if (now - this._aiWindowStart >= this._aiWindowMs) {
            this._aiWindowStart = now;
            this._aiUsedInWindow = 0;
        }

        // Se estivermos em cooldown (pós-429), reagendar
        if (now < this._aiCooldownUntil) {
            const delay = this._aiCooldownUntil - now;
            this._aiQueue.unshift(next);
            this._aiProcessing = false;
            setTimeout(() => this._processAIQueue(), delay + 25);
            return;
        }

        // Se excedeu a janela atual, reagendar para o início da próxima janela
        if (this._aiUsedInWindow >= this._aiMaxPerWindow) {
            const delayToNextWindow = (this._aiWindowStart + this._aiWindowMs) - now;
            this._aiQueue.unshift(next);
            this._aiProcessing = false;
            setTimeout(() => this._processAIQueue(), Math.max(0, delayToNextWindow) + 25);
            return;
        }

        const wait = Math.max(0, this._aiMinInterval - (now - this._aiLastRequest));

        setTimeout(async () => {
            try {
                this._aiLastRequest = Date.now();
                const { messages, attempts } = next;
                this._aiUsedInWindow += 1;
                
                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.aiModel,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1024,
                        top_p: 0.95
                    })
                });

                if (response.status === 429) {
                    const retryAfterHeader = response.headers.get('retry-after');
                    const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
                    const retryDelayMs = Number.isFinite(retryAfterSec) ? retryAfterSec * 1000 : 5000;
                    
                    this._aiCooldownUntil = Date.now() + retryDelayMs;
                    this._bump429Lock(retryDelayMs);
                    this._aiUsedInWindow = Math.max(0, this._aiUsedInWindow - 1);

                    if ((attempts || 0) < 3) {
                        setTimeout(() => {
                            this._aiQueue.unshift({ messages, attempts: (attempts || 0) + 1, resolve: next.resolve, reject: next.reject });
                            this._aiProcessing = false;
                            this._processAIQueue();
                        }, retryDelayMs);
                        return;
                    } else {
                        next.reject(new Error('Rate limit da IA excedido, tente novamente em alguns segundos'));
                    }
                } else if (!response.ok) {
                    const errorText = await response.text();
                    this._aiUsedInWindow = Math.max(0, this._aiUsedInWindow - 1);
                    
                    if (response.status === 401) {
                        const err = new Error('Chave API da Groq inválida ou expirada');
                        err.code = 401;
                        this._aiAuthBlocked = true;
                        next.reject(err);
                    } else if (response.status === 403) {
                        const err = new Error('Acesso negado à API da Groq (403)');
                        err.code = 403;
                        this._aiAuthBlocked = true;
                        next.reject(err);
                    } else {
                        next.reject(new Error(`Erro na API da Groq: ${response.status} - ${errorText}`));
                    }
                } else {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                        next.resolve(data.choices[0].message.content);
                    } else {
                        this._aiUsedInWindow = Math.max(0, this._aiUsedInWindow - 1);
                        next.reject(new Error('Formato de resposta inesperado da Groq'));
                    }
                }
            } catch (e) {
                this._aiUsedInWindow = Math.max(0, this._aiUsedInWindow - 1);
                next.reject(e);
            } finally {
                this._aiProcessing = false;
                this._processAIQueue();
            }
        }, wait);
    }

    // Helpers de bloqueio global pós-429
    _getGlobalLockUntil() {
        try {
            const raw = localStorage.getItem(this._globalLockKey);
            if (!raw) return 0;
            const obj = JSON.parse(raw);
            return typeof obj.until === 'number' ? obj.until : 0;
        } catch { return 0; }
    }
    _isLockedGlobally() {
        return Date.now() < this._getGlobalLockUntil();
    }
    _setGlobalLockUntil(untilTs, consecutive429 = 1) {
        try {
            localStorage.setItem(this._globalLockKey, JSON.stringify({ until: untilTs, consecutive429, last: Date.now() }));
        } catch {}
    }
    _bump429Lock(baseDelayMs) {
        try {
            const raw = localStorage.getItem(this._globalLockKey);
            let consecutive = 0;
            let until = 0;
            if (raw) {
                const obj = JSON.parse(raw);
                consecutive = (obj && typeof obj.consecutive429 === 'number') ? obj.consecutive429 : 0;
                until = (obj && typeof obj.until === 'number') ? obj.until : 0;
            }
            consecutive = Math.min(consecutive + 1, 10);
            const jitter = Math.floor(Math.random() * 2000);
            const proposed = Date.now() + Math.min(30 * 60 * 1000, baseDelayMs * Math.pow(2, consecutive)) + jitter;
            const nextUntil = Math.max(until, proposed);
            this._setGlobalLockUntil(nextUntil, consecutive);
        } catch {}
    }

    // Enfileira uma chamada à API Groq
    _enqueueAICall(messages) {
        return new Promise((resolve, reject) => {
            this._aiQueue.push({ messages, resolve, reject, attempts: 0 });
            this._processAIQueue();
        });
    }

    async queryAI(question, context) {
        try {
            // Se não há chave (ou foi bloqueada), não tentar rede
            if (!this.apiKey || this._aiAuthBlocked) {
                return this.getFallbackResponse(question);
            }

            // Construir contexto COMPACTO para não exceder limite de tokens (12k)
            const githubData = context.githubData;
            let githubSummary = '';
            
            if (githubData && githubData.repositories) {
                // Resumir repositórios (apenas nome, linguagem e descrição curta)
                const repoList = githubData.repositories.slice(0, 5).map(r => 
                    `• ${r.name} (${r.language || 'N/A'}): ${(r.description || '').slice(0, 50)}`
                ).join('\n');
                
                githubSummary = `
GITHUB (${githubData.user?.name || 'Mikael'}):
- Repositórios: ${githubData.user?.public_repos || githubData.repositories.length}
- Principais projetos:
${repoList}`;
            }

            // System prompt COMPACTO
            const systemPrompt = `Você é Minerva, assistente IA do portfolio de Mikael Ferreira - desenvolvedor web full stack.

SOBRE MIKAEL:
- Especialidades: Engenharia de Cibersegurança, Análise de Dados, Desenvolvimento Web
- Stack: JavaScript, Python, React, Node.js, Firebase, HTML/CSS
- Contato: LinkedIn (mikaelferreira), GitHub (mikaeldmts)
${githubSummary}

PÁGINA ATUAL: ${context.currentPage || 'index'}
SEÇÃO: ${context.pageInfo?.currentSection || 'principal'}

INSTRUÇÕES:
- Responda em português, de forma objetiva e útil
- Mantenha postura profissional e centrada; evite elogios gratuitos/bajulação
- Seja claro e conciso (máximo 150 palavras)
- Se perguntarem sobre projetos, mencione os repositórios reais
- Para navegação, oriente com base na página atual
- Você é uma coruja sábia e prestativa`;

            // Formato de mensagens para Groq (compatível com OpenAI)
            const messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: question
                }
            ];

            // Chamada via fila com rate limit/backoff
            const text = await this._enqueueAICall(messages);
            return text;
            
        } catch (error) {
            // Evitar stacktrace ruidoso para erros esperados (auth/forbidden)
            const isAuthError = error && (error.code === 401 || error.code === 403);
            if (isAuthError) {
                console.warn('⚠️ Groq indisponível (auth/forbidden). Usando fallback local.');
                this._aiAuthBlocked = true;
                return this.getFallbackResponse(question);
            }

            console.error('Erro na API da Groq:', error);
            
            // Se for erro de rede ou CORS, usar fallback
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                console.log('Problema de CORS ou rede, usando respostas offline...');
                return this.getFallbackResponse(question);
            }
            
            // Se for erro de tamanho (413), usar fallback
            if (error.message && error.message.includes('413')) {
                console.log('Contexto muito grande, usando fallback...');
                return this.getFallbackResponse(question);
            }
            
            // Para outros erros da API, também usar fallback mas informar o usuário
            return `Estou com dificuldades para acessar minha IA avançada no momento, mas posso te ajudar com informações offline!\n\n${this.getFallbackResponse(question)}`;
        }
    }

    getFallbackResponse(question) {
        const lowerQuestion = question.toLowerCase();
        
        // Comandos especiais para debugging e status
        if (lowerQuestion.includes('github status') || lowerQuestion.includes('status github') || lowerQuestion.includes('verificar github')) {
            const status = this.getGitHubIntegrationStatus();
            return `Status da Integração GitHub:\n\n✅ Habilitada: ${status.enabled ? 'Sim' : 'Não'}\n📅 Última atualização: ${status.lastFetch}\n💾 Dados em cache: ${status.cacheSize} itens\n🔄 Rate limit usado: ${status.rateLimitUsed}/${status.rateLimitMax}\n👤 Dados do usuário: ${status.hasUserData ? 'Disponível' : 'Não disponível'}\n📁 Dados dos repositórios: ${status.hasReposData ? 'Disponível' : 'Não disponível'}\n🧠 Base de conhecimento atualizada: ${status.knowledgeBaseUpdated ? 'Sim' : 'Não'}\n\nA integração permite que eu acesse dados reais do GitHub para responder perguntas específicas sobre repositórios e projetos.`;
        }        if (lowerQuestion.includes('cache github') || lowerQuestion.includes('limpar cache github')) {
            const oldSize = this.githubIntegration.cache.size;
            const oldFileSize = this.githubIntegration.fileContentCache.size;
            this.githubIntegration.cache.clear();
            this.githubIntegration.fileContentCache.clear();
            return `✅ Cache do GitHub limpo! ${oldSize} metadados e ${oldFileSize} arquivos removidos. Na próxima pergunta, buscarei dados atualizados.`;
        }

        if (lowerQuestion.includes('file analysis status') || lowerQuestion.includes('status arquivos')) {
            const status = this.getFileAnalysisStatus();
            return `📄 Status da Análise de Arquivos:\n\n✅ Habilitada: ${status.enabled}\n💾 Arquivos em cache: ${status.filesCached}\n📏 Tamanho máximo: ${status.maxFileSize}\n📁 Máximo por repo: ${status.maxFilesPerRepo}\n🕒 Cache duration: ${status.cacheDuration}\n📝 Extensões suportadas: ${status.allowedExtensions.join(', ')}\n\nPosso analisar conteúdo real dos arquivos dos repositórios!`;
        }
        
        // Comandos para análise de arquivos
        if (lowerQuestion.includes('analisar arquivo') || lowerQuestion.includes('mostrar arquivo') || lowerQuestion.includes('ver arquivo')) {
            const repoMatch = lowerQuestion.match(/repositório (\w+)|repo (\w+)/);
            const fileMatch = lowerQuestion.match(/arquivo ([^\s]+)/);
            
            if (repoMatch && fileMatch) {
                const repoName = repoMatch[1] || repoMatch[2];
                const fileName = fileMatch[1];
                return `📁 Para analisar arquivos específicos, use comandos como:\n• "readme do repositório ${repoName}"\n• "package.json do ${repoName}"\n• "estrutura do ${repoName}"\n• "código do ${repoName}"\n\nPosso analisar arquivos .js, .html, .css, .json, .md, .txt, .py até 500KB.`;
            }
            
            return `📁 Comandos de análise de arquivos:\n• "readme do repositório X" - Ver documentação\n• "estrutura do repositório X" - Mapear arquivos\n• "package.json do X" - Ver dependências\n• "código javascript do X" - Analisar código\n• "buscar 'termo' no repositório X" - Buscar no código\n\nEu posso analisar o conteúdo real dos arquivos dos repositórios!`;
        }
        
        // Comandos específicos para README
        if (lowerQuestion.includes('readme') && (lowerQuestion.includes('repositório') || lowerQuestion.includes('repo'))) {
            const repoMatch = lowerQuestion.match(/repositório (\w+)|repo (\w+)/);
            if (repoMatch) {
                const repoName = repoMatch[1] || repoMatch[2];
                return `📖 Buscando README do repositório ${repoName}... (Aguarde, analisando arquivo real)`;
            }
        }
        
        // Comandos para estrutura de projeto
        if (lowerQuestion.includes('estrutura') && (lowerQuestion.includes('repositório') || lowerQuestion.includes('repo') || lowerQuestion.includes('projeto'))) {
            const repoMatch = lowerQuestion.match(/repositório (\w+)|repo (\w+)|projeto (\w+)/);
            if (repoMatch) {
                const repoName = repoMatch[1] || repoMatch[2] || repoMatch[3];
                return `🏗️ Analisando estrutura do repositório ${repoName}... (Mapeando arquivos e diretórios)`;
            }
        }
        
        // Comandos para busca em código
        if (lowerQuestion.includes('buscar') && lowerQuestion.includes('repositório')) {
            const searchMatch = lowerQuestion.match(/'([^']+)'|"([^"]+)"/);
            const repoMatch = lowerQuestion.match(/repositório (\w+)|repo (\w+)/);
            
            if (searchMatch && repoMatch) {
                const searchTerm = searchMatch[1] || searchMatch[2];
                const repoName = repoMatch[1] || repoMatch[2];
                return `🔍 Buscando "${searchTerm}" no repositório ${repoName}... (Analisando código real)`;
            }
        }
        
        // Análise inteligente de intenções (com modo conciso)
        if (lowerQuestion.includes('site') || lowerQuestion.includes('portfolio') || lowerQuestion.includes('como foi feito') || lowerQuestion.includes('desenvolvido')) {
            const concise = this.userSession?.userPreferences?.responseStyle === 'concise';
            if (concise) {
                return (
                    "Resumo do portfolio:\n" +
                    "- SPA com HTML5/CSS3/JS ES6+\n" +
                    "- Backend serverless com Firebase (Auth, Firestore, Storage)\n" +
                    "- PWA, cache offline, partículas e Minerva (IA)\n" +
                    "- Painel admin, gerador de currículo, galeria de mídia\n\n" +
                    "Destaque: design inspirado em LoL/Riot, responsivo e otimizado (SEO + Web Vitals)."
                );
            }
            return "Este portfolio foi desenvolvido com uma arquitetura moderna e tecnologias avançadas. O site é uma SPA (Single Page Application) construída com HTML5, CSS3 e JavaScript vanilla ES6+, utilizando Firebase como backend serverless para autenticação, banco de dados Firestore e storage de arquivos.\n\nPrincipais recursos: Sistema de chat em tempo real, painel administrativo completo, PWA com cache offline, sistema de partículas interativo, gerador automático de currículo, galeria de mídia administrativa e esta assistente IA powered by Google Gemini & created by Mikael.\n\nA interface foi inspirada no visual de League of Legends/Riot Games, com design responsivo e animações fluidas. Todo o código é otimizado para performance e SEO.";
        }
          if (lowerQuestion.includes('tecnologia') || lowerQuestion.includes('stack') || lowerQuestion.includes('ferramentas') || lowerQuestion.includes('framework') || lowerQuestion.includes('linguagem') || lowerQuestion.includes('programming')) {
            // Tentar usar dados reais do GitHub se disponível
            const githubData = this.getGitHubDataFromCache();
            if (githubData && githubData.repositories && githubData.repositories.length > 0) {
                const languages = {};
                githubData.repositories.forEach(repo => {
                    if (repo.language) {
                        languages[repo.language] = (languages[repo.language] || 0) + 1;
                    }
                });
                
                const sortedLanguages = Object.entries(languages)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8);
                
                let techInfo = "Stack técnica ATUAL baseada nos repositórios GitHub:\n\n";
                techInfo += "💻 Linguagens mais utilizadas:\n";
                sortedLanguages.forEach(([lang, count]) => {
                    techInfo += `• ${lang}: ${count} repositórios\n`;
                });
                
                techInfo += "\n🔧 Stack completa:\n";
                techInfo += "Frontend: HTML5, CSS3, JavaScript ES6+, Tailwind CSS, Font Awesome\n";
                techInfo += "Backend: Firebase Firestore, Firebase Auth, Firebase Storage\n";
                techInfo += "Features: PWA, Groq AI, GitHub API, Sistema de partículas WebGL\n";
                techInfo += "Ferramentas: Git, Chrome DevTools, Lighthouse, Firebase Console\n\n";
                techInfo += `📊 Dados baseados em ${githubData.repositories.length} repositórios públicos\n`;
                techInfo += `🕒 Atualizado em: ${new Date(githubData.lastUpdate).toLocaleString('pt-BR')}`;
                
                return techInfo;
            }
            
            // Fallback para informações estáticas
            return "Stack técnica completa:\n\nFrontend: HTML5 semântico, CSS3 com Flexbox/Grid, JavaScript ES6+ modular, Tailwind CSS para styling consistente, Font Awesome para ícones.\n\nBackend: Firebase Firestore (NoSQL), Firebase Authentication, Firebase Storage, Firebase Hosting.\n\nFeatures avançadas: PWA com Service Worker, sistema de cache inteligente, chat em tempo real com Firestore listeners, sistema de partículas WebGL, API integration com Groq AI, sistema de upload de arquivos, gerador de PDF dinâmico.\n\nFerramentas: Git para versionamento, Chrome DevTools para debug, Lighthouse para performance, Firebase Console para monitoramento.\n\n💡 Para ver tecnologias ATUAIS baseadas no GitHub, pergunte: 'github status' para verificar integração.";
        }
          if (lowerQuestion.includes('projeto') || lowerQuestion.includes('trabalho') || lowerQuestion.includes('exemplo') || lowerQuestion.includes('demonstração') || lowerQuestion.includes('repositório') || lowerQuestion.includes('repository')) {
            // Tentar usar dados reais do GitHub se disponível
            const githubData = this.getGitHubDataFromCache();
            if (githubData && githubData.repositories && githubData.repositories.length > 0) {
                const recentRepos = githubData.repositories.slice(0, 5);
                let projectsInfo = "Projetos ATUAIS do GitHub de Mikael Ferreira:\n\n";
                
                recentRepos.forEach((repo, index) => {
                    projectsInfo += `${index + 1}. ${repo.name}\n`;
                    if (repo.description) projectsInfo += `   ${repo.description}\n`;
                    if (repo.language) projectsInfo += `   Linguagem: ${repo.language}\n`;
                    if (repo.stars > 0) projectsInfo += `   ⭐ ${repo.stars} estrelas\n`;
                    projectsInfo += `   🔗 ${repo.url}\n\n`;
                });
                
                projectsInfo += `\n📊 Dados atualizados em: ${new Date(githubData.lastUpdate).toLocaleString('pt-BR')}\n`;
                projectsInfo += `Total de repositórios públicos: ${githubData.repositories.length}`;
                
                return projectsInfo;
            }
            
            // Fallback para informações estáticas
            return "O portfolio apresenta diversos projetos únicos:\n\n1. Sistema de Chat em Tempo Real - Implementação completa com Firebase, autenticação, histórico de mensagens e painel administrativo.\n\n2. Gerador de Currículo Dinâmico - Ferramenta que gera PDFs personalizados com dados sincronizados do GitHub.\n\n3. Painel Administrativo Completo - Interface para gestão de chats, certificados, configurações e manutenção do site.\n\n4. Jogos Interativos - Projetos em Phaser.js demonstrando habilidades em game development.\n\n5. PWA Portfolio - Aplicação progressiva com cache offline e instalação nativa.\n\n6. Sistema de Partículas - Animações WebGL otimizadas para performance.\n\nCada projeto demonstra diferentes aspectos das habilidades técnicas do Mikael.\n\n💡 Para ver projetos atuais do GitHub, pergunte: 'github status' para verificar se dados reais estão disponíveis.";
        }
        
        if (lowerQuestion.includes('contato') || lowerQuestion.includes('trabalhar') || lowerQuestion.includes('freelance') || lowerQuestion.includes('emprego') || lowerQuestion.includes('oportunidade')) {
            return "Para entrar em contato com Mikael Ferreira:\n\n1. Chat direto do site - Use o sistema de chat na página principal para enviar uma mensagem direta. Ele recebe notificações em tempo real.\n\n2. LinkedIn - Perfil profissional disponível através do botão LinkedIn no site. Ideal para networking e oportunidades profissionais.\n\n3. GitHub - Repositórios públicos com código de qualidade demonstrando expertise técnica.\n\nMikael está aberto a oportunidades de desenvolvimento web, projetos freelance, consultorias técnicas e posições full-time. Ele tem experiência em React, Node.js, Firebase, APIs REST, UI/UX design e é conhecido por entregar projetos de alta qualidade dentro do prazo.\n\nTempo de resposta típico: 24-48 horas para contatos profissionais.";
        }
        
        if (lowerQuestion.includes('mikael') || lowerQuestion.includes('desenvolvedor') || lowerQuestion.includes('quem') || lowerQuestion.includes('sobre')) {
            return "Mikael Ferreira é um desenvolvedor web full-stack apaixonado por criar experiências digitais únicas e funcionais.\n\nEspecialidades técnicas: JavaScript ES6+, React.js, Node.js, Firebase, APIs REST, HTML5/CSS3, Git, UI/UX Design, PWA development, Database design.\n\nPerfil profissional: Desenvolvedor autodidata com forte capacidade de aprendizado, sempre explorando novas tecnologias. Conhecido por escrever código limpo, bem documentado e seguir best practices. Tem experiência em projetos pessoais inovadores que demonstram criatividade e competência técnica.\n\nDiferenciais: Combina conhecimento técnico sólido com design thinking, resultando em aplicações tanto funcionais quanto visualmente atraentes. Gaming background que trouxe insights únicos para desenvolvimento de interfaces interativas.\n\nEstá sempre disposto a colaborar em projetos desafiadores e aprender novas tecnologias.";
        }
        
        if (lowerQuestion.includes('minerva') || lowerQuestion.includes('assistente') || lowerQuestion.includes('ia') || lowerQuestion.includes('como funciona')) {
            return "Sou Minerva, a assistente IA deste portfolio, powered by Groq AI & created by Mikael.\n\nFuncionalidades:\n- Respostas inteligentes sobre o site, projetos e tecnologias\n- Conhecimento detalhado sobre a estrutura do portfolio\n- Informações sobre o Mikael e suas especialidades\n- Orientação para navegação e uso do site\n- Respostas contextuais baseadas na página atual\n\nImplementação técnica: Integração com API Groq para processamento de linguagem natural, sistema de cache inteligente para respostas rápidas, fallback offline para garantir funcionamento sempre, interface modal responsiva com animações CSS.\n\nBase de conhecimento: Tenho acesso a informações detalhadas sobre toda a arquitetura do site, projetos implementados, stack técnica utilizada e informações profissionais do Mikael.\n\nPosso responder dúvidas técnicas específicas, explicar funcionalidades e ajudar com navegação pelo portfolio.";
        }
        
        if (lowerQuestion.includes('navegar') || lowerQuestion.includes('como usar') || lowerQuestion.includes('menu') || lowerQuestion.includes('páginas')) {
            return "Para navegar pelo portfolio:\n\nMenu Principal: Clique na foto de perfil (canto superior direito) para abrir o menu lateral com todas as seções disponíveis.\n\nPáginas principais:\n- Home: Apresentação geral, habilidades e projetos principais\n- Projetos: Portfolio detalhado com demonstrações\n- Currículo: CV completo e gerador de currículo personalizado\n- Certificados: Certificações e cursos em andamento\n- Galeria: Mídia e recursos visuais do site\n- Games: Projetos de jogos e aplicações interativas\n- Admin: Painel administrativo (restrito)\n\nChat Direto: Sistema de mensagens na parte inferior direita para contato direto com o Mikael.\n\nNavegação é intuitiva e responsiva, funcionando bem tanto em desktop quanto mobile.";
        }
        
        // Resposta padrão mais inteligente
        return "Sou Minerva, especialista em tudo sobre este portfolio. Posso ajudar com:\n\n• Explicações técnicas detalhadas sobre desenvolvimento\n• Informações sobre projetos e funcionalidades\n• Detalhes sobre tecnologias e arquitetura\n• Informações profissionais sobre o Mikael\n• Orientação para navegação do site\n• Esclarecimentos sobre oportunidades de colaboração\n\nPara respostas mais precisas, seja específico na sua pergunta. Exemplos:\n- 'Como foi implementado o sistema de chat?'\n- 'Quais tecnologias foram usadas no backend?'\n- 'Como posso contactar o Mikael para projetos?'\n- 'Mostre detalhes sobre os projetos React'\n\nQual aspecto específico gostaria de conhecer melhor?";
    }

    startThinking() {
        this.isThinking = true;
        const owl = document.getElementById('minerva-owl');
        const dots = document.getElementById('thinking-dots');
        
        owl.classList.add('thinking');
        dots.style.display = 'block';
    }

    stopThinking() {
        this.isThinking = false;
        const owl = document.getElementById('minerva-owl');
        const dots = document.getElementById('thinking-dots');
        
        owl.classList.remove('thinking');
        dots.style.display = 'none';
    }

    updateOwlEyes(event) {
        const owl = document.getElementById('minerva-owl');
        if (!owl) return;
        
        const rect = owl.getBoundingClientRect();
        const owlCenterX = rect.left + rect.width / 2;
        const owlCenterY = rect.top + rect.height / 2;
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const deltaX = mouseX - owlCenterX;
        const deltaY = mouseY - owlCenterY;
        
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 10, 3);
        
        const pupils = owl.querySelectorAll('.pupil');
        pupils.forEach(pupil => {
            const moveX = Math.cos(angle) * distance;
            const moveY = Math.sin(angle) * distance;
            pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }

    clearConversation() {
        const messagesContainer = document.getElementById('minerva-messages');
        const welcomeMessage = messagesContainer.querySelector('.minerva-welcome');
        
        // Manter apenas a mensagem de boas-vindas
        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(welcomeMessage);
        
        // Resetar sessão
        this.userSession.questionsAsked = 0;
        this.userSession.topics = [];
        this.userSession.conversationHistory = [];
        this.userSession.userPreferences = this.userSession.userPreferences || { responseStyle: 'concise' };
          // Limpar cache se necessário
        this.conversationCache.clear();
    }

    showVoiceFeatureComingSoon() {
        this.addMessage("Recurso de comando de voz está sendo desenvolvido! Em breve você poderá falar diretamente comigo. Por enquanto, continue digitando suas perguntas!", 'assistant');
    }

    showContextualGreeting() {
        const page = this.currentPage;
        let greeting = "";
          const pageGreetings = {
            'home': "Bem-vindo à página principal! Aqui você pode conhecer o Mikael, suas habilidades e projetos principais. Posso te guiar através de todo o portfolio!",
            'projetos': "Excelente! Está na seção de projetos. Posso explicar detalhadamente cada projeto, as tecnologias usadas e o processo de desenvolvimento!",
            'admin': "Está no painel administrativo! Posso explicar como usar todas as funcionalidades de gestão do site e como tudo foi implementado.",
            'curriculo': "Na área do gerador de currículo! Esta é uma ferramenta incrível que o Mikael desenvolveu. Posso explicar como funciona!",
            'certificados': "Vendo os certificados do Mikael! Posso falar sobre sua jornada de aprendizado e especializações.",
            'games': "Na seção de jogos! Aqui estão projetos interativos únicos. Posso explicar como foram desenvolvidos!",
            'galeria': "Na galeria de mídia! Posso explicar o sistema de upload e gerenciamento de arquivos.",
            'login': "Na área de autenticação! Posso explicar como o sistema de login foi implementado com Firebase."
        };
        
        greeting = pageGreetings[page] || "Olá! Sou a Minerva, sua assistente IA ultra-inteligente!";
        
        setTimeout(() => {
            this.addMessage('minerva', greeting);
        }, 800);
    }

    setupIdleDetection() {
        let idleTimer;
        const idleTime = 30000; // 30 segundos
          const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (this.isActive && this.userSession.questionsAsked === 0) {
                    this.addMessage("Precisa de ajuda? Estou aqui para responder qualquer pergunta sobre este portfolio, tecnologias ou sobre o Mikael!", 'assistant');
                }
            }, idleTime);
        };
        
        document.addEventListener('mousemove', resetIdleTimer);
        document.addEventListener('keypress', resetIdleTimer);
        resetIdleTimer();
    }

    setupIntelligentCache() {
        // Limpar cache antigo periodicamente
        setInterval(() => {
            if (this.conversationCache.size > 50) {
                // Manter apenas as 25 respostas mais recentes
                const entries = Array.from(this.conversationCache.entries());
                this.conversationCache.clear();
                entries.slice(-25).forEach(([key, value]) => {
                    this.conversationCache.set(key, value);
                });
            }
        }, 300000); // 5 minutos
    }

    setupConversationAnalytics() {
        // Rastrear tópicos mais perguntados para melhorar respostas
        this.topicAnalytics = new Map();
    }

    setupUltraMode() {
        // Configurar recursos avançados quando necessário
        this.ultraFeatures = {
            smartSuggestions: true,
            contextualHelp: true,
            proactiveAssistance: true
        };
    }
}

// Inicializar Minerva quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que outros scripts foram carregados
    setTimeout(() => {
        try {
            window.minerva = new MinervaUltraAssistant();
            console.log('Minerva Ultra Assistant inicializada com sucesso! Powered by Groq AI & Created by Mikael');
        } catch (error) {
            console.error('Erro ao inicializar Minerva:', error);
        }
    }, 1000);
});

// Exportar para uso em outros módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MinervaUltraAssistant;
}
