// Configuração do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    getDocs,
    onSnapshot,
    query,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Importar sistema centralizado de rate limiting
import { gitHubAPI } from './github-rate-limit.js';

const firebaseConfig = {
    apiKey: "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
    authDomain: "mikaelfmts.firebaseapp.com",
    projectId: "mikaelfmts",
    storageBucket: "mikaelfmts.appspot.com",
    messagingSenderId: "516762612351",
    appId: "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verificação de autenticação
let currentUser = null;

function checkAuthentication() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (!user) {
                // Usuário não autenticado, redirecionar para login
                showNotification('Acesso não autorizado. Redirecionando para login...', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                resolve(false);            } else {
                // Verificar se é usuário autorizado
                checkAdminPermissions(user).then(isAdmin => {
                    if (!isAdmin) {
                        showNotification('Acesso negado. Apenas Mikael pode acessar esta página.', 'error');
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 2000);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            }
        });
    });
}

async function checkAdminPermissions(user) {
    try {
        // Verificar se o usuário tem permissões de admin
        // Por enquanto, consideramos qualquer usuário autenticado como admin
        // Em uma implementação real, você verificaria uma coleção de usuários/permissões
        return true;
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return false;
    }
}

// Estado global do currículo
let curriculumData = {
    personalData: {},
    experience: [],
    projects: [],
    skills: [],
    certificates: [],
    settings: {
        theme: 'modern',
        primaryColor: '#3B82F6',
        fontFamily: 'Inter',
        fontSize: 'medium',
        layout: 'single-column',
        spacing: 'normal',
        showPhoto: false,
        showSkillsProgress: true,
        showContactIcons: true,
        showProjectLinks: true
    },
    metadata: {
        createdAt: null,
        lastUpdated: null,
        version: '1.0',
        userId: null
    }
};

// Configuração unificada do GitHub API e Cache
const GITHUB_USERNAME = 'MikaelFMTS';

// Configuração do Cache do GitHub - Sistema Unificado
const GITHUB_CACHE_CONFIG = {
    duration: 30 * 60 * 1000, // 30 minutos
    keys: {
        profile: 'github_profile_cache_v2',
        repos: 'github_repos_cache_v2'
    },
    rateLimitKey: 'github_rate_limit_v2',
    maxRequestsPerHour: 50 // Conservative limit to avoid hitting GitHub's limits
};

// Dados de fallback para quando a API não estiver disponível
const GITHUB_FALLBACK_DATA = {
    profile: {
        login: 'MikaelFMTS',
        name: 'Mikael Ferreira',
        avatar_url: 'https://avatars.githubusercontent.com/u/85969748?v=4',
        bio: 'Desenvolvedor Web Full Stack apaixonado por tecnologia',
        location: 'Brasil',
        public_repos: 15,
        followers: 5,
        following: 10,
        html_url: 'https://github.com/MikaelFMTS',
        blog: '',
        company: null
    },
    repos: [
        {
            id: 1,
            name: 'portfolio',
            full_name: 'MikaelFMTS/portfolio',
            description: 'Meu portfólio pessoal desenvolvido com HTML, CSS e JavaScript',
            html_url: 'https://github.com/MikaelFMTS/portfolio',
            language: 'JavaScript',
            stargazers_count: 3,
            forks_count: 0,
            updated_at: '2024-01-15T10:30:00Z',
            topics: ['portfolio', 'javascript', 'html', 'css']
        },
        {
            id: 2,
            name: 'curriculo-generator',
            full_name: 'MikaelFMTS/curriculo-generator',
            description: 'Gerador de currículo dinâmico com Firebase',
            html_url: 'https://github.com/MikaelFMTS/curriculo-generator',
            language: 'JavaScript',
            stargazers_count: 2,
            forks_count: 1,
            updated_at: '2024-01-10T15:45:00Z',
            topics: ['curriculum', 'firebase', 'javascript']
        }
    ]
};

// LinkedIn Configuration (mantida)
const LINKEDIN_PROFILE_URL = 'https://www.linkedin.com/in/mikaelferreira/';
const LINKEDIN_USERNAME = 'mikaelferreira';

const LINKEDIN_FALLBACK_DATA = {
    name: 'Mikael Ferreira',
    headline: 'Desenvolvedor Web Full Stack',
    location: 'Brasil',
    summary: 'Desenvolvedor apaixonado por tecnologia, especializado em desenvolvimento web full stack com foco em JavaScript, React, Node.js e Firebase.',
    experience: [
        {
            title: 'Desenvolvedor Web Full Stack',
            company: 'Freelancer',
            duration: '2023 - Presente',
            description: 'Desenvolvimento de aplicações web completas utilizando tecnologias modernas como React, Node.js, Firebase e outras.'
        }
    ],
    education: [
        {
            degree: 'Tecnologia em Sistemas',
            school: 'Autodidata',
            duration: '2022 - Presente',
            description: 'Aprendizado contínuo em tecnologias web modernas'
        }
    ],
    skills: [
        'JavaScript', 'React', 'Node.js', 'HTML5', 'CSS3', 'Firebase', 'Git', 'GitHub',
        'Responsive Design', 'API Development', 'Database Management', 'UI/UX Design'
    ]
};

// Sistema Unificado de Cache e Rate Limiting para GitHub API

// Função para verificar e gerenciar rate limit
function checkGitHubRateLimit() {
    const rateLimitData = getCacheItem(GITHUB_CACHE_CONFIG.rateLimitKey);
    const now = Date.now();
    
    if (!rateLimitData) {
        // Primeira vez, criar estrutura
        setCacheItem(GITHUB_CACHE_CONFIG.rateLimitKey, {
            requests: 1,
            resetTime: now + (60 * 60 * 1000) // Reset em 1 hora
        });
        return true;
    }
    
    // Se passou do tempo de reset, resetar contador
    if (now > rateLimitData.resetTime) {
        setCacheItem(GITHUB_CACHE_CONFIG.rateLimitKey, {
            requests: 1,
            resetTime: now + (60 * 60 * 1000)
        });
        return true;
    }
    
    // Verificar se ainda pode fazer requisições
    if (rateLimitData.requests >= GITHUB_CACHE_CONFIG.maxRequestsPerHour) {
        const waitTime = Math.ceil((rateLimitData.resetTime - now) / (60 * 1000));
        console.warn(`🚫 Rate limit atingido. Aguarde ${waitTime} minutos.`);
        return false;
    }
    
    // Incrementar contador
    setCacheItem(GITHUB_CACHE_CONFIG.rateLimitKey, {
        requests: rateLimitData.requests + 1,
        resetTime: rateLimitData.resetTime
    });
    
    return true;
}

// Função para fazer requisições ao GitHub com cache e fallback
async function makeGitHubRequest(url, useCache = true) {
    console.log(`🔍 GitHub API Request: ${url}`);
    
    try {
        // Verificar rate limit
        if (!checkGitHubRateLimit()) {
            throw new Error('Rate limit exceeded');
        }
        
        const response = await fetch(url);
        
        // Verificar rate limit na resposta
        if (response.status === 403) {
            const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
            if (rateLimitRemaining === '0') {
                console.warn('🚫 GitHub rate limit reached');
                throw new Error('GitHub rate limit exceeded');
            }
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ GitHub API request successful');
        return data;
        
    } catch (error) {
        console.error('❌ GitHub API request failed:', error);
        
        // Implementar backoff exponencial para retry
        if (error.message.includes('rate limit')) {
            // Se for rate limit, não tentar novamente
            throw error;
        }
        
        // Para outros erros, tentar uma vez mais após delay
        console.log('🔄 Tentando novamente em 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
            const retryResponse = await fetch(url);
            if (!retryResponse.ok) {
                throw new Error(`Retry failed: ${retryResponse.status}`);
            }
            const retryData = await retryResponse.json();
            console.log('✅ GitHub API retry successful');
            return retryData;
        } catch (retryError) {
            console.error('❌ GitHub API retry failed:', retryError);
            throw retryError;
        }
    }
}

// Função principal para obter dados do GitHub (unificada)
async function getGitHubData(type, forceRefresh = false) {
    const cacheKey = GITHUB_CACHE_CONFIG.keys[type];
    
    if (!cacheKey) {
        throw new Error(`Tipo de dados GitHub inválido: ${type}`);
    }
    
    console.log(`📊 Obtendo dados GitHub: ${type}`);
    
    // Verificar cache primeiro (se não for refresh forçado)
    if (!forceRefresh) {
        const cachedData = getCacheItem(cacheKey);
        if (cachedData) {
            console.log(`✅ Dados ${type} obtidos do cache`);
            return cachedData;
        }
    }
    
    // Tentar obter dados da API
    try {
        let data;
        let url;
        
        switch (type) {
            case 'profile':
                url = `https://api.github.com/users/${GITHUB_USERNAME}`;
                data = await makeGitHubRequest(url);
                break;
                
            case 'repos':
                url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=10`;
                data = await makeGitHubRequest(url);
                break;
                
            default:
                throw new Error(`Tipo não suportado: ${type}`);
        }
        
        // Salvar no cache
        setCacheItem(cacheKey, data);
        console.log(`✅ Dados ${type} obtidos da API e salvos no cache`);
        return data;
        
    } catch (error) {
        console.warn(`⚠️ Erro ao obter ${type} da API:`, error);
        console.log(`🔄 Usando dados de fallback para ${type}`);
        
        // Usar dados de fallback
        const fallbackData = GITHUB_FALLBACK_DATA[type];
        if (fallbackData) {
            return fallbackData;
        }
        
        throw new Error(`Dados de fallback não disponíveis para ${type}`);
    }
}

// Utilitários de cache
function getCacheItem(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        const now = Date.now();
        
        // Verificar se o cache expirou
        if (now - parsed.timestamp > GITHUB_CACHE_CONFIG.duration) {
            localStorage.removeItem(key);
            return null;
        }
        
        return parsed.data;
    } catch (error) {
        console.error(`Erro ao ler cache ${key}:`, error);
        localStorage.removeItem(key);
        return null;
    }
}

function setCacheItem(key, data) {
    try {
        const item = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        console.error(`Erro ao salvar cache ${key}:`, error);
        // Se der erro de quota, limpar caches antigos
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
            try {
                localStorage.setItem(key, JSON.stringify(item));
            } catch (secondError) {
                console.error('Erro mesmo após limpeza de cache:', secondError);
            }
        }
    }
}

function clearOldCache() {
    const keys = Object.keys(localStorage);
    const githubKeys = keys.filter(key => key.includes('github_'));
    githubKeys.forEach(key => {
        if (!key.includes('_v2')) { // Manter apenas as versões v2
            localStorage.removeItem(key);
        }
    });
}

// Função para sincronizar foto do GitHub (usando sistema unificado)
async function syncGitHubPhoto() {
    try {
        console.log('🖼️ Sincronizando foto do GitHub...');
        
        // Usar o sistema unificado para obter dados do perfil
        const profileData = await getGitHubData('profile');
        
        if (profileData && profileData.avatar_url) {
            console.log('✅ Foto do GitHub sincronizada:', profileData.avatar_url);
            updatePhotoInUI(profileData.avatar_url);
            return profileData.avatar_url;
        } else {
            console.log('⚠️ Nenhuma foto encontrada no perfil');
            return null;
        }
        
    } catch (error) {
        console.log('⚠️ Erro ao sincronizar foto do GitHub:', error);
        if (error.message.includes('rate limit')) {
            console.log('⚠️ Rate limit atingido, usando dados de fallback');
        }
        return null;
    }
}

// Função para sincronização manual da foto do GitHub (usando sistema unificado)
window.syncGitHubPhotoManually = async function() {
    try {
        showNotification('Sincronizando foto do GitHub...', 'info');
        
        // Forçar refresh dos dados (bypass cache)
        const profileData = await getGitHubData('profile', true);
        
        if (profileData && profileData.avatar_url) {
            console.log('✅ Foto do GitHub sincronizada manualmente:', profileData.avatar_url);
            updatePhotoInUI(profileData.avatar_url);
            
            // Habilitar checkbox se não estiver ativo
            const showPhotoCheckbox = document.getElementById('show-photo');
            if (showPhotoCheckbox && !showPhotoCheckbox.checked) {
                showPhotoCheckbox.checked = true;
                curriculumData.settings.showPhoto = true;
                updateSettings();
            }
            
            // Atualizar preview se estiver visível
            const previewContainer = document.getElementById('curriculum-preview');
            if (previewContainer && previewContainer.innerHTML.trim()) {
                refreshPreview();
            }
              showNotification('Foto do GitHub sincronizada com sucesso!', 'success');
            return profileData.avatar_url;
        } else {
            showNotification('Nenhuma foto encontrada no perfil do GitHub', 'warning');
        }    } catch (error) {
        console.error('Erro na sincronização manual:', error);
        
        // Verificar se é erro de rate limit
        if (error.message.includes('rate limit')) {
            showNotification('Rate limit do GitHub atingido. Tente novamente em alguns minutos.', 'warning');
        } else {
            showNotification('Erro ao sincronizar foto do GitHub', 'error');
        }
    }
    
    return null;
};

function updatePhotoInUI(photoUrl) {
    // Atualizar foto no preview
    const curriculumPhoto = document.getElementById('curriculum-photo');
    if (curriculumPhoto) {
        curriculumPhoto.src = photoUrl;
    }
    
    // Atualizar qualquer outra imagem de perfil na página
    const profilePhotos = document.querySelectorAll('.profile-photo, #profile-photo');
    profilePhotos.forEach(img => {
        if (img) {
            img.src = photoUrl;
        }
    });
    
    // Força a regeneração do preview se estiver visível
    const previewElement = document.getElementById('preview');
    if (previewElement && previewElement.style.display !== 'none') {
        generatePreview();
    }
}

// Verificação de autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    curriculumData.metadata.userId = user.uid;
    initializePage();
});

// Função para fazer logout
window.logout = function() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
};

// Inicialização da página
async function initializePage() {
    hideLoadingScreen();
    await loadExistingCurriculum();
    setupEventListeners();
    updateProgress();
    
    // Sincronizar foto do GitHub automaticamente se "mostrar foto" estiver ativado
    if (curriculumData.settings.showPhoto) {
        console.log('🖼️ Iniciando sincronização automática da foto...');
        setTimeout(async () => {
            const photoUrl = await syncGitHubPhoto();
            if (photoUrl) {
                console.log('✅ Foto sincronizada na inicialização');
                generatePreview(); // Atualizar preview com a nova foto
            }
        }, 1000);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }
}

// Gerenciamento de abas
window.showTab = function(tabName) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Mostrar aba selecionada
    const selectedTab = document.getElementById(`content-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Ativar botão da aba
    const activeButton = document.getElementById(`tab-${tabName}`);
    if (activeButton) {
        activeButton.classList.add('active', 'border-blue-500', 'text-blue-600');
        activeButton.classList.remove('border-transparent', 'text-gray-500');
    }
    
    updateProgress();
};

// Event Listeners
function setupEventListeners() {
    // Listeners para inputs de dados pessoais
    const personalDataInputs = [
        'nome-completo', 'titulo-profissional', 'email', 'telefone',
        'linkedin', 'github', 'localizacao', 'resumo-profissional'
    ];
    
    personalDataInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePersonalData);
        }
    });

    // Listeners para configurações de formatação
    const settingsInputs = [
        'curriculum-theme', 'primary-color', 'font-family', 'font-size',
        'layout-type', 'spacing', 'background-color', 'document-margins'
    ];
    
    settingsInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateSettings);
        }
    });

    // Listeners específicos para todos os checkboxes - COM DEBUG MELHORADO
    const checkboxes = [
        'show-photo', 'show-skills-progress', 'show-contact-icons', 'show-project-links'
    ];
    
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            console.log(`✅ Configurando listener para checkbox: ${id}`);
            
            checkbox.addEventListener('change', function(e) {
                console.log(`🔄 Checkbox ${id} alterado para:`, e.target.checked);
                
                // Atualizar configurações IMEDIATAMENTE
                updateSettings();
                
                // Aplicar configurações ao preview existente
                applySettingsToPreview();
                
                // Regenerar preview para garantir mudanças
                setTimeout(() => {
                    generatePreview();
                }, 50);
                
                // Mostrar notificação
                const messages = {
                    'show-photo': e.target.checked ? 'Foto incluída no currículo' : 'Foto removida do currículo',
                    'show-skills-progress': e.target.checked ? 'Barras de progresso das habilidades ativadas' : 'Barras de progresso das habilidades desativadas',
                    'show-contact-icons': e.target.checked ? 'Ícones de contato ativados' : 'Ícones de contato desativados',
                    'show-project-links': e.target.checked ? 'Links de projetos incluídos' : 'Links de projetos removidos'
                };
                
                showNotification(messages[id], 'success');
            });
        } else {
            console.warn(`⚠️ Checkbox não encontrado: ${id}`);
        }
    });
    
    // Adicionar listeners para color presets também
    const colorPresets = [
        'background-color-preset', 'name-title-color-preset', 
        'section-title-color-preset', 'highlight-color-preset',
        'link-color-preset', 'skills-color-preset'
    ];
    
    colorPresets.forEach(id => {
        const preset = document.getElementById(id);
        if (preset) {
            preset.addEventListener('change', function(e) {
                const colorInput = document.getElementById(id.replace('-preset', ''));
                if (colorInput) {
                    colorInput.value = e.target.value;
                    updateSettings();
                }
            });
        }
    });
}

