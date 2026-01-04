// ==================== SISTEMA DE CONTROLE GRANULAR DE PÁGINAS ====================

// Configuração do Firebase - reutilizando a mesma configuração
const pageControlFirebaseConfig = {
    apiKey: "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
    authDomain: "mikaelfmts.firebaseapp.com",
    projectId: "mikaelfmts",
    storageBucket: "mikaelfmts.appspot.com",
    messagingSenderId: "516762612351",
    appId: "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

// Função para verificar se uma página específica está online
async function checkPageStatus(pageId, redirectPath = '../index.html') {
    console.log(`Verificando status da página: ${pageId}`);
    
    try {
        // Importar Firebase dinamicamente
        const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
        const { getFirestore, doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        
        // Verificar se o app já foi inicializado
        let app;
        const existingApps = getApps();
        if (existingApps.length > 0) {
            app = existingApps[0];
        } else {
            app = initializeApp(pageControlFirebaseConfig);
        }
        const db = getFirestore(app);
        
        const pageControlRef = doc(db, 'configuracoes', 'controle-paginas');
        
        onSnapshot(pageControlRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const pageData = data[pageId];
                
                if (pageData && !pageData.online) {
                    // Página está offline, mostrar mensagem customizada
                    showOfflinePage(pageData, pageId);
                }
            } else {
                // Verificar localStorage como fallback
                checkPageStatusFromLocal(pageId, redirectPath);
            }
        }, (error) => {
            console.warn('Erro ao verificar status da página no Firebase, usando localStorage:', error);
            checkPageStatusFromLocal(pageId, redirectPath);
        });
        
    } catch (error) {
        console.warn('Erro ao conectar Firebase, usando localStorage:', error);
        checkPageStatusFromLocal(pageId, redirectPath);
    }
}