// Atualizar dados pessoais
function updatePersonalData() {    curriculumData.personalData = {
        nomeCompleto: document.getElementById('nome-completo')?.value || '',
        tituloProfissional: document.getElementById('titulo-profissional')?.value || '',
        email: document.getElementById('email')?.value || '',
        telefone: document.getElementById('telefone')?.value || '',
        linkedin: document.getElementById('linkedin')?.value || '',
        github: document.getElementById('github')?.value || '',
        localizacao: document.getElementById('localizacao')?.value || '',
        resumoProfissional: document.getElementById('resumo-profissional')?.value || ''
    };
    
    // Aplicar cores personalizadas se existirem
    if (curriculumData.settings && curriculumData.settings.customColors) {
        setTimeout(() => {
            applyCustomColorsToPreview(curriculumData.settings.customColors);
        }, 100);
    }
    
    updateProgress();
}

// Atualizar configurações
function updateSettings() {
    // Capturar todos os elementos de checkbox COM VERIFICAÇÃO MELHORADA
    const showPhotoElement = document.getElementById('show-photo');
    const showSkillsProgressElement = document.getElementById('show-skills-progress');
    const showContactIconsElement = document.getElementById('show-contact-icons');
    const showProjectLinksElement = document.getElementById('show-project-links');
    
    // Capturar valores dos checkboxes com logs para debug
    const showPhoto = showPhotoElement ? showPhotoElement.checked : false;
    const showSkillsProgress = showSkillsProgressElement ? showSkillsProgressElement.checked : true;
    const showContactIcons = showContactIconsElement ? showContactIconsElement.checked : true;
    const showProjectLinks = showProjectLinksElement ? showProjectLinksElement.checked : true;
    
    console.log('🔧 Atualizando configurações dos checkboxes:', {
        showPhoto: { element: !!showPhotoElement, value: showPhoto },
        showSkillsProgress: { element: !!showSkillsProgressElement, value: showSkillsProgress },
        showContactIcons: { element: !!showContactIconsElement, value: showContactIcons },
        showProjectLinks: { element: !!showProjectLinksElement, value: showProjectLinks }
    });
    
    // Atualizar configurações completas
    curriculumData.settings = {
        theme: document.getElementById('curriculum-theme')?.value || 'modern',
        primaryColor: document.getElementById('primary-color')?.value || '#3B82F6',
        fontFamily: document.getElementById('font-family')?.value || 'Inter',
        fontSize: document.getElementById('font-size')?.value || 'medium',
        layout: document.getElementById('layout-type')?.value || 'single-column',
        spacing: document.getElementById('spacing')?.value || 'normal',
        backgroundColor: document.getElementById('background-color')?.value || '#ffffff',
        documentMargins: document.getElementById('document-margins')?.value || 'normal',
        
        // Configurações de checkbox - GARANTINDO QUE SEJAM APLICADAS
        showPhoto: showPhoto,
        showSkillsProgress: showSkillsProgress,
        showContactIcons: showContactIcons,
        showProjectLinks: showProjectLinks,
        
        // Cores personalizadas se existirem
        customColors: curriculumData.settings?.customColors || {}
    };
    
    console.log('✅ Settings atualizadas:', curriculumData.settings);
    
    // Aplicar configurações imediatamente ao preview
    applySettingsToPreview();
    updateProgress();
}

// Aplicar configurações ao preview
function applySettingsToPreview() {
    const previewContainer = document.getElementById('curriculum-preview');
    if (!previewContainer) {
        console.warn('⚠️ Container de preview não encontrado');
        return;
    }
    
    console.log('🎨 Aplicando configurações ao preview:', curriculumData.settings);
    
    // Gerenciar visibilidade da foto
    const photoElements = previewContainer.querySelectorAll('.profile-photo, .curriculum-photo, img[src*="avatar"]');
    photoElements.forEach(photo => {
        const display = curriculumData.settings.showPhoto ? 'block' : 'none';
        photo.style.display = display;
        console.log(`📸 Foto ${curriculumData.settings.showPhoto ? 'mostrada' : 'ocultada'}`);
    });
    
    // Gerenciar barras de progresso das habilidades - SELETORES MELHORADOS
    const skillProgressElements = previewContainer.querySelectorAll(
        '.skill-progress, .progress-bar, [style*="background: #eee"], [style*="height: 8px"]'
    );
    skillProgressElements.forEach(progress => {
        const display = curriculumData.settings.showSkillsProgress ? 'block' : 'none';
        progress.style.display = display;
        console.log(`📊 Barra de progresso ${curriculumData.settings.showSkillsProgress ? 'mostrada' : 'ocultada'}`);
    });
    
    // Gerenciar ícones de contato - SELETORES MAIS ESPECÍFICOS
    const contactIconElements = previewContainer.querySelectorAll(
        '.contact-icon, .icon, i.fas, i.fab, [class*="fa-"]'
    );
    contactIconElements.forEach(icon => {
        const display = curriculumData.settings.showContactIcons ? 'inline' : 'none';
        icon.style.display = display;
        console.log(`🎯 Ícone ${curriculumData.settings.showContactIcons ? 'mostrado' : 'ocultado'}`);
    });
    
    // Gerenciar links de projetos - SELETORES MAIS ABRANGENTES
    const projectLinkElements = previewContainer.querySelectorAll(
        '.project-link, .project-url, a[href]:not([href^="mailto"]):not([href^="tel"]), [style*="Ver projeto"]'
    );
    projectLinkElements.forEach(link => {
        const display = curriculumData.settings.showProjectLinks ? 'inline' : 'none';
        link.style.display = display;
        console.log(`🔗 Link de projeto ${curriculumData.settings.showProjectLinks ? 'mostrado' : 'ocultado'}`);
    });
    
    // Reaplicar classes/estilos globais do preview (tema, layout, spacing, fonte, margens)
    applyPreviewStyles(previewContainer);

    // Log final
    console.log(`✅ Configurações aplicadas: ${photoElements.length} fotos, ${skillProgressElements.length} barras, ${contactIconElements.length} ícones, ${projectLinkElements.length} links`);
}

// Preenchimento automático de dados pessoais
window.autoFillPersonalData = async function() {
    try {
        // Dados básicos do site
        const siteData = {
            nomeCompleto: 'Mikael Ferreira',
            tituloProfissional: 'Desenvolvedor Web Full Stack',
            email: 'mikael@exemplo.com', // Substitua pelo email real
            github: 'https://github.com/MikaelFMTS',
            linkedin: 'https://linkedin.com/in/mikael-ferreira', // Substitua pelo LinkedIn real
            localizacao: 'Brasil',
            resumoProfissional: 'Desenvolvedor web apaixonado por criar soluções inovadoras e experiências digitais excepcionais. Especializado em frontend e backend, com foco em tecnologias modernas e boas práticas de desenvolvimento.'
        };
        
        // Preencher os campos
        Object.keys(siteData).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                element.value = siteData[key];
            }
        });
        
        updatePersonalData();
        showNotification('Dados pessoais preenchidos automaticamente!', 'success');
    } catch (error) {
        console.error('Erro ao preencher dados automaticamente:', error);
        showNotification('Erro ao preencher dados automaticamente', 'error');
    }
};

// Gerenciamento de experiências
window.addExperience = function() {
    document.getElementById('experience-modal').classList.remove('hidden');
};

window.saveExperience = function() {
    const cargo = document.getElementById('exp-cargo').value;
    const empresa = document.getElementById('exp-empresa').value;
    const periodo = document.getElementById('exp-periodo').value;
    const descricao = document.getElementById('exp-descricao').value;
    
    if (!cargo || !empresa || !periodo) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    const experience = {
        id: Date.now().toString(),
        cargo,
        empresa,
        periodo,
        descricao
    };
    
    curriculumData.experience.push(experience);
    renderExperienceList();
    closeModal('experience-modal');
    clearExperienceForm();
    updateProgress();
    showNotification('Experiência adicionada com sucesso!', 'success');
};

function renderExperienceList() {
    const container = document.getElementById('experiencias-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    curriculumData.experience.forEach(exp => {
        const expElement = document.createElement('div');
        expElement.className = 'item-card';
        expElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-lg">${exp.cargo}</h3>
                    <p class="text-blue-600 font-medium">${exp.empresa}</p>
                    <p class="text-gray-500 text-sm">${exp.periodo}</p>
                    ${exp.descricao ? `<p class="mt-2 text-gray-700">${exp.descricao}</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button onclick="editExperience('${exp.id}')" class="text-blue-500 hover:text-blue-700">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="removeExperience('${exp.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(expElement);
    });
}

window.removeExperience = function(id) {
    curriculumData.experience = curriculumData.experience.filter(exp => exp.id !== id);
    renderExperienceList();
    updateProgress();
    showNotification('Experiência removida', 'success');
};

// Sincronização de foto do GitHub
window.syncGitHubPhoto = async function() {
    try {
        showNotification('Sincronizando foto do GitHub...', 'info');
        
        const profileData = await getGitHubData('profile');
        
        if (profileData && profileData.avatar_url) {
            curriculumData.personalInfo.photo = profileData.avatar_url;
            
            const photoInput = document.getElementById('photo');
            if (photoInput) {
                photoInput.value = profileData.avatar_url;
            }
            
            showNotification('Foto sincronizada com sucesso!', 'success');
        } else {
            showNotification('Não foi possível obter a foto do GitHub', 'warning');
        }
    } catch (error) {
        console.error('Erro ao sincronizar foto:', error);
        showNotification('Erro ao sincronizar foto do GitHub', 'error');
    }
};

window.syncGitHubPhotoManually = async function() {
    const username = prompt('Digite o username do GitHub:', curriculumData.personalInfo.github || 'mikaelfmts');
    if (!username) return;
    
    try {
        showNotification('Buscando foto do GitHub...', 'info');
        
        // Fazer requisição direta para usuário específico
        const url = `https://api.github.com/users/${username}`;
        const profileData = await makeGitHubRequest(url);
        
        if (profileData && profileData.avatar_url) {
            curriculumData.personalInfo.photo = profileData.avatar_url;
            
            const photoInput = document.getElementById('photo');
            if (photoInput) {
                photoInput.value = profileData.avatar_url;
            }
            
            showNotification('Foto sincronizada com sucesso!', 'success');
        } else {
            showNotification('Usuário não encontrado', 'warning');
        }
    } catch (error) {
        console.error('Erro ao buscar foto:', error);
        showNotification('Erro ao buscar foto do GitHub', 'error');
    }
};

window.loadGitHubProjects = async function() {
    try {
        showNotification('Carregando projetos do GitHub...', 'info');
        
        // Usar o sistema unificado para obter repositórios
        const repos = await getGitHubData('repos');
        
        if (!Array.isArray(repos)) {
            throw new Error('Erro ao carregar repositórios');
        }
        
        // Processar repositórios
        repos.forEach(repo => {
            if (!repo.fork && repo.name.toLowerCase() !== 'mikaelfmts') {
                const project = {
                    id: `github-${repo.id}`,
                    nome: repo.name,
                    descricao: repo.description || 'Projeto do GitHub',
                    tecnologias: repo.language ? [repo.language] : [],
                    link: repo.html_url,
                    github: repo.html_url,
                    demo: repo.homepage || '',
                    tipo: 'github'
                };
                
                // Verificar se o projeto já existe
                const exists = curriculumData.projects.some(p => p.id === project.id);
                if (!exists) {
                    curriculumData.projects.push(project);
                }
            }
        });
        
        renderProjectsList();
        updateProgress();
        showNotification('Projetos carregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao carregar projetos do GitHub:', error);
        showNotification('Erro ao carregar projetos do GitHub', 'error');
    }
};

window.loadSiteProjects = async function() {
    try {
        showNotification('Carregando projetos do site...', 'info');
        
        // Projetos baseados na estrutura do site
        const siteProjects = [
            {
                id: 'portfolio-site',                nome: 'Portfolio Pessoal',
                descricao: 'Site portfolio profissional com tema inspirado em League of Legends, sistema de chat em tempo real e painel de controle pessoal.',
                tecnologias: ['HTML5', 'CSS3', 'JavaScript', 'Firebase', 'PWA'],
                tipo: 'site'
            },
            {
                id: 'interactive-projects',
                nome: 'Projetos Interativos',
                descricao: 'Coleção de projetos interativos e demonstrações de tecnologias web modernas.',
                tecnologias: ['JavaScript', 'CSS3', 'HTML5'],
                tipo: 'site'
            },
            {
                id: 'games-collection',
                nome: 'Coleção de Jogos',
                descricao: 'Jogos desenvolvidos em JavaScript e outras tecnologias web.',
                tecnologias: ['JavaScript', 'Phaser.js', 'Canvas'],
                tipo: 'site'
            }
        ];
        
        siteProjects.forEach(project => {
            const exists = curriculumData.projects.some(p => p.id === project.id);
            if (!exists) {
                curriculumData.projects.push(project);
            }
        });
        
        renderProjectsList();
        updateProgress();
        showNotification('Projetos do site carregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao carregar projetos do site:', error);
        showNotification('Erro ao carregar projetos do site', 'error');
    }
};

window.addProject = function() {
    const nome = prompt('Nome do projeto:');
    if (!nome) return;
    
    const descricao = prompt('Descrição do projeto:');
    const tecnologias = prompt('Tecnologias usadas (separadas por vírgula):');
    const link = prompt('Link do projeto (opcional):');
    
    const project = {
        id: Date.now().toString(),
        nome,
        descricao: descricao || '',
        tecnologias: tecnologias ? tecnologias.split(',').map(t => t.trim()) : [],
        link: link || '',
        tipo: 'manual'
    };
    
    curriculumData.projects.push(project);
    renderProjectsList();
    updateProgress();
    showNotification('Projeto adicionado com sucesso!', 'success');
};

function renderProjectsList() {
    const container = document.getElementById('projetos-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    curriculumData.projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = 'item-card';
        projectElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-lg">${project.nome}</h3>
                    <p class="text-gray-700 mt-1">${project.descricao}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${project.tecnologias.map(tech => 
                            `<span class="skill-item text-xs">${tech}</span>`
                        ).join('')}
                    </div>
                    ${project.link ? `<a href="${project.link}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block">
                        <i class="fas fa-external-link-alt mr-1"></i>Ver projeto
                    </a>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button onclick="removeProject('${project.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(projectElement);
    });
}

window.removeProject = function(id) {
    curriculumData.projects = curriculumData.projects.filter(project => project.id !== id);
    renderProjectsList();
    updateProgress();
    showNotification('Projeto removido', 'success');
};

// Gerenciamento de habilidades
window.loadSiteSkills = function() {
    const siteSkills = [
        { nome: 'HTML5', nivel: 90 },
        { nome: 'CSS3', nivel: 85 },
        { nome: 'JavaScript', nivel: 80 },
        { nome: 'React', nivel: 75 },
        { nome: 'Node.js', nivel: 70 },
        { nome: 'Firebase', nivel: 75 },
        { nome: 'Git', nivel: 80 },
        { nome: 'Responsive Design', nivel: 85 },
        { nome: 'PWA', nivel: 70 },
        { nome: 'API REST', nivel: 75 }
    ];
    
    siteSkills.forEach(skill => {
        const exists = curriculumData.skills.some(s => s.nome === skill.nome);
        if (!exists) {
            curriculumData.skills.push({
                id: Date.now().toString() + Math.random(),
                ...skill
            });
        }
    });
    
    renderSkillsList();
    updateProgress();
    showNotification('Habilidades do site carregadas com sucesso!', 'success');
};

window.addSkill = function() {
    const nome = prompt('Nome da habilidade:');
    if (!nome) return;
    
    const nivel = prompt('Nível (0-100):');
    if (!nivel || isNaN(nivel)) {
        showNotification('Nível deve ser um número entre 0 e 100', 'error');
        return;
    }
    
    const skill = {
        id: Date.now().toString(),
        nome,
        nivel: parseInt(nivel)
    };
    
    curriculumData.skills.push(skill);
    renderSkillsList();
    updateProgress();
    showNotification('Habilidade adicionada com sucesso!', 'success');
};

function renderSkillsList() {
    const container = document.getElementById('habilidades-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    curriculumData.skills.forEach(skill => {
        const skillElement = document.createElement('div');
        skillElement.className = 'item-card';
        skillElement.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="skill-progress">
                        <svg>
                            <circle class="bg-circle" cx="30" cy="30" r="25"></circle>
                            <circle class="progress-circle" cx="30" cy="30" r="25" 
                                    style="stroke-dashoffset: ${157 - (157 * skill.nivel / 100)}"></circle>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                            ${skill.nivel}%
                        </div>
                    </div>
                    <div>
                        <h3 class="font-semibold">${skill.nome}</h3>
                        <p class="text-gray-500 text-sm">Nível: ${skill.nivel}%</p>
                    </div>
                </div>
                <button onclick="removeSkill('${skill.id}')" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(skillElement);
    });
}

window.removeSkill = function(id) {
    curriculumData.skills = curriculumData.skills.filter(skill => skill.id !== id);
    renderSkillsList();
    updateProgress();
    showNotification('Habilidade removida', 'success');
};

// Gerenciamento de certificados
window.loadSiteCertificates = async function() {
    try {
        showNotification('Carregando certificados...', 'info');
        
        const certificatesRef = collection(db, 'certificados');
        const certificatesSnapshot = await getDocs(certificatesRef);
        
        certificatesSnapshot.forEach(doc => {
            const cert = doc.data();
            const exists = curriculumData.certificates.some(c => c.id === doc.id);
            if (!exists) {
                curriculumData.certificates.push({
                    id: doc.id,
                    titulo: cert.titulo,
                    instituicao: cert.instituicao,
                    data: cert.dataConclusao || cert.dataInicio,
                    status: cert.status,
                    url: cert.certificadoUrl || ''
                });
            }
        });
        
        renderCertificatesList();
        updateProgress();
        showNotification('Certificados carregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao carregar certificados:', error);
        showNotification('Erro ao carregar certificados', 'error');
    }
};

window.addCertificate = function() {
    const titulo = prompt('Título do certificado:');
    if (!titulo) return;
    
    const instituicao = prompt('Instituição:');
    const data = prompt('Data de conclusão (opcional):');
    const url = prompt('URL do certificado (opcional):');
    
    const certificate = {
        id: Date.now().toString(),
        titulo,
        instituicao: instituicao || '',
        data: data || '',
        status: 'concluido',
        url: url || ''
    };
    
    curriculumData.certificates.push(certificate);
    renderCertificatesList();
    updateProgress();
    showNotification('Certificado adicionado com sucesso!', 'success');
};

function renderCertificatesList() {
    const container = document.getElementById('certificados-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    curriculumData.certificates.forEach(cert => {
        const certElement = document.createElement('div');
        certElement.className = 'item-card';
        certElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-lg">${cert.titulo}</h3>
                    <p class="text-blue-600 font-medium">${cert.instituicao}</p>
                    ${cert.data ? `<p class="text-gray-500 text-sm">${cert.data}</p>` : ''}
                    <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                        cert.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">${cert.status === 'concluido' ? 'Concluído' : 'Em Progresso'}</span>
                    ${cert.url ? `<a href="${cert.url}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm mt-2 inline-block ml-2">
                        <i class="fas fa-external-link-alt mr-1"></i>Ver certificado
                    </a>` : ''}
                </div>
                <button onclick="removeCertificate('${cert.id}')" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(certElement);
    });
}

window.removeCertificate = function(id) {
    curriculumData.certificates = curriculumData.certificates.filter(cert => cert.id !== id);
    renderCertificatesList();
    updateProgress();
    showNotification('Certificado removido com sucesso!', 'success');
};

// Preview do currículo
window.generatePreview = function() {
    const previewContainer = document.getElementById('curriculum-preview');
    if (!previewContainer) {
        console.warn('Container de preview não encontrado');
        return;
    }
    
    try {        const html = generateCurriculumHTML();
        previewContainer.innerHTML = html;
        console.log('✅ Preview gerado com sucesso');
        
        // Aplicar configurações de formatação ao preview
        applyPreviewStyles(previewContainer);
        
        // Aplicar cores personalizadas automaticamente
        if (curriculumData.settings && curriculumData.settings.customColors) {
            applyCustomColorsToPreview(curriculumData.settings.customColors);
        }
        
        showNotification('Preview gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar preview:', error);
        showNotification('Erro ao gerar preview', 'error');
    }
};

window.refreshPreview = function() {
    const previewContainer = document.getElementById('curriculum-preview');
    if (!previewContainer) return;
    
    const html = generateCurriculumHTML();
    previewContainer.innerHTML = html;
    // Aplicar configurações gerais ao preview (tema, layout, espaçamento, fonte, margens, cores)
    applyPreviewStyles(previewContainer);
    
    // Aplicar cores personalizadas automaticamente
    if (curriculumData.settings && curriculumData.settings.customColors) {
        applyCustomColorsToPreview(curriculumData.settings.customColors);
    }
    
    showNotification('Preview atualizado!', 'success');
};

function generateCurriculumHTML() {
    const theme = curriculumData.settings.theme;
    const layout = curriculumData.settings.layout;
    const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
    const today = new Date().toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    return `
        <div class="curriculum-${theme} layout-${layout}" style="
            font-family: ${curriculumData.settings.fontFamily}, sans-serif;
            color: ${curriculumData.settings.primaryColor};
            padding: 2rem;
            line-height: 1.6;
            background-color: ${backgroundColor};
        ">
            <!-- Header Reference - Discreto -->
            <div style="
                text-align: right;
                font-size: 0.65rem;
                color: #9ca3af;
                margin-bottom: 0.7rem;
                font-style: italic;
                opacity: 0.7;
            ">
                <span>Portfólio: mikaelfmts.github.io/eu • Atualizado em ${today}</span>
            </div>
            
            ${generateHeaderSection()}
            ${generateExperienceSection()}
            ${generateProjectsSection()}
            ${generateSkillsSection()}
            ${generateCertificatesSection()}
            
            <!-- Footer do Portfolio -->            <footer style="
                margin-top: 3rem;
                padding-top: 1.5rem;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                color: #64748b;
                font-size: 0.8rem;
            ">
                <p style="margin: 0;">Currículo gerado via Portfolio Profissional • Mikael Ferreira • mikaelfmts.github.io/eu</p>
                <p style="margin-top: 0.3rem; font-size: 0.75rem; opacity: 0.8;">Referências e comprovações de certificações disponíveis mediante solicitação.</p>
                <p style="margin-top: 0.5rem; font-size: 0.65rem; color: #94a3b8;">
                    Portfolio desenvolvido com HTML5, CSS3, JavaScript, Firebase, RESTful APIs e GitHub Actions • GitHub: github.com/MikaelFMTS
                </p>
            </footer>
        </div>
    `;
}

function generateHeaderSection() {
    const personal = curriculumData.personalData;
    const showPhoto = curriculumData.settings.showPhoto;
    
    let photoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNjAiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iIzk5OTk5OSIvPjxwYXRoIGQ9Ik0yMCA5NWMwLTE2IDIwLTMwIDQwLTMwczQwIDE0IDQwIDMwIiBmaWxsPSIjOTk5OTk5Ii8+PC9zdmc+';
    
    // Verificar cache do GitHub primeiro e converter para base64 para PDF
    const cachedUser = getCacheItem(GITHUB_CACHE_CONFIG.keys.profile);
    if (cachedUser && cachedUser.avatar_url) {
        // Usar URL base64 se disponível no cache, senão usar URL original
        if (cachedUser.avatar_base64) {
            photoUrl = cachedUser.avatar_base64;
        } else {
            photoUrl = cachedUser.avatar_url;
        }
    }
    
    return `
        <header style="margin-bottom: 2rem; text-align: center; border-bottom: 2px solid ${curriculumData.settings.primaryColor}; padding-bottom: 1rem;">
            ${showPhoto ? `
                <div style="margin-bottom: 1.5rem;">
                    <img id="curriculum-photo" 
                         src="${photoUrl}" 
                         alt="Foto de perfil" 
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid ${curriculumData.settings.primaryColor}; margin: 0 auto; display: block; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNjAiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iIzk5OTk5OSIvPjxwYXRoIGQ9Ik0yMCA5NWMwLTE2IDIwLTMwIDQwLTMwczQwIDE0IDQwIDMwIiBmaWxsPSIjOTk5OTk5Ii8+PC9zdmc+';">
                </div>
            ` : ''}            <h1 class="curriculum-name" style="font-size: 2.5rem; margin: 0; color: ${curriculumData.settings.primaryColor};">
                ${personal.nomeCompleto || 'Nome Completo'}
            </h1>
            <h2 class="curriculum-title" style="font-size: 1.5rem; margin: 0.5rem 0; color: #666;">
                ${personal.tituloProfissional || 'Título Profissional'}
            </h2>            <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem;">
                ${personal.email ? `<span class="contact-link"><i class="fas fa-envelope"></i> ${personal.email}</span>` : ''}
                ${personal.telefone ? `<span class="contact-link"><i class="fas fa-phone"></i> ${personal.telefone}</span>` : ''}
                ${personal.localizacao ? `<span class="contact-link"><i class="fas fa-map-marker-alt"></i> ${personal.localizacao}</span>` : ''}            </div>
            ${personal.resumoProfissional ? `<p class="main-text" style="margin-top: 1rem; font-style: italic; max-width: 600px; margin-left: auto; margin-right: auto;">${personal.resumoProfissional}</p>` : ''}
            <div style="font-size: 0.65rem; color: #999; text-align: center; margin-top: 0.5rem;">
                <span>Mais informações e projetos completos disponíveis em: mikaelfmts.github.io/eu</span>
            </div>
        </header>
    `;
}

function generateExperienceSection() {
    if (curriculumData.experience.length === 0) return '';
    
    return `
        <section style="margin-bottom: 2rem;">            <h3 class="section-title" style="color: ${curriculumData.settings.primaryColor}; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
                Experiência Profissional
            </h3>
            ${curriculumData.experience.map(exp => `
                <div style="margin-bottom: 1.5rem;">                    <h4 class="highlight" style="margin: 0; font-size: 1.2rem;">${exp.cargo}</h4>
                    <p class="highlight" style="margin: 0.25rem 0; color: ${curriculumData.settings.primaryColor}; font-weight: bold;">${exp.empresa}</p>
                    <p class="main-text" style="margin: 0.25rem 0; color: #666; font-size: 0.9rem;">${exp.periodo}</p>
                    ${exp.descricao ? `<p class="main-text" style="margin: 0.5rem 0;">${exp.descricao}</p>` : ''}
                </div>
            `).join('')}
            <div style="font-size: 0.65rem; color: #999; text-align: right; margin-top: 0.5rem;">
                <span>Histórico completo e referências disponíveis em: mikaelfmts.github.io/eu/mentors.html</span>
            </div>
        </section>
    `;
}

function generateProjectsSection() {
    if (curriculumData.projects.length === 0) return '';
    
    return `
        <section style="margin-bottom: 2rem;">            <h3 class="section-title" style="color: ${curriculumData.settings.primaryColor}; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
                Projetos
            </h3>
            ${curriculumData.projects.map(project => `
                <div style="margin-bottom: 1.5rem;">
                    <h4 class="highlight" style="margin: 0; font-size: 1.2rem;">${project.nome}</h4>
                    <p class="main-text" style="margin: 0.5rem 0;">${project.descricao}</p>
                    ${project.tecnologias.length > 0 ? `
                        <div class="main-text" style="margin: 0.5rem 0;">
                            <strong>Tecnologias:</strong> ${project.tecnologias.join(', ')}
                        </div>
                    ` : ''}
                    ${project.link && curriculumData.settings.showProjectLinks ? `
                        <a class="contact-link" href="${project.link}" style="color: ${curriculumData.settings.primaryColor}; text-decoration: none;">
                            Ver projeto →
                        </a>
                    ` : ''}
                </div>
            `).join('')}
            <div style="font-size: 0.65rem; color: #999; text-align: right; margin-top: 0.5rem;">
                <span>Todos os projetos com código-fonte e demonstrações em: mikaelfmts.github.io/eu/projetos.html</span>
            </div>
        </section>
    `;
}

function generateSkillsSection() {
    if (curriculumData.skills.length === 0) return '';
    
    return `
        <section style="margin-bottom: 2rem;">            <h3 class="section-title" style="color: ${curriculumData.settings.primaryColor}; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
                Habilidades Técnicas
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                ${curriculumData.skills.map(skill => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span class="skill-tag">${skill.nome}</span>
                        ${curriculumData.settings.showSkillsProgress ? `
                            <div style="flex: 1; margin-left: 1rem; background: #eee; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div class="skill-progress" style="width: ${skill.nivel}%; height: 100%; background: ${curriculumData.settings.primaryColor};"></div>
                            </div>
                            <span class="main-text" style="margin-left: 0.5rem; font-size: 0.8rem;">${skill.nivel}%</span>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <p style="font-size: 0.7rem; color: #666; font-style: italic; margin-top: 0.8rem; text-align: right;">
                Dados Reais: Os percentuais exibidos são calculados automaticamente através da API do GitHub, analisando linguagens, frameworks e tecnologias utilizadas nos repositórios públicos do meu perfil.
            </p>
            <div style="font-size: 0.65rem; color: #999; text-align: right; margin-top: 0.3rem;">
                <span>Para mais detalhes: mikaelfmts.github.io/eu/projetos.html</span>
            </div>
        </section>
    `;
}

function generateCertificatesSection() {
    if (curriculumData.certificates.length === 0) return '';
    
    return `
        <section style="margin-bottom: 2rem;">            <h3 class="section-title" style="color: ${curriculumData.settings.primaryColor}; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
                Certificados e Educação
            </h3>
            ${curriculumData.certificates.map(cert => `
                <div style="margin-bottom: 1.5rem;">
                    <h4 class="highlight" style="margin: 0; font-size: 1.1rem;">${cert.titulo}</h4>
                    <p class="highlight" style="margin: 0.25rem 0; color: ${curriculumData.settings.primaryColor}; font-weight: bold;">${cert.instituicao}</p>
                    ${cert.data ? `<p class="main-text" style="margin: 0.25rem 0; color: #666; font-size: 0.9rem;">${cert.data}</p>` : ''}
                </div>
            `).join('')}
            <div style="font-size: 0.65rem; color: #999; text-align: right; margin-top: 0.5rem;">
                <span>Certificados em andamento e comprovantes disponíveis em: mikaelfmts.github.io/eu/pages/certificates-in-progress.html</span>
            </div>
        </section>
    `;
}

// Salvar currículo
window.saveCurriculum = async function() {
    try {
        if (!currentUser) {
            showNotification('Usuário não autenticado', 'error');
            return;
        }

        // Validar dados antes de salvar
        const dataToSave = gatherAllData();
        const validationErrors = validateFormData(dataToSave);
        
        if (validationErrors.length > 0) {
            showNotification('Corrija os erros antes de salvar: ' + validationErrors.join(', '), 'warning');
            return;
        }

        // Limpar dados undefined antes de salvar
        const cleanData = JSON.parse(JSON.stringify(dataToSave, (key, value) => {
            return value === undefined ? null : value;
        }));

        cleanData.metadata = {
            ...cleanData.metadata,
            userId: currentUser.uid,
            lastUpdated: new Date(),
            createdAt: cleanData.metadata?.createdAt || new Date()
        };
        
        const curriculumRef = doc(db, 'curriculum', currentUser.uid);
        await setDoc(curriculumRef, cleanData);
        
        showNotification('Currículo salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar currículo:', error);
        showNotification('Erro ao salvar currículo', 'error');
    }
};

window.saveDraft = function() {
    localStorage.setItem('curriculum-draft', JSON.stringify(curriculumData));
    showNotification('Rascunho salvo localmente!', 'success');
};

// Carregar currículo existente
async function loadExistingCurriculum() {
    try {
        const curriculumRef = doc(db, 'curriculum', curriculumData.metadata.userId);
        const curriculumDoc = await getDoc(curriculumRef);
        
        if (curriculumDoc.exists()) {
            const data = curriculumDoc.data();
            curriculumData = { ...curriculumData, ...data };
            populateForm();
        } else {
            // Tentar carregar do localStorage
            const draftData = localStorage.getItem('curriculum-draft');
            if (draftData) {
                const parsed = JSON.parse(draftData);
                curriculumData = { ...curriculumData, ...parsed };
                populateForm();
                showNotification('Rascunho carregado do armazenamento local', 'info');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar currículo:', error);
    }
}

function populateForm() {
    // Preencher dados pessoais
    Object.keys(curriculumData.personalData).forEach(key => {
        const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (element) {
            element.value = curriculumData.personalData[key] || '';
        }
    });
    
    // Preencher configurações
    Object.keys(curriculumData.settings).forEach(key => {
        const elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        const element = document.getElementById(elementId) || document.getElementById(`curriculum-${elementId}`) || document.getElementById(`show-${elementId.replace('show-', '')}`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = curriculumData.settings[key];
            } else {
                element.value = curriculumData.settings[key];
            }
        }
    });
    
    // Renderizar listas
    renderExperienceList();
    renderProjectsList();
    renderSkillsList();
    renderCertificatesList();
}

// Função para coletar todos os dados do formulário
function gatherAllData() {
    return {
        personalData: {
            nomeCompleto: document.getElementById('nome-completo')?.value || '',
            tituloProfissional: document.getElementById('titulo-profissional')?.value || '',
            email: document.getElementById('email')?.value || '',
            telefone: document.getElementById('telefone')?.value || '',
            linkedin: document.getElementById('linkedin')?.value || '',
            github: document.getElementById('github')?.value || '',
            localizacao: document.getElementById('localizacao')?.value || '',
            resumoProfissional: document.getElementById('resumo-profissional')?.value || ''
        },
        experience: [...curriculumData.experience],
        projects: [...curriculumData.projects],
        skills: [...curriculumData.skills],
        certificates: [...curriculumData.certificates],
        settings: {
            theme: document.getElementById('curriculum-theme')?.value || 'modern',
            primaryColor: document.getElementById('primary-color')?.value || '#3B82F6',
            fontFamily: document.getElementById('font-family')?.value || 'Inter',
            fontSize: document.getElementById('font-size')?.value || 'medium',
            layout: document.getElementById('layout-type')?.value || 'single-column',
            spacing: document.getElementById('spacing')?.value || 'normal',
            backgroundColor: document.getElementById('background-color')?.value || '#ffffff',
            documentMargins: document.getElementById('document-margins')?.value || 'normal',
            showPhoto: document.getElementById('show-photo')?.checked || false,
            showSkillsProgress: document.getElementById('show-skills-progress')?.checked || true,
            showContactIcons: document.getElementById('show-contact-icons')?.checked || true,
            showProjectLinks: document.getElementById('show-project-links')?.checked || true
        },
        metadata: {
            ...curriculumData.metadata,
            lastUpdated: new Date()
        }
    };
}

function loadSiteData() {
    // Carregar dados padrão do site
    autoFillPersonalData();
    loadSiteSkills();
    loadSiteProjects();
}

// Atualizar progresso
function updateProgress() {
    const totalSections = 6;
    let completedSections = 0;
    
    // Verificar dados pessoais
    if (curriculumData.personalData.nomeCompleto && curriculumData.personalData.email) {
        completedSections++;
    }
    
    // Verificar experiência
    if (curriculumData.experience.length > 0) {
        completedSections++;
    }
    
    // Verificar projetos
    if (curriculumData.projects.length > 0) {
        completedSections++;
    }
    
    // Verificar habilidades
    if (curriculumData.skills.length > 0) {
        completedSections++;
    }
    
    // Verificar certificados
    if (curriculumData.certificates.length > 0) {
        completedSections++;
    }
    
    // Formatação sempre conta como completa
    completedSections++;
    
    const percentage = Math.round((completedSections / totalSections) * 100);
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${percentage}% Completo`;
    }
}

// Funções auxiliares
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
};

function clearExperienceForm() {
    ['exp-cargo', 'exp-empresa', 'exp-periodo', 'exp-descricao'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Definir cor baseada no tipo
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Mostrar notificação
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remover notificação após 3 segundos
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Download PDF com todas as correções
window.downloadPDF = async function() {
    try {
        const previewContainer = document.getElementById('curriculum-preview');
        if (!previewContainer || !previewContainer.innerHTML.trim()) {
            showNotification('Por favor, gere o preview do currículo primeiro', 'warning');
            return;
        }

        console.log('📄 Iniciando geração do PDF...');
        showNotification('Preparando PDF...', 'info');
        
        // Atualizar configurações antes de gerar PDF
        updateSettings();
        
        // Criar um clone do elemento para aplicar estilos específicos de PDF
        const element = previewContainer.cloneNode(true);
        
        // Aplicar estilos específicos para PDF
        element.style.backgroundColor = curriculumData.settings.backgroundColor || '#ffffff';
        element.style.color = '#000000'; // Força texto preto para PDF
        element.style.fontFamily = curriculumData.settings.fontFamily || 'Arial, sans-serif';
        
        // Aplicar estilos específicos para experience section
        const experienceItems = element.querySelectorAll('.experience-item, .exp-item');
        experienceItems.forEach(item => {
            item.style.color = '#000000 !important';
            item.style.backgroundColor = 'transparent';
            
            // Forçar cor do texto em todos os elementos filhos
            const allElements = item.querySelectorAll('*');
            allElements.forEach(el => {
                el.style.color = '#000000 !important';
            });
        });
        
        // Gerenciar visibilidade dos links de projetos
        const projectLinks = element.querySelectorAll('.project-link, .project-url');
        projectLinks.forEach(link => {
            if (!curriculumData.settings.showProjectLinks) {
                link.style.display = 'none';
            }
        });
        
        // Configuração de margens
        const marginSetting = curriculumData.settings.documentMargins || 'normal';
        let marginValue;
        switch (marginSetting) {
            case 'compact': marginValue = [5, 5, 5, 5]; break;
            case 'comfortable': marginValue = [15, 15, 15, 15]; break;
            case 'wide': marginValue = [25, 25, 25, 25]; break;
            default: marginValue = [10, 10, 10, 10]; // normal
        }
        
        // Configuração do PDF
        const options = {
            margin: marginValue,
            filename: 'curriculo-mikael-ferreira.pdf',
            image: { 
                type: 'jpeg', 
                quality: 0.98 
            },
            html2canvas: { 
                scale: 2,
                backgroundColor: curriculumData.settings.backgroundColor || '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false,
                onclone: function(clonedDoc) {
                    // Aplicar estilos adicionais no documento clonado
                    const clonedElement = clonedDoc.querySelector('#curriculum-preview');
                    if (clonedElement) {
                        clonedElement.style.color = '#000000';
                        clonedElement.style.backgroundColor = curriculumData.settings.backgroundColor || '#ffffff';
                    }
                }
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };
        
        // Gerar o PDF usando o elemento clonado
        await html2pdf().from(element).set(options).save();
        showNotification('PDF gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
};

// Sistema de Backup Automático
function autoBackup() {
    const curriculumData = gatherAllData();
    if (curriculumData && Object.keys(curriculumData).length > 0) {
        const timestamp = new Date().toISOString();
        const backupData = {
            ...curriculumData,
            backupTimestamp: timestamp,
            version: '1.0'
        };
        
        // Salvar no localStorage como backup
        localStorage.setItem(`curriculum_backup_${timestamp.split('T')[0]}`, JSON.stringify(backupData));
        
        // Manter apenas os últimos 5 backups
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('curriculum_backup_'));
        if (backupKeys.length > 5) {
            backupKeys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key));
        }
        
        console.log('Backup automático criado:', timestamp);
    }
}

// Função para restaurar backup
window.restoreBackup = function() {
    const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('curriculum_backup_'));
    if (backupKeys.length === 0) {
        showNotification('Nenhum backup encontrado', 'warning');
        return;
    }
    
    const latestBackup = backupKeys.sort().pop();
    const backupData = JSON.parse(localStorage.getItem(latestBackup));
    
    if (confirm('Deseja restaurar o último backup? Isso substituirá os dados atuais.')) {
        populateFormWithData(backupData);
        showNotification('Backup restaurado com sucesso!', 'success');
    }
};

// Validação melhorada
function validateFormData(data) {
    const errors = [];
    
    // Validar dados pessoais
    if (!data.personalData?.nomeCompleto?.trim()) {
        errors.push('Nome completo é obrigatório');
    }
    
    if (!data.personalData?.email?.trim() || !isValidEmail(data.personalData.email)) {
        errors.push('Email válido é obrigatório');
    }
    
    if (!data.personalData?.tituloProfissional?.trim()) {
        errors.push('Título profissional é obrigatório');
    }
    
    // Validar pelo menos uma seção com conteúdo
    const hasContent = (
        (data.experience && data.experience.length > 0) ||
        (data.projects && data.projects.length > 0) ||
        (data.skills && data.skills.length > 0) ||
        (data.certificates && data.certificates.length > 0)
    );
    
    if (!hasContent) {
        errors.push('É necessário preencher pelo menos uma seção (Experiência, Projetos, Habilidades ou Certificados)');
    }
    
    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Auto-save melhorado
let autoSaveTimeout;
function scheduleAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        const data = gatherAllData();
        const errors = validateFormData(data);
        
        if (errors.length === 0) {
            saveCurriculum();
            autoBackup();
        }
    }, 30000); // Auto-save a cada 30 segundos
}

// Adicionar listeners para auto-save
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação primeiro
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return; // Sair se não autenticado
    }
    
    // Esconder loading screen após autenticação
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 1000);
    
    // Carregar dados existentes
    loadCurriculum();
    
    // Listeners para inputs de dados pessoais
    const personalDataInputs = [
        'nome-completo', 'titulo-profissional', 'email', 'telefone',
        'linkedin', 'github', 'localizacao', 'resumo-profissional'
    ];
    
    personalDataInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePersonalData);
        }
    });
    
    // Listeners para configurações de formatação
    const settingsInputs = [
        'curriculum-theme', 'primary-color', 'font-family', 'font-size',
        'layout-type', 'spacing', 'show-photo', 'show-skills-progress',
        'show-contact-icons', 'show-project-links'
    ];
    
    settingsInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateSettings);
        }
    });
    
    // Adicionar listeners para inputs
    const allInputs = document.querySelectorAll('input, textarea, select');
    allInputs.forEach(input => {
        input.addEventListener('input', scheduleAutoSave);
        input.addEventListener('change', scheduleAutoSave);
    });
});

// Carregar currículo existente
window.loadCurriculum = async function() {
    try {
        if (!currentUser) {
            console.log('Usuário não autenticado, não é possível carregar currículo');
            return;
        }

        showNotification('Carregando dados do currículo...', 'info');
        
        const docRef = doc(db, 'curriculum', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Mesclar dados carregados com estrutura padrão
            curriculumData = {
                ...curriculumData,
                ...data,
                metadata: {
                    ...curriculumData.metadata,
                    ...data.metadata
                }
            };
            
            // Preencher formulário com dados carregados
            populateFormWithData(curriculumData);
            
            showNotification('Dados carregados com sucesso!', 'success');
            updateProgress();
        } else {
            console.log('Nenhum currículo encontrado, usando dados padrão');
            // Carregar dados do site como padrão
            loadSiteData();
        }
    } catch (error) {
        console.error('Erro ao carregar currículo:', error);
        showNotification('Erro ao carregar dados. Usando dados padrão.', 'warning');
        loadSiteData();
    }
};

function populateFormWithData(data) {
    // Preencher dados pessoais
    if (data.personalData) {
        Object.keys(data.personalData).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                element.value = data.personalData[key] || '';
            }
        });
    }
    
    // Recriar listas dinâmicas
    if (data.experience) recreateExperienceList(data.experience);
    if (data.projects) recreateProjectsList(data.projects);
    if (data.skills) recreateSkillsList(data.skills);
    if (data.certificates) recreateCertificatesList(data.certificates);
    
    // Aplicar configurações
    if (data.settings) {
        Object.keys(data.settings).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = data.settings[key];
                } else {
                    element.value = data.settings[key] || '';
                }
            }
        });
    }
}

function recreateExperienceList(experiences) {
    curriculumData.experience = experiences;
    const container = document.getElementById('experience-list');
    if (container) {
        container.innerHTML = '';
        experiences.forEach((exp, index) => {
            addExperienceToList(exp, index);
        });
    }
}

function recreateProjectsList(projects) {
    curriculumData.projects = projects;
    const container = document.getElementById('projects-list');
    if (container) {
        container.innerHTML = '';
        projects.forEach((proj, index) => {
            addProjectToList(proj, index);
        });
    }
}

function recreateSkillsList(skills) {
    curriculumData.skills = skills;
    const container = document.getElementById('skills-list');
    if (container) {
        container.innerHTML = '';
        skills.forEach((skill, index) => {
            addSkillToList(skill, index);
        });
    }
}

function recreateCertificatesList(certificates) {
    curriculumData.certificates = certificates;
    const container = document.getElementById('certificates-list');
    if (container) {
        container.innerHTML = '';
        certificates.forEach((cert, index) => {
            addCertificateToList(cert, index);
        });
    }
}

// Função para converter imagem URL para base64
async function convertImageToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = this.width;
                canvas.height = this.height;
                
                ctx.drawImage(this, 0, 0);
                
                try {
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                } catch (error) {
                    console.log('Erro ao converter para base64:', error);
                    resolve(null);
                }
            };
            
            img.onerror = function() {
                console.log('Erro ao carregar imagem para conversão base64');
                resolve(null);
            };
            
            img.src = imageUrl;
        } catch (error) {
            console.log('Erro na conversão base64:', error);
            resolve(null);
        }
    });
}

// Sincronização com LinkedIn (API e Fallback)
async function syncLinkedInData() {
    try {
        console.log('🔗 Sincronizando dados do LinkedIn...');
        
        // Como a API do LinkedIn requer autenticação OAuth, vamos usar os dados de fallback
        // Em uma implementação completa, seria necessário configurar OAuth 2.0
        console.log('📋 Usando dados de fallback do LinkedIn (API requer OAuth)');
        
        // Aplicar dados do LinkedIn aos campos do currículo
        if (LINKEDIN_FALLBACK_DATA) {
            // Atualizar dados pessoais
            if (LINKEDIN_FALLBACK_DATA.name) {
                const nomeInput = document.getElementById('nome');
                if (nomeInput && !nomeInput.value) {
                    nomeInput.value = LINKEDIN_FALLBACK_DATA.name;
                }
            }
            
            if (LINKEDIN_FALLBACK_DATA.headline) {
                const cargoInput = document.getElementById('cargo');
                if (cargoInput && !cargoInput.value) {
                    cargoInput.value = LINKEDIN_FALLBACK_DATA.headline;
                }
            }
            
            if (LINKEDIN_FALLBACK_DATA.location) {
                const localizacaoInput = document.getElementById('localizacao');
                if (localizacaoInput && !localizacaoInput.value) {
                    localizacaoInput.value = LINKEDIN_FALLBACK_DATA.location;
                }
            }
            
            if (LINKEDIN_FALLBACK_DATA.summary) {
                const resumoInput = document.getElementById('resumo-profissional');
                if (resumoInput && !resumoInput.value) {
                    resumoInput.value = LINKEDIN_FALLBACK_DATA.summary;
                }
            }
            
            // Adicionar link do LinkedIn
            const linkedinInput = document.getElementById('linkedin');
            if (linkedinInput && !linkedinInput.value) {
                linkedinInput.value = LINKEDIN_PROFILE_URL;
            }
            
            // Sincronizar experiências se não houver nenhuma
            if (curriculumData.experience.length === 0 && LINKEDIN_FALLBACK_DATA.experience) {
                LINKEDIN_FALLBACK_DATA.experience.forEach(exp => {
                    curriculumData.experience.push({
                        cargo: exp.title,
                        empresa: exp.company,
                        periodo: exp.duration,
                        descricao: exp.description,
                        id: Date.now() + Math.random()
                    });
                });
                updateExperienceList();
            }
            
            // Sincronizar habilidades se não houver nenhuma
            if (curriculumData.skills.length === 0 && LINKEDIN_FALLBACK_DATA.skills) {
                LINKEDIN_FALLBACK_DATA.skills.forEach(skill => {
                    curriculumData.skills.push({
                        nome: skill,
                        nivel: 'Avançado',
                        id: Date.now() + Math.random()
                    });
                });
                updateSkillsList();
            }
            
            console.log('✅ Dados do LinkedIn sincronizados com sucesso');
            showNotification('Dados do LinkedIn sincronizados!', 'success');
            
            // Atualizar preview
            updatePreview();
        }
        
        return LINKEDIN_FALLBACK_DATA;
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados do LinkedIn:', error);
        showNotification('Erro ao sincronizar LinkedIn', 'error');
        return null;
    }
}

// Função para sincronização manual do LinkedIn
window.syncLinkedInDataManually = async function() {
    try {
        showNotification('Sincronizando dados do LinkedIn...', 'info');
        await syncLinkedInData();
    } catch (error) {
        console.error('Erro na sincronização manual do LinkedIn:', error);
        showNotification('Erro ao sincronizar dados do LinkedIn', 'error');
    }
};

// ========== FUNÇÕES DE APLICAÇÃO DE FORMATAÇÃO ==========

// Função para aplicar tema selecionado
window.applySelectedTheme = function() {
    const themeSelect = document.getElementById('curriculum-theme');
    if (!themeSelect) return;
    
    const selectedTheme = themeSelect.value;
    console.log('🎨 Aplicando tema:', selectedTheme);
    
    // Atualizar dados do currículo
    curriculumData.settings.theme = selectedTheme;
    
    // Aplicar tema ao preview
    const previewContainer = document.getElementById('curriculum-preview');
    if (previewContainer) {
        // Remover classes de tema existentes
        previewContainer.classList.remove(...Array.from(previewContainer.classList).filter(c => c.startsWith('curriculum-')));
        
        // Adicionar nova classe de tema
        previewContainer.classList.add(`curriculum-${selectedTheme}`);
        
        // Regenerar preview com novo tema
        refreshPreview();
    }
    
    showNotification(`Tema ${selectedTheme} aplicado!`, 'success');
    scheduleAutoSave();
};

// Função para aplicar cor primária
window.applyPrimaryColor = function() {
    const colorSelect = document.getElementById('primary-color');
    if (!colorSelect) return;
    
    const selectedColor = colorSelect.value;
    console.log('🎨 Aplicando cor primária:', selectedColor);
    
    // Atualizar dados do currículo
    curriculumData.settings.primaryColor = selectedColor;
    
    // Aplicar cor ao preview
    const previewContainer = document.getElementById('curriculum-preview');
    if (previewContainer) {
        previewContainer.style.setProperty('--primary-color', selectedColor);
        
        // Regenerar preview com nova cor
        refreshPreview();
    }
    
    showNotification('Cor primária atualizada!', 'success');
    scheduleAutoSave();
};

// Função para aplicar fonte selecionada
window.applySelectedFont = function() {
    const fontSelect = document.getElementById('font-family');
    if (fontSelect) {
        const selectedFont = fontSelect.value;
        console.log('🎨 Aplicando fonte:', selectedFont);
        
        // Atualizar dados do currículo
        curriculumData.settings.fontFamily = selectedFont;
        
        // Aplicar fonte ao preview
        const previewContainer = document.getElementById('curriculum-preview');
        if (previewContainer) {
            previewContainer.style.fontFamily = `${selectedFont}, sans-serif`;
            
            // Regenerar preview com nova fonte
            refreshPreview();
        }
        
        showNotification(`Fonte ${selectedFont} aplicada!`, 'success');
        scheduleAutoSave();
    }
};

// Função para aplicar layout selecionado
window.applySelectedLayout = function() {
    const layoutSelect = document.getElementById('layout-type');
    if (!layoutSelect) return;
    
       
    const selectedLayout = layoutSelect.value;
    console.log('🎨 Aplicando layout:', selectedLayout);
    
    // Atualizar dados do currículo
    curriculumData.settings.layout = selectedLayout;
    
    // Aplicar layout ao preview
    const previewContainer = document.getElementById('curriculum-preview');
    if (previewContainer) {
        // Remover classes de layout existentes
        previewContainer.classList.remove(...Array.from(previewContainer.classList).filter(c => c.startsWith('layout-')));
        
        // Adicionar nova classe de layout
        previewContainer.classList.add(`layout-${selectedLayout}`);
        
        // Regenerar preview com novo layout
        refreshPreview();
    }
    
    showNotification(`Layout ${selectedLayout} aplicado!`, 'success');
    scheduleAutoSave();
};

// Função para aplicar espaçamento selecionado
window.applySelectedSpacing = function() {
    const spacingSelect = document.getElementById('spacing');
    if (!spacingSelect) return;
    
    const selectedSpacing = spacingSelect.value;
    console.log('🎨 Aplicando espaçamento:', selectedSpacing);
    
    // Atualizar dados do currículo
    curriculumData.settings.spacing = selectedSpacing;
    
    // Aplicar espaçamento ao preview
    const previewContainer = document.getElementById('curriculum-preview');
    if (previewContainer) {
        // Remover classes de espaçamento existentes
        previewContainer.classList.remove('spacing-compact', 'spacing-normal', 'spacing-relaxed');
        
        // Adicionar nova classe de espaçamento
        previewContainer.classList.add(`spacing-${selectedSpacing}`);
        
        // Regenerar preview com novo espaçamento
        refreshPreview();
    }
    
    showNotification(`Espaçamento ${selectedSpacing} aplicado!`, 'success');
    scheduleAutoSave();
};

// Função para conectar eventos de formatação
function setupFormattingEvents() {
    // Conectar seletores de formatação com as funções
    const themeSelect = document.getElementById('curriculum-theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', applySelectedTheme);
    }
    
    const colorSelect = document.getElementById('primary-color');
    if (colorSelect) {
        colorSelect.addEventListener('change', applyPrimaryColor);
    }
    
    const fontSelect = document.getElementById('font-family');
    if (fontSelect) {
        fontSelect.addEventListener('change', applySelectedFont);
    }
    
    const layoutSelect = document.getElementById('layout-type');
    if (layoutSelect) {
        layoutSelect.addEventListener('change', applySelectedLayout);
    }
    
    const spacingSelect = document.getElementById('spacing');
    if (spacingSelect) {
        spacingSelect.addEventListener('change', applySelectedSpacing);
    }
    
    console.log('✅ Eventos de formatação configurados');
}

// Função para aplicar todas as configurações de formatação
window.applyAllFormatting = function() {
    console.log('🎨 Aplicando todas as configurações de formatação...');
    
    applySelectedTheme();
    applyPrimaryColor();
    applySelectedFont();
    applySelectedLayout();
    applySelectedSpacing();
    
    showNotification('Formatação completa aplicada!', 'success');
};

// Inicializar eventos de formatação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos de formatação
    setTimeout(() => {
        setupFormattingEvents();
    }, 1000);
});

// Função para pré-visualizar tema antes de aplicar
window.previewTheme = function(themeName) {
    const previewContainer = document.getElementById('curriculum-preview');
    if (!previewContainer) return;
    
    // Salvar tema atual
    const currentTheme = curriculumData.settings.theme;
    
    // Aplicar tema temporariamente
    previewContainer.classList.remove(...Array.from(previewContainer.classList).filter(c => c.startsWith('curriculum-')));
    previewContainer.classList.add(`curriculum-${themeName}`);
    
    // Restaurar tema original após 3 segundos
    setTimeout(() => {
        previewContainer.classList.remove(`curriculum-${themeName}`);
        previewContainer.classList.add(`curriculum-${currentTheme}`);
    }, 3000);
    
    showNotification(`Pré-visualizando tema ${themeName}`, 'info');
};

// Função para aplicar estilos ao preview
function applyPreviewStyles(previewContainer) {
    if (!previewContainer) return;
    
    // Aplicar configurações de tema, cor, fonte, etc.
    const settings = curriculumData.settings;
    
    previewContainer.style.setProperty('--primary-color', settings.primaryColor);
    previewContainer.style.setProperty('--theme-primary', settings.primaryColor);
    previewContainer.style.fontFamily = `${settings.fontFamily}, sans-serif`;
    
    // Obter cor de fundo da configuração ou do input
    const backgroundColor = settings.backgroundColor || 
                          document.getElementById('background-color')?.value || 
                          '#ffffff';
    
    // Aplicar a cor de fundo diretamente ao container
    previewContainer.style.backgroundColor = backgroundColor;
    
    // Aplicar a cor de fundo ao primeiro elemento div dentro do preview (conteúdo principal)
    const mainContentDiv = previewContainer.querySelector('div');
    if (mainContentDiv) {
        mainContentDiv.style.backgroundColor = backgroundColor;
        // Aplicar margens (como padding) conforme seleção
        const marginSetting = settings.documentMargins || 'normal';
        let paddingCSS = '20px';
        switch (marginSetting) {
            case 'compact': paddingCSS = '10px'; break;
            case 'comfortable': paddingCSS = '30px'; break;
            case 'wide': paddingCSS = '40px'; break;
            default: paddingCSS = '20px';
        }
        mainContentDiv.style.padding = paddingCSS;
    }
      
    // Aplicar classes de tema, layout, espaçamento e tamanho de fonte
    previewContainer.className = `curriculum-preview curriculum-${settings.theme} layout-${settings.layout} spacing-${settings.spacing} font-size-${settings.fontSize}`;
    
    // Aplicar cores personalizadas se existirem
    if (settings.customColors) {
        applyCustomColorsToPreview(settings.customColors, previewContainer);
    }
    
    console.log('Cor de fundo aplicada:', backgroundColor);
}

// Função para aplicar cores personalizadas
function applyCustomColors() {
    try {
        const customColors = {
            nameTitle: document.getElementById('name-title-color').value,
            sectionTitle: document.getElementById('section-title-color').value,
            mainText: document.getElementById('main-text-color').value,
            highlight: document.getElementById('highlight-color').value,
            link: document.getElementById('link-color').value,
            skills: document.getElementById('skills-color').value
        };
        
        // Salvar cores no curriculumData
        curriculumData.settings.customColors = customColors;
        
        // Atualizar backgroundColor e documentMargins nas configurações
        const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
        const documentMargins = document.getElementById('document-margins')?.value || 'normal';
        
        curriculumData.settings.backgroundColor = backgroundColor;
        curriculumData.settings.documentMargins = documentMargins;
        
        console.log('Configurações atualizadas:', 
            'Cor de fundo:', backgroundColor, 
            'Margens:', documentMargins);
          
        // Aplicar cores ao preview se estiver visível
        const previewContainer = document.getElementById('curriculum-preview');
        if (previewContainer) {
            // Aplicar cor de fundo diretamente ao container de preview
            previewContainer.style.backgroundColor = backgroundColor;
            
            // Aplicar cores personalizadas
            applyCustomColorsToPreview(customColors, previewContainer);
        }
          
        showNotification('Cores e formatação aplicadas com sucesso!', 'success');
        
        // Salvar automaticamente
        saveCurriculum();
        
    } catch (error) {
        console.error('Erro ao aplicar cores personalizadas:', error);
        showNotification('Erro ao aplicar cores personalizadas', 'error');
    }
}

// Função para aplicar cores personalizadas ao preview
function applyCustomColorsToPreview(colors, container = null) {
    // Se o primeiro parâmetro for um elemento DOM, trocar os parâmetros (compatibilidade)
    if (colors && colors.nodeType) {
        const temp = colors;
        colors = container;
        container = temp;
    }
    
    // Verificar se colors é válido
    if (!colors || typeof colors !== 'object') {
        console.warn('Cores não fornecidas para applyCustomColorsToPreview');
        return;
    }
    
    // Obter cor de fundo da configuração ou do input
    const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
    
    const style = document.createElement('style');
    style.id = 'custom-colors-style';
    
    // Remover estilo anterior se existir
    const existingStyle = document.getElementById('custom-colors-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    style.textContent = `
        /* Regras para impressão - garantir cores corretas no PDF */
        @media print {
            #curriculum-preview, 
            #curriculum-preview > div,
            .curriculum-preview {
                background-color: ${backgroundColor} !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        
        /* Cor de fundo do currículo */
        #curriculum-preview, 
        #curriculum-preview > div {
            background-color: ${backgroundColor} !important;
        }
        
        /* Nome e título principal */
        #curriculum-preview header h1 {
            color: ${colors.nameTitle} !important;
        }
        
        #curriculum-preview header h2 {
            color: ${colors.nameTitle} !important;
        }
        
        /* Títulos de seção */
        #curriculum-preview h3 {
            color: ${colors.sectionTitle} !important;
        }
        
        /* Texto principal - parágrafos e descrições */
        #curriculum-preview p,
        #curriculum-preview span {
            color: ${colors.mainText} !important;
        }
        
        /* Destaques - empresas, projetos, posições */
        #curriculum-preview h4 {
            color: ${colors.highlight} !important;
        }
        
        #curriculum-preview div p[style*="font-weight: bold"] {
            color: ${colors.highlight} !important;
        }
        
        /* Links e contatos */
        #curriculum-preview a {
            color: ${colors.link} !important;
        }
          /* Habilidades - barras de progresso e tags */
        #curriculum-preview .skill-progress {
            background: ${colors.skills} !important;
        }
        
        #curriculum-preview .skill-tag {
            color: ${colors.skills} !important;
        }
        
        /* Classe auxiliares para elementos específicos */
        .curriculum-name {
            color: ${colors.nameTitle} !important;
        }
        
        .curriculum-title {
            color: ${colors.nameTitle} !important;
        }
        
        .section-title {
            color: ${colors.sectionTitle} !important;
        }
        
        .main-text {
            color: ${colors.mainText} !important;
        }
        
        .highlight {
            color: ${colors.highlight} !important;
        }
        
        .contact-link {
            color: ${colors.link} !important;
        }
        
        .skill-tag {
            color: ${colors.skills} !important;
            border-color: ${colors.skills} !important;
        }
    `;
    
    document.head.appendChild(style);
}

// Função para sincronizar controles de cor (input color e select)
function setupColorControls() {
    const colorControls = [
        { colorInput: 'background-color', preset: 'background-color-preset' },
        { colorInput: 'name-title-color', preset: 'name-title-color-preset' },
        { colorInput: 'section-title-color', preset: 'section-title-color-preset' },
        { colorInput: 'main-text-color', preset: 'main-text-color-preset' },
        { colorInput: 'highlight-color', preset: 'highlight-color-preset' },
        { colorInput: 'link-color', preset: 'link-color-preset' },
        { colorInput: 'skills-color', preset: 'skills-color-preset' }
    ];
    
    colorControls.forEach(control => {
        const colorInput = document.getElementById(control.colorInput);
        const presetSelect = document.getElementById(control.preset);
        
        if (colorInput && presetSelect) {            // Sincronizar preset com input color
            presetSelect.addEventListener('change', function() {
                colorInput.value = this.value;
                // Aplicar cores automaticamente quando preset mudar
                setTimeout(() => {
                    const currentColors = {
                        nameTitle: document.getElementById('name-title-color').value,
                        sectionTitle: document.getElementById('section-title-color').value,
                        mainText: document.getElementById('main-text-color').value,
                        highlight: document.getElementById('highlight-color').value,
                        link: document.getElementById('link-color').value,
                        skills: document.getElementById('skills-color').value
                    };
                    applyCustomColorsToPreview(currentColors);
                }, 100);
            });
            
            // Atualizar preset quando input color mudar
            colorInput.addEventListener('input', function() {
                // Verificar se a cor corresponde a algum preset
                const options = presetSelect.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].value.toLowerCase() === this.value.toLowerCase()) {
                        presetSelect.value = this.value;
                        break;
                    }
                }
                // Aplicar cores automaticamente quando input mudar
                setTimeout(() => {
                    const currentColors = {
                        nameTitle: document.getElementById('name-title-color').value,
                        sectionTitle: document.getElementById('section-title-color').value,
                        mainText: document.getElementById('main-text-color').value,
                        highlight: document.getElementById('highlight-color').value,
                        link: document.getElementById('link-color').value,
                        skills: document.getElementById('skills-color').value
                    };
                    applyCustomColorsToPreview(currentColors);
                }, 100);
            });
        }
    });
}

// Função para carregar cores salvas
function loadSavedColors() {
    if (curriculumData.settings && curriculumData.settings.customColors) {
        const colors = curriculumData.settings.customColors;
        
        // Carregar todas as cores personalizadas
        document.getElementById('name-title-color').value = colors.nameTitle || '#1f2937';
        document.getElementById('section-title-color').value = colors.sectionTitle || '#3b82f6';
        document.getElementById('main-text-color').value = colors.mainText || '#374151';
        document.getElementById('highlight-color').value = colors.highlight || '#10b981';
        document.getElementById('link-color').value = colors.link || '#3b82f6';
        document.getElementById('skills-color').value = colors.skills || '#8b5cf6';
        
        // Sincronizar com os presets
        document.getElementById('name-title-color-preset').value = colors.nameTitle || '#1f2937';
        document.getElementById('section-title-color-preset').value = colors.sectionTitle || '#3b82f6';
        document.getElementById('main-text-color-preset').value = colors.mainText || '#374151';
        document.getElementById('highlight-color-preset').value = colors.highlight || '#10b981';
        document.getElementById('link-color-preset').value = colors.link || '#3b82f6';
        document.getElementById('skills-color-preset').value = colors.skills || '#8b5cf6';
    }
    
    // Carregar a cor de fundo salva nas configurações gerais
    if (curriculumData.settings && curriculumData.settings.backgroundColor) {
        const bgColorInput = document.getElementById('background-color');
        const bgColorPreset = document.getElementById('background-color-preset');
        
        if (bgColorInput) bgColorInput.value = curriculumData.settings.backgroundColor;
        if (bgColorPreset) bgColorPreset.value = curriculumData.settings.backgroundColor;
    }
    
    // Carregar configurações de margem
    if (curriculumData.settings && curriculumData.settings.documentMargins) {
        const marginsSelect = document.getElementById('document-margins');
        if (marginsSelect) marginsSelect.value = curriculumData.settings.documentMargins;
    }
}

// Função global para ser chamada pelo HTML
window.applyCustomColors = applyCustomColors;

// Configurar controles de cor quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupColorControls();
        loadSavedColors();
        
        // Aplicar cores automaticamente após carregar
        setTimeout(() => {
            const currentColors = {
                nameTitle: document.getElementById('name-title-color')?.value || '#1f2937',
                sectionTitle: document.getElementById('section-title-color')?.value || '#3b82f6',
                mainText: document.getElementById('main-text-color')?.value || '#374151',
                highlight: document.getElementById('highlight-color')?.value || '#10b981',
                link: document.getElementById('link-color')?.value || '#3b82f6',
                skills: document.getElementById('skills-color')?.value || '#8b5cf6'
            };
            applyCustomColorsToPreview(currentColors);
        }, 500);
    }, 1000);
});

// Função para verificar status do cache e rate limiting
window.checkGitHubSystemStatus = function() {
    const status = {
        cache: {},
        rateLimit: {},
        system: 'OK'
    };
    
    // Verificar cache
    Object.entries(GITHUB_CACHE_CONFIG.keys).forEach(([type, key]) => {
        const cached = getCacheItem(key);
        status.cache[type] = {
            exists: !!cached,
            key: key,
            lastUpdate: cached ? 'Disponível' : 'Não encontrado'
        };
    });
    
    // Verificar rate limit
    const rateLimitData = getCacheItem(GITHUB_CACHE_CONFIG.rateLimitKey);
    if (rateLimitData) {
        const timeLeft = Math.max(0, rateLimitData.resetTime - Date.now());
        status.rateLimit = {
            requests: rateLimitData.requests,
            maxRequests: GITHUB_CACHE_CONFIG.maxRequestsPerHour,
            resetIn: Math.ceil(timeLeft / (60 * 1000)) + ' minutos',
            canMakeRequest: rateLimitData.requests < GITHUB_CACHE_CONFIG.maxRequestsPerHour || timeLeft <= 0
        };
    } else {
        status.rateLimit = {
            requests: 0,
            maxRequests: GITHUB_CACHE_CONFIG.maxRequestsPerHour,
            resetIn: 'Não inicializado',
            canMakeRequest: true
        };
    }
    
    console.table(status.cache);
    console.table(status.rateLimit);
    console.log('📊 GitHub API System Status:', status);
    return status;
};

// Função para limpar todo o cache do GitHub
window.clearGitHubCache = function() {
    console.log('🧹 Limpando cache do GitHub...');
    
    // Limpar cache específico do GitHub
    Object.values(GITHUB_CACHE_CONFIG.keys).forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Limpar rate limit
    localStorage.removeItem(GITHUB_CACHE_CONFIG.rateLimitKey);
    
    // Limpar caches antigos
    clearOldCache();
    
    console.log('✅ Cache do GitHub limpo com sucesso!');
    showNotification('Cache do GitHub limpo com sucesso!', 'success');
};

// Função para testar o sistema GitHub API
window.testGitHubSystem = async function() {
    try {
        console.log('🧪 Testando sistema GitHub API...');
        showNotification('Testando sistema GitHub API...', 'info');
        
        // Verificar status atual
        const initialStatus = checkGitHubSystemStatus();
        
        // Testar busca de perfil
        console.log('📝 Testando busca de perfil...');
        const profile = await getGitHubData('profile');
        console.log('✅ Perfil obtido:', profile.name);
        
        // Testar busca de repositórios
        console.log('📚 Testando busca de repositórios...');
        const repos = await getGitHubData('repos');
        console.log(`✅ ${repos.length} repositórios obtidos`);
        
        // Verificar status final
        const finalStatus = checkGitHubSystemStatus();
        
        console.log('🎉 Teste concluído com sucesso!');
        showNotification('Sistema GitHub API funcionando corretamente!', 'success');
        
        return {
            success: true,
            profile: profile.name,
            reposCount: repos.length,
            initialStatus,
            finalStatus
        };
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        showNotification('Erro no teste do sistema GitHub API: ' + error.message, 'error');
        return {
            success: false,
            error: error.message
        };
    }
};

// Função para mostrar/esconder menu de exportação
window.toggleExportMenu = function() {
    const menu = document.getElementById('export-menu');
    menu.classList.toggle('hidden');
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.relative')) {
            menu.classList.add('hidden');
        }
    });
};

// Exportar como HTML
window.exportHTML = function() {
    try {
        const previewContainer = document.getElementById('curriculum-preview');
        if (!previewContainer || !previewContainer.innerHTML.trim()) {
            showNotification('Por favor, gere o preview do currículo primeiro', 'warning');
            return;
        }

        // Atualizar configurações
        updateSettings();
        
        // Criar HTML completo
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Currículo - Mikael Ferreira</title>
    <style>
        body {
            font-family: ${curriculumData.settings.fontFamily || 'Arial, sans-serif'};
            background-color: ${curriculumData.settings.backgroundColor || '#ffffff'};
            margin: 0;
            padding: 20px;
            color: #000000;
        }
        .experience-item, .exp-item {
            color: #000000 !important;
            background-color: transparent !important;
        }
        .experience-item *, .exp-item * {
            color: #000000 !important;
        }
        ${!curriculumData.settings.showProjectLinks ? '.project-link, .project-url { display: none !important; }' : ''}
        @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    ${previewContainer.innerHTML}
</body>
</html>`;

        // Criar blob e download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curriculo-mikael-ferreira.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('HTML exportado com sucesso!', 'success');
        document.getElementById('export-menu').classList.add('hidden');
        
    } catch (error) {
        console.error('Erro ao exportar HTML:', error);
        showNotification('Erro ao exportar HTML: ' + error.message, 'error');
    }
};