// Verificar status da página usando localStorage
function checkPageStatusFromLocal(pageId, redirectPath) {
    try {
        const stored = localStorage.getItem('pageControlStatus');
        if (stored) {
            const data = JSON.parse(stored);
            const pageData = data[pageId];
            
            if (pageData && !pageData.online) {
                showOfflinePage(pageData, pageId);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar localStorage:', error);
    }
}

// Mostrar página offline com mensagem customizada
function showOfflinePage(pageData, pageId) {
    // Detectar se é mobile
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    // Criar overlay de página offline
    const offlineOverlay = document.createElement('div');
    offlineOverlay.id = 'page-offline-overlay';    offlineOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #010a13 0%, #0a1428 25%, #1e2328 50%, #3c3c41 75%, #091428 100%);
        background-size: 400% 400%;
        animation: gradientShift 10s ease infinite;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Marcellus', 'Spiegel', serif;
        overflow: hidden;
        padding: ${isMobile ? '1rem' : '2rem'};
    `;
    
    // Mensagem padrão ou customizada
    const defaultMessage = "Mikael limitou o acesso a esta página por enquanto. Melhorias estão sendo implementadas.";
    const message = pageData.customMessage || defaultMessage;
    
    // Formatear data se disponível
    let maintenanceEta = '';
    if (pageData.dataManutencao) {
        try {
            const date = new Date(pageData.dataManutencao);
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            };
            maintenanceEta = `Previsão de retorno: ${date.toLocaleDateString('pt-BR', options)}`;
        } catch (error) {
            console.error('Erro ao formatar data:', error);
        }
    }
      // Adicionar estilos CSS para animações
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        
        /* Animações fluidas e modernas */
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            25% { background-position: 100% 50%; }
            50% { background-position: 50% 100%; }
            75% { background-position: 0% 0%; }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(40px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes morphIcon {
            0%, 100% {
                transform: rotate(0deg) scale(1);
                border-radius: 50%;
            }
            25% {
                transform: rotate(90deg) scale(1.1);
                border-radius: 30%;
            }
            50% {
                transform: rotate(180deg) scale(0.9);
                border-radius: 50%;
            }
            75% {
                transform: rotate(270deg) scale(1.05);
                border-radius: 40%;
            }
        }
          @keyframes prismGlow {
            0%, 100% {
                box-shadow: 
                    0 0 30px rgba(200, 170, 110, 0.4),
                    0 0 60px rgba(255, 215, 0, 0.2),
                    0 20px 40px rgba(0, 0, 0, 0.3);
            }
            33% {
                box-shadow: 
                    0 0 30px rgba(240, 230, 210, 0.4),
                    0 0 60px rgba(200, 170, 110, 0.2),
                    0 20px 40px rgba(0, 0, 0, 0.3);
            }
            66% {
                box-shadow: 
                    0 0 30px rgba(200, 170, 110, 0.4),
                    0 0 60px rgba(120, 90, 40, 0.2),
                    0 20px 40px rgba(0, 0, 0, 0.3);
            }
        }
          @keyframes glowText {
            0%, 100% { 
                text-shadow: 0 0 20px rgba(200, 170, 110, 0.5); 
            }
            50% { 
                text-shadow: 0 0 30px rgba(255, 215, 0, 0.8); 
            }
        }
        
        @keyframes slideInStagger {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
          @keyframes buttonPulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 8px 25px rgba(200, 170, 110, 0.3);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 12px 35px rgba(200, 170, 110, 0.5);
            }
        }
        
        /* Partículas flutuantes melhoradas */
        .floating-particles {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        }
        
        .particle {
            position: absolute;
            border-radius: 50%;
            animation: floatUp 12s linear infinite;
            opacity: 0;
        }
          .particle.blue {
            background: linear-gradient(45deg, #c8aa6e, #ffd700);
            width: 4px;
            height: 4px;
        }
        
        .particle.purple {
            background: linear-gradient(45deg, #f0e6d2, #c8aa6e);
            width: 3px;
            height: 3px;
        }
        
        .particle.green {
            background: linear-gradient(45deg, #785a28, #c8aa6e);
            width: 5px;
            height: 5px;
        }
        
        @keyframes floatUp {
            0% {
                transform: translateY(100vh) scale(0) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateY(-20px) scale(1) rotate(360deg);
                opacity: 0;
            }
        }
        
        /* Sistema de partículas escalonado */
        .particle:nth-child(1) { left: 5%; animation-delay: 0s; animation-duration: 10s; }
        .particle:nth-child(2) { left: 15%; animation-delay: 1.5s; animation-duration: 12s; }
        .particle:nth-child(3) { left: 25%; animation-delay: 3s; animation-duration: 8s; }
        .particle:nth-child(4) { left: 35%; animation-delay: 0.8s; animation-duration: 14s; }
        .particle:nth-child(5) { left: 45%; animation-delay: 2.2s; animation-duration: 9s; }
        .particle:nth-child(6) { left: 55%; animation-delay: 4s; animation-duration: 11s; }
        .particle:nth-child(7) { left: 65%; animation-delay: 1.2s; animation-duration: 13s; }
        .particle:nth-child(8) { left: 75%; animation-delay: 3.5s; animation-duration: 10s; }
        .particle:nth-child(9) { left: 85%; animation-delay: 0.3s; animation-duration: 15s; }
        .particle:nth-child(10) { left: 95%; animation-delay: 2.8s; animation-duration: 12s; }
        
        /* Responsividade aprimorada */
        @media (max-width: 768px) {
            .maintenance-card {
                margin: 0.5rem !important;
                padding: 2rem 1.25rem !important;
                max-width: calc(100vw - 1rem) !important;
                border-radius: 20px !important;
            }
            
            .maintenance-title {
                font-size: 1.6rem !important;
                letter-spacing: 0.5px !important;
                margin-bottom: 1rem !important;
            }
            
            .maintenance-icon {
                width: 60px !important;
                height: 60px !important;
                font-size: 1.5rem !important;
                margin-bottom: 1.5rem !important;
            }
            
            .maintenance-message {
                font-size: 0.95rem !important;
                line-height: 1.5 !important;
                margin-bottom: 1.5rem !important;
            }
            
            .maintenance-button {
                padding: 14px 20px !important;
                font-size: 0.9rem !important;
                width: 100% !important;
                margin-top: 1.5rem !important;
                border-radius: 10px !important;
            }
            
            .eta-card {
                padding: 1rem !important;
                margin: 1.5rem 0 !important;
                border-radius: 12px !important;
            }
            
            .decorative-line {
                width: 40px !important;
                margin-bottom: 1.5rem !important;
            }
        }
        
        @media (max-width: 480px) {
            .maintenance-card {
                padding: 1.5rem 1rem !important;
                border-radius: 16px !important;
            }
            
            .maintenance-title {
                font-size: 1.4rem !important;
                letter-spacing: 0px !important;
            }
            
            .maintenance-icon {
                width: 50px !important;
                height: 50px !important;
                font-size: 1.3rem !important;
            }
            
            .maintenance-message {
                font-size: 0.9rem !important;
            }
        }
        
        @media (min-width: 1200px) {
            .maintenance-card {
                max-width: 600px !important;
                padding: 3.5rem 3rem !important;
            }
            
            .maintenance-title {
                font-size: 2.5rem !important;
            }
            
            .maintenance-icon {
                width: 100px !important;
                height: 100px !important;
                font-size: 2.5rem !important;
            }
        }
        
        /* Efeitos de hover melhorados */
        .maintenance-button:hover {
            animation: buttonPulse 1s ease-in-out infinite;
        }
        
        .maintenance-card:hover {
            transform: translateY(-5px);
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
      offlineOverlay.innerHTML = `
        <!-- Partículas flutuantes melhoradas -->
        <div class="floating-particles">
            <div class="particle blue"></div>
            <div class="particle purple"></div>
            <div class="particle green"></div>
            <div class="particle blue"></div>
            <div class="particle purple"></div>
            <div class="particle green"></div>
            <div class="particle blue"></div>
            <div class="particle purple"></div>
            <div class="particle green"></div>
            <div class="particle blue"></div>
        </div>
        
        <!-- Grid de fundo sutil -->
        <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;            background-image: 
                linear-gradient(rgba(200, 170, 110, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200, 170, 110, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            pointer-events: none;
            opacity: 0.5;
        "></div>
        
        <div class="maintenance-card" style="
            position: relative;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: ${isMobile ? '20px' : '28px'};
            padding: ${isMobile ? '2rem 1.25rem' : isTablet ? '2.5rem 2rem' : '3.5rem 3rem'};
            max-width: ${isMobile ? 'calc(100vw - 1rem)' : isTablet ? '520px' : '600px'};
            margin: ${isMobile ? '0.5rem' : '2rem'};
            text-align: center;
            animation: fadeInUp 1s ease-out;
            box-shadow: 
                0 30px 80px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.03),
                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                inset 0 -1px 0 rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        ">
            <!-- Efeito de brilho de fundo -->
            <div style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(79, 172, 254, 0.08) 0%, transparent 70%);
                animation: morphIcon 8s ease-in-out infinite;
                pointer-events: none;
            "></div>
            
            <!-- Ícone moderno com efeitos visuais -->            <div class="maintenance-icon" style="
                width: ${isMobile ? '60px' : isTablet ? '80px' : '100px'};
                height: ${isMobile ? '60px' : isTablet ? '80px' : '100px'};
                background: linear-gradient(135deg, #c8aa6e 0%, #ffd700 50%, #785a28 100%);
                border-radius: 50%;
                margin: 0 auto ${isMobile ? '1.5rem' : '2rem'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isMobile ? '1.5rem' : isTablet ? '2rem' : '2.5rem'};
                color: #010a13;
                animation: morphIcon 6s ease-in-out infinite, prismGlow 4s ease-in-out infinite;
                position: relative;
                z-index: 2;
                overflow: hidden;
            ">
                <i class="fas fa-cogs" style="position: relative; z-index: 1;"></i>                <!-- Efeito prisma rotativo -->
                <div style="
                    position: absolute;
                    inset: -3px;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, #c8aa6e, #ffd700, #785a28, #f0e6d2, #c8aa6e);
                    animation: morphIcon 4s linear infinite reverse;
                    z-index: -1;
                    opacity: 0.8;
                "></div>
                <!-- Reflexo interno -->
                <div style="
                    position: absolute;
                    top: 15%;
                    left: 15%;
                    width: 30%;
                    height: 30%;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    blur: 4px;
                    z-index: 1;
                "></div>
            </div>
            
            <!-- Título com efeito de brilho -->
            <h1 class="maintenance-title" style="
                font-family: 'Inter', sans-serif;
                font-size: ${isMobile ? '1.6rem' : isTablet ? '2rem' : '2.5rem'};
                font-weight: 800;
                color: #ffffff;
                margin-bottom: ${isMobile ? '1rem' : '1.5rem'};
                letter-spacing: ${isMobile ? '0.5px' : isTablet ? '1px' : '2px'};
                text-transform: uppercase;                background: linear-gradient(135deg, #c8aa6e 0%, #ffd700 50%, #f0e6d2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: slideInStagger 1s ease-out 0.3s both, glowText 3s ease-in-out infinite;
                position: relative;
                z-index: 2;
            ">
                Página em Manutenção
            </h1>
            
            <!-- Linha decorativa animada -->            <div class="decorative-line" style="
                width: ${isMobile ? '40px' : '60px'};
                height: 4px;
                background: linear-gradient(90deg, #c8aa6e, #ffd700, #f0e6d2);
                margin: 0 auto ${isMobile ? '1.5rem' : '2rem'};
                border-radius: 2px;
                animation: slideInStagger 1s ease-out 0.5s both;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
                    animation: gradientShift 2s ease-in-out infinite;
                "></div>
            </div>
            
            <!-- Mensagem principal -->
            <p class="maintenance-message" style="
                font-size: ${isMobile ? '0.95rem' : isTablet ? '1.05rem' : '1.1rem'};
                line-height: ${isMobile ? '1.5' : '1.7'};
                color: rgba(255, 255, 255, 0.85);
                margin-bottom: ${isMobile ? '1.5rem' : '2rem'};
                font-weight: 400;
                max-width: ${isMobile ? '300px' : '450px'};
                margin-left: auto;
                margin-right: auto;
                animation: slideInStagger 1s ease-out 0.7s both;
                position: relative;
                z-index: 2;
                font-family: 'Inter', sans-serif;
            ">
                ${message}
            </p>
              ${maintenanceEta ? `                <!-- Card de previsão futurístico -->
                <div class="eta-card" style="
                    background: linear-gradient(135deg, rgba(200, 170, 110, 0.08), rgba(255, 215, 0, 0.08));
                    border: 1px solid rgba(200, 170, 110, 0.15);
                    border-radius: ${isMobile ? '12px' : '16px'};
                    padding: ${isMobile ? '1rem' : '1.25rem'};
                    margin: ${isMobile ? '1.5rem 0' : '2rem 0'};
                    position: relative;
                    overflow: hidden;
                    animation: slideInStagger 1s ease-out 0.9s both;
                    backdrop-filter: blur(10px);
                ">
                    <!-- Efeito de escaneamento -->
                    <div style="
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(79, 172, 254, 0.1), transparent);
                        animation: gradientShift 4s linear infinite;
                    "></div>
                      <!-- Pontos decorativos -->
                    <div style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 4px;
                        height: 4px;
                        background: #c8aa6e;
                        border-radius: 50%;
                        animation: prismGlow 2s ease-in-out infinite;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 10px;
                        right: 20px;
                        width: 3px;
                        height: 3px;
                        background: #ffd700;
                        border-radius: 50%;
                        animation: prismGlow 2s ease-in-out infinite 0.5s;
                    "></div>
                    
                    <p style="                        color: #c8aa6e;
                        font-size: ${isMobile ? '0.9rem' : '1rem'};
                        font-weight: 500;
                        margin: 0;
                        position: relative;
                        z-index: 1;
                        font-family: 'Marcellus', serif;
                        letter-spacing: 0.5px;
                    ">                        <i class="fas fa-clock" style="
                            margin-right: 0.5rem; 
                            animation: morphIcon 3s ease-in-out infinite;
                            color: #ffd700;
                        "></i>
                        ${maintenanceEta}
                    </p>
                </div>
            ` : ''}
              <!-- Indicador de status -->
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: ${isMobile ? '1.5rem' : '2rem'};
                animation: slideInStagger 1s ease-out 1.1s both;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: #c8aa6e;
                    border-radius: 50%;
                    margin-right: 0.5rem;
                    animation: prismGlow 1.5s ease-in-out infinite;
                "></div>                <span style="
                    color: rgba(240, 230, 210, 0.7);
                    font-size: ${isMobile ? '0.8rem' : '0.85rem'};
                    font-weight: 500;
                    font-family: 'Marcellus', serif;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                ">
                    Sistema Offline
                </span>
            </div>
              <!-- Botão futurístico -->
            <button class="maintenance-button" onclick="window.location.href='../index.html'" style="
                background: linear-gradient(135deg, #c8aa6e 0%, #ffd700 100%);
                color: #010a13;
                border: none;
                padding: ${isMobile ? '14px 20px' : '16px 32px'};
                border-radius: ${isMobile ? '10px' : '12px'};
                font-size: ${isMobile ? '0.9rem' : '1rem'};
                font-weight: 600;
                font-family: 'Marcellus', serif;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 25px rgba(200, 170, 110, 0.3);
                animation: slideInStagger 1s ease-out 1.3s both;
                ${isMobile ? 'width: 100%; margin-top: 1.5rem;' : ''}
                text-transform: uppercase;
                letter-spacing: 1px;            " onmouseover="
                this.style.transform = 'translateY(-3px) scale(1.02)';
                this.style.boxShadow = '0 15px 40px rgba(200, 170, 110, 0.5)';
            " onmouseout="
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 8px 25px rgba(200, 170, 110, 0.3)';
            " ontouchstart="
                this.style.transform = 'translateY(-2px) scale(0.98)';
            " ontouchend="
                this.style.transform = 'translateY(0) scale(1)';
            ">
                <!-- Efeito de brilho do botão -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transition: left 0.6s ease;
                "></div>
                
                <span style="position: relative; z-index: 1;">
                    <i class="fas fa-home" style="margin-right: 0.5rem;"></i>
                    Voltar ao Início
                </span>
            </button>
            
            <!-- Código de status decorativo -->
            <div style="
                position: absolute;
                bottom: 15px;
                right: 15px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.3);
                font-weight: 400;
                letter-spacing: 1px;
                animation: slideInStagger 1s ease-out 1.5s both;
            ">
                ERROR_503
            </div>
        </div>
    `;
    
    // Adicionar overlay ao body
    document.body.appendChild(offlineOverlay);
    
    // Esconder conteúdo da página
    document.body.style.overflow = 'hidden';
    
    // Adicionar estilo para ícones FontAwesome se não estiver carregado
    if (!document.querySelector('link[href*="fontawesome"]')) {
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesome);
    }
}

// Verificar também o sistema de manutenção geral (mantendo compatibilidade)
async function checkMaintenanceStatus() {
    try {
        // Importar Firebase dinamicamente
        const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
        const { getFirestore, doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        
        // Verificar se o app já foi inicializado
        let app;
        const existingApps = getApps();
        if (existingApps.length > 0) {
            app = existingApps[0];
        } else {
            app = initializeApp(pageControlFirebaseConfig);
        }
        const db = getFirestore(app);
        
        const maintenanceRef = doc(db, 'configuracoes', 'manutencao');
        
        onSnapshot(maintenanceRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.ativo) {
                    window.location.href = '../index.html';
                }
            } else {
                // Verificar localStorage como fallback
                checkMaintenanceFromLocal();
            }
        }, (error) => {
            console.warn('Erro ao verificar manutenção no Firebase, usando localStorage:', error);
            checkMaintenanceFromLocal();
        });
    } catch (error) {
        console.warn('Erro ao conectar Firebase, usando localStorage:', error);
        checkMaintenanceFromLocal();
    }
}

function checkMaintenanceFromLocal() {
    try {
        const stored = localStorage.getItem('maintenanceStatus');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.ativo) {
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar localStorage:', error);
    }
}

// Função de inicialização para páginas
function initPageControl(pageId) {
    console.log(`Inicializando controle para página: ${pageId}`);
    
    // Aplicar delay para garantir carregamento da página
    setTimeout(() => {
        // Verificar manutenção geral primeiro
        checkMaintenanceStatus();
        
        // Depois verificar status específico da página
        setTimeout(() => {
            checkPageStatus(pageId);
        }, 500);
    }, 1000);
}

// Exportar função principal
window.initPageControl = initPageControl;