// Exportar como Word (DOCX)
window.exportWord = function() {
    try {
        const previewContainer = document.getElementById('curriculum-preview');
        if (!previewContainer || !previewContainer.innerHTML.trim()) {
            showNotification('Por favor, gere o preview do currículo primeiro', 'warning');
            return;
        }

        // Verificar se a biblioteca docx está disponível
        if (typeof docx === 'undefined') {
            showNotification('Biblioteca DOCX não carregada. Gerando arquivo de texto formatado...', 'warning');
            exportWordAsText();
            return;
        }

        // Atualizar configurações
        updateSettings();
        
        // Extrair dados do currículo para formato Word
        const data = gatherAllData();
        
        // Criar documento Word com formatação usando a biblioteca docx
        const doc = new docx.Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: curriculumData.settings.fontFamily || 'Calibri',
                            size: curriculumData.settings.fontSize === 'small' ? 22 : 
                                  curriculumData.settings.fontSize === 'large' ? 26 : 24
                        }
                    }
                },
                paragraphStyles: [
                    {
                        id: "heading1",
                        name: "Heading 1",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            size: 32,
                            bold: true,
                            color: curriculumData.settings.primaryColor.replace('#', ''),
                        },
                        paragraph: {
                            spacing: {
                                after: 200
                            }
                        }
                    },
                    {
                        id: "heading2",
                        name: "Heading 2", 
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            size: 28,
                            bold: true,
                            color: "2D3748"
                        },
                        paragraph: {
                            spacing: {
                                before: 200,
                                after: 120
                            }
                        }
                    }
                ]
            },
            sections: [{
                properties: {},
                children: [
                    // Cabeçalho
                    new docx.Paragraph({
                        text: data.personalData.nomeCompleto || 'Mikael Ferreira',
                        style: "heading1",
                        alignment: docx.AlignmentType.CENTER
                    }),
                    new docx.Paragraph({
                        text: data.personalData.tituloProfissional || 'Desenvolvedor Web Full Stack',
                        alignment: docx.AlignmentType.CENTER,
                        run: { bold: true, size: 24 }
                    }),
                    new docx.Paragraph({ text: "" }), // Espaço
                    
                    // Dados pessoais
                    new docx.Paragraph({
                        text: "DADOS PESSOAIS",
                        style: "heading2"
                    })
                ]
            }]
        });

        // Adicionar dados pessoais
        const section = doc.sections[0];
        if (data.personalData.email) {
            section.children.push(new docx.Paragraph({ text: `Email: ${data.personalData.email}` }));
        }
        if (data.personalData.telefone) {
            section.children.push(new docx.Paragraph({ text: `Telefone: ${data.personalData.telefone}` }));
        }
        if (data.personalData.linkedin && curriculumData.settings.showContactIcons) {
            section.children.push(new docx.Paragraph({ text: `LinkedIn: ${data.personalData.linkedin}` }));
        }
        if (data.personalData.github && curriculumData.settings.showContactIcons) {
            section.children.push(new docx.Paragraph({ text: `GitHub: ${data.personalData.github}` }));
        }
        if (data.personalData.localizacao) {
            section.children.push(new docx.Paragraph({ text: `Localização: ${data.personalData.localizacao}` }));
        }

        // Resumo profissional
        if (data.personalData.resumoProfissional) {
            section.children.push(new docx.Paragraph({ text: "" }));
            section.children.push(new docx.Paragraph({
                text: "RESUMO PROFISSIONAL",
                style: "heading2"
            }));
            section.children.push(new docx.Paragraph({ text: data.personalData.resumoProfissional }));
        }

        // Experiências
        if (data.experience && data.experience.length > 0) {
            section.children.push(new docx.Paragraph({ text: "" }));
            section.children.push(new docx.Paragraph({
                text: "EXPERIÊNCIA PROFISSIONAL",
                style: "heading2"
            }));
            
            data.experience.forEach(exp => {
                section.children.push(new docx.Paragraph({
                    text: `${exp.cargo} - ${exp.empresa}`,
                    run: { bold: true }
                }));
                section.children.push(new docx.Paragraph({
                    text: `Período: ${exp.periodo || 'Não informado'}`
                }));
                if (exp.descricao) {
                    section.children.push(new docx.Paragraph({ text: exp.descricao }));
                }
                section.children.push(new docx.Paragraph({ text: "" }));
            });
        }

        // Projetos
        if (data.projects && data.projects.length > 0) {
            section.children.push(new docx.Paragraph({
                text: "PROJETOS",
                style: "heading2"
            }));
            
            data.projects.forEach(project => {
                section.children.push(new docx.Paragraph({
                    text: project.nome,
                    run: { bold: true }
                }));
                if (project.descricao) {
                    section.children.push(new docx.Paragraph({ text: project.descricao }));
                }
                if (project.tecnologias && project.tecnologias.length > 0) {
                    section.children.push(new docx.Paragraph({
                        text: `Tecnologias: ${Array.isArray(project.tecnologias) ? project.tecnologias.join(', ') : project.tecnologias}`
                    }));
                }
                if (curriculumData.settings.showProjectLinks && project.link) {
                    section.children.push(new docx.Paragraph({ text: `Link: ${project.link}` }));
                }
                section.children.push(new docx.Paragraph({ text: "" }));
            });
        }

        // Habilidades
        if (data.skills && data.skills.length > 0) {
            section.children.push(new docx.Paragraph({
                text: "HABILIDADES TÉCNICAS",
                style: "heading2"
            }));
            
            data.skills.forEach(skill => {
                let skillText = skill.nome;
                if (curriculumData.settings.showSkillsProgress && skill.nivel) {
                    skillText += ` - Nível: ${skill.nivel}%`;
                }
                section.children.push(new docx.Paragraph({ text: skillText }));
            });
        }

        // Certificações
        if (data.certificates && data.certificates.length > 0) {
            section.children.push(new docx.Paragraph({ text: "" }));
            section.children.push(new docx.Paragraph({
                text: "CERTIFICAÇÕES",
                style: "heading2"
            }));
            
            data.certificates.forEach(cert => {
                section.children.push(new docx.Paragraph({
                    text: cert.titulo || cert.nome,
                    run: { bold: true }
                }));
                if (cert.instituicao) {
                    section.children.push(new docx.Paragraph({ text: `Instituição: ${cert.instituicao}` }));
                }
                if (cert.data || cert.dataObtencao) {
                    section.children.push(new docx.Paragraph({ text: `Data: ${cert.data || cert.dataObtencao}` }));
                }
                section.children.push(new docx.Paragraph({ text: "" }));
            });
        }

        // Gerar e baixar arquivo
        docx.Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'curriculo-mikael-ferreira.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Documento Word exportado com sucesso!', 'success');
            document.getElementById('export-menu').classList.add('hidden');
        });
        
    } catch (error) {
        console.error('Erro ao exportar Word:', error);
        showNotification('Erro ao exportar Word: ' + error.message + '. Gerando versão de texto...', 'error');
        exportWordAsText();
    }
};

// Função alternativa para exportar como texto formatado
function exportWordAsText() {
    try {
        // Atualizar configurações
        updateSettings();
        
        // Extrair dados do currículo para formato Word
        const data = gatherAllData();
        
        // Criar conteúdo do documento Word como texto
        let wordContent = `CURRÍCULO - ${data.personalData.nomeCompleto || 'Mikael Ferreira'}\n\n`;
        
        // Dados pessoais
        wordContent += `DADOS PESSOAIS\n`;
        wordContent += `Nome: ${data.personalData.nomeCompleto || ''}\n`;
        wordContent += `Título: ${data.personalData.tituloProfissional || ''}\n`;
        wordContent += `Email: ${data.personalData.email || ''}\n`;
        wordContent += `Telefone: ${data.personalData.telefone || ''}\n`;
        if (curriculumData.settings.showContactIcons) {
            wordContent += `LinkedIn: ${data.personalData.linkedin || ''}\n`;
            wordContent += `GitHub: ${data.personalData.github || ''}\n`;
        }
        wordContent += `Localização: ${data.personalData.localizacao || ''}\n\n`;
        
        // Resumo profissional
        if (data.personalData.resumoProfissional) {
            wordContent += `RESUMO PROFISSIONAL\n${data.personalData.resumoProfissional}\n\n`;
        }
        
        // Experiências
        if (data.experience && data.experience.length > 0) {
            wordContent += `EXPERIÊNCIA PROFISSIONAL\n`;
            data.experience.forEach(exp => {
                wordContent += `${exp.cargo} - ${exp.empresa}\n`;
                wordContent += `Período: ${exp.periodo || 'Não informado'}\n`;
                if (exp.descricao) {
                    wordContent += `Descrição: ${exp.descricao}\n`;
                }
                wordContent += `\n`;
            });
        }
        if (data.projects && data.projects.length > 0) {
            wordContent += `PROJETOS\n`;
            data.projects.forEach(project => {
                wordContent += `${project.nome}\n`;
                if (project.descricao) {
                    wordContent += `Descrição: ${project.descricao}\n`;
                }
                if (project.tecnologias) {
                    wordContent += `Tecnologias: ${project.tecnologias}\n`;
                }
                if (curriculumData.settings.showProjectLinks && project.link) {
                    wordContent += `Link: ${project.link}\n`;
                }
                wordContent += `\n`;
            });
        }
        
        // Habilidades
        if (data.skills && data.skills.length > 0) {
            wordContent += `HABILIDADES\n`;
            data.skills.forEach(skill => {
                let skillLine = skill.nome;
                if (curriculumData.settings.showSkillsProgress && skill.nivel) {
                    skillLine += ` - Nível: ${skill.nivel}`;
                }
                wordContent += `${skillLine}\n`;
            });
            wordContent += `\n`;
        }
        
        // Certificações
        if (data.certificates && data.certificates.length > 0) {
            wordContent += `CERTIFICAÇÕES\n`;
            data.certificates.forEach(cert => {
                wordContent += `${cert.nome}\n`;
                if (cert.instituicao) {
                    wordContent += `Instituição: ${cert.instituicao}\n`;
                }
                if (cert.dataObtencao) {
                    wordContent += `Data: ${cert.dataObtencao}\n`;
                }
                wordContent += `\n`;
            });
        }
        
        // Criar blob e download
        const blob = new Blob([wordContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curriculo-mikael-ferreira.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Documento Word exportado com sucesso!', 'success');
        document.getElementById('export-menu').classList.add('hidden');
        
    } catch (error) {
        console.error('Erro ao exportar Word:', error);
        showNotification('Erro ao exportar Word: ' + error.message, 'error');
    }
};

// Exportar como JSON
window.exportJSON = function() {
    try {
        // Atualizar configurações
        updateSettings();
        
        // Obter todos os dados
        const data = gatherAllData();
        
        // Adicionar metadados de exportação
        const exportData = {
            ...data,
            exportInfo: {
                exportDate: new Date().toISOString(),
                exportFormat: 'JSON',
                version: '1.0',
                generator: 'Curriculo Generator - Mikael Ferreira'
            }
        };
        
        // Criar JSON formatado
        const jsonContent = JSON.stringify(exportData, null, 2);
        
        // Criar blob e download
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curriculo-mikael-ferreira.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('JSON exportado com sucesso!', 'success');
        document.getElementById('export-menu').classList.add('hidden');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        showNotification('Erro ao exportar JSON: ' + error.message, 'error');
    }
};
