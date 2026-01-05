// ==================== SISTEMA DE CACHE E RATE LIMITING PARA GITHUB API ====================

// Importar sistema centralizado de rate limiting
import { gitHubAPI } from './github-rate-limit.js';

// Usuário do GitHub do portfolio
const GITHUB_USERNAME = 'mikaeldmts';

// Flag global para evitar requisições quando GitHub está bloqueando
let _githubRateLimited = false;
let _githubRateLimitResetTime = null;
let _syncProfilePhotoExecuted = false; // Evitar chamadas duplicadas

// Configuração de cache e rate limiting (mantida para compatibilidade)
const GITHUB_CACHE_CONFIG = {
    PROFILE_CACHE_KEY: 'github_profile_cache',
    REPOS_CACHE_KEY: 'github_repos_cache',
    RATE_LIMIT_KEY: 'github_rate_limit',
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
    RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1 hora
    MAX_REQUESTS_PER_HOUR: 50, // Conservador para evitar limits
    RETRY_DELAYS: [1000, 2000, 5000, 10000] // Backoff exponencial
};

// Usar funções do sistema centralizado
function checkRateLimit() {
    return gitHubAPI.rateLimit.checkRateLimit();
}

function incrementRateLimit() {
    return gitHubAPI.rateLimit.incrementRateLimit();
}

// Dados estáticos de fallback para quando a API não estiver disponível
const GITHUB_FALLBACK_DATA = {
    profile: {
        login: "mikaeldmts",
        name: "Mikael Ferreira",
        bio: "Desenvolvedor Web Full Stack | JavaScript | React | Node.js | Apaixonado por tecnologia e inovação",
        avatar_url: "https://i.ibb.co/BVvyXjRQ/Whats-App-Image-2025-01-29-at-14-52-511.jpg",
        html_url: "https://github.com/mikaeldmts",
        public_repos: 25,
        followers: 12,
        following: 15,
        location: "Brasil",
        company: "Freelancer",
        blog: "",
        email: null,
        created_at: "2020-01-15T00:00:00Z"
    },
    repos: [
        {
            name: "portfolio-website",
            description: "Portfolio pessoal desenvolvido com HTML, CSS, JavaScript e integração com Firebase",
            html_url: "https://github.com/mikaeldmts/portfolio-website",
            language: "JavaScript",
            stargazers_count: 5,
            forks_count: 2,
            updated_at: "2024-12-15T10:30:00Z",
            topics: ["portfolio", "javascript", "firebase", "responsive"]
        },
        {
            name: "react-dashboard",
            description: "Dashboard administrativo desenvolvido em React com integração de APIs",
            html_url: "https://github.com/mikaeldmts/react-dashboard",
            language: "JavaScript",
            stargazers_count: 8,
            forks_count: 3,
            updated_at: "2024-12-10T15:20:00Z",
            topics: ["react", "dashboard", "admin", "api"]
        },
        {
            name: "node-api-rest",
            description: "API RESTful desenvolvida em Node.js com Express e MongoDB",
            html_url: "https://github.com/mikaeldmts/node-api-rest",
            language: "JavaScript",
            stargazers_count: 12,
            forks_count: 4,
            updated_at: "2024-12-05T09:15:00Z",
            topics: ["nodejs", "express", "mongodb", "api", "rest"]
        },
        {
            name: "css-animations-library",
            description: "Biblioteca de animações CSS modernas e responsivas",
            html_url: "https://github.com/mikaeldmts/css-animations-library",
            language: "CSS",
            stargazers_count: 15,
            forks_count: 6,
            updated_at: "2024-11-28T14:45:00Z",
            topics: ["css", "animations", "frontend", "responsive"]
        },
        {
            name: "js-utils-collection",
            description: "Coleção de utilitários JavaScript para desenvolvimento web",
            html_url: "https://github.com/mikaeldmts/js-utils-collection",
            language: "JavaScript",
            stargazers_count: 7,
            forks_count: 2,
            updated_at: "2024-11-20T11:30:00Z",
            topics: ["javascript", "utilities", "helpers", "frontend"]
        }
    ]
};

// Função para gerenciar cache
function getCacheItem(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        if (now - data.timestamp > GITHUB_CACHE_CONFIG.CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data.value;
    } catch (error) {
        console.warn('Erro ao ler cache:', error);
        return null;
    }
}

function setCacheItem(key, value) {
    try {
        const data = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('Erro ao salvar cache:', error);
    }
}

// Cache gerado via GitHub Actions (não expõe token no frontend)
async function getGitHubActionsCache() {
    try {
        const res = await fetch('assets/data/github-cache.json', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || typeof data !== 'object') return null;
        return data;
    } catch {
        return null;
    }
}

// Função melhorada para fazer requisições ao GitHub com retry e fallback (usando sistema centralizado)
async function makeGitHubRequest(url, useCache = true) {
    try {
        // Se já sabemos que o GitHub está bloqueando, ir direto para fallback
        if (_githubRateLimited) {
            const now = Date.now();
            if (_githubRateLimitResetTime && now < _githubRateLimitResetTime) {
                // Ainda em rate limit, usar fallback silenciosamente
                if (url.includes('/users/')) {
                    return { json: () => Promise.resolve(GITHUB_FALLBACK_DATA.profile) };
                } else if (url.includes('/repos')) {
                    return { json: () => Promise.resolve(GITHUB_FALLBACK_DATA.repositories || GITHUB_FALLBACK_DATA.repos) };
                }
            } else {
                // Reset time passou, tentar novamente
                _githubRateLimited = false;
            }
        }
        
        // Extrair endpoint da URL
        const endpoint = url.replace('https://api.github.com', '');
        
        // Usar sistema centralizado
        const data = await gitHubAPI.makeRequest(endpoint, useCache);
        
        // Retornar no formato esperado pelo código legado
        return { json: () => Promise.resolve(data) };
        
    } catch (error) {
        // Detectar rate limit do GitHub e marcar para evitar mais requisições
        if (error.message && error.message.includes('Rate limit')) {
            _githubRateLimited = true;
            _githubRateLimitResetTime = error.resetTime || (Date.now() + 60 * 60 * 1000); // 1 hora
            
            // Marcar globalmente para outros scripts (Minerva, etc)
            try {
                localStorage.setItem('github_rate_limited', JSON.stringify({
                    blocked: true,
                    resetTime: _githubRateLimitResetTime
                }));
            } catch {}
        }
        
        // Fallback silencioso (sem warn no console se já é rate limit conhecido)
        if (!_githubRateLimited) {
            console.warn('Erro na requisição GitHub (fallback para dados estáticos):', error.message);
        }
        
        // Fallback para dados estáticos baseado na URL
        if (url.includes('/users/')) {
            return { json: () => Promise.resolve(GITHUB_FALLBACK_DATA.profile) };
        } else if (url.includes('/repos')) {
            return { json: () => Promise.resolve(GITHUB_FALLBACK_DATA.repositories || GITHUB_FALLBACK_DATA.repos) };
        }
        
        throw error;
    }
}

// Função para obter dados do GitHub com fallback robusto
async function getGitHubData(type, forceRefresh = false) {
    try {
        // 1) Prioridade: cache gerado via Actions
        // (ideal para GitHub Pages: sem token no client, sem 401, sem secret scanning)
        if (!forceRefresh) {
            const actionsCache = await getGitHubActionsCache();
            if (actionsCache) {
                if (type === 'profile' && actionsCache.profile) return actionsCache.profile;
                if (type === 'repos' && Array.isArray(actionsCache.repos)) return actionsCache.repos;
            }
        }

        if (type === 'profile') {
            // Verificar cache primeiro se não forçar refresh
            if (!forceRefresh) {
                const cached = getCacheItem(GITHUB_CACHE_CONFIG.PROFILE_CACHE_KEY);
                if (cached) {
                    return cached;
                }
            }
            
            const response = await makeGitHubRequest(`https://api.github.com/users/${GITHUB_USERNAME}`, !forceRefresh);
            return await response.json();
            
        } else if (type === 'repos') {
            // Verificar cache primeiro se não forçar refresh
            if (!forceRefresh) {
                const cached = getCacheItem(GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY);
                if (cached) {
                    return cached;
                }
            }
            
            const response = await makeGitHubRequest(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=10`, !forceRefresh);
            return await response.json();
        }
        
    } catch (error) {
        console.warn(`Erro ao buscar ${type} do GitHub, usando dados de fallback:`, error.message);
        
        // Retornar dados de fallback
        if (type === 'profile') {
            return GITHUB_FALLBACK_DATA.profile;
        } else if (type === 'repos') {
            return GITHUB_FALLBACK_DATA.repos;
        }
    }
    
    return null;
}

// Função para buscar dados do perfil do GitHub
async function fetchGitHubProfile(username) {
    console.log(`👤 Buscando perfil do GitHub para: ${username}`);
    
    try {
        const profileData = await getGitHubData('profile');
        
        if (profileData) {
            console.log('✅ Perfil obtido com sucesso:', profileData.name || profileData.login);
            updateGitHubProfile(profileData);
        } else {
            console.warn('⚠️ Nenhum dado de perfil encontrado');
            // Usar dados de fallback
            updateGitHubProfile(GITHUB_FALLBACK_DATA.profile);
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        // Usar dados de fallback em caso de erro
        updateGitHubProfile(GITHUB_FALLBACK_DATA.profile);
    }
}

// Função para buscar repositórios do GitHub
async function fetchGitHubRepositories(username) {
    console.log(`📚 Buscando repositórios do GitHub para: ${username}`);
    
    try {
        const repos = await getGitHubData('repos');
        
        if (repos && Array.isArray(repos)) {
            console.log(`✅ ${repos.length} repositórios obtidos com sucesso`);
            updateGitHubRepos(repos);
        } else {
            console.warn('⚠️ Nenhum repositório encontrado');
            // Usar dados de fallback
            updateGitHubRepos(GITHUB_FALLBACK_DATA.repos);
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar repositórios:', error);
        // Usar dados de fallback em caso de erro
        updateGitHubRepos(GITHUB_FALLBACK_DATA.repos);
    }
}

// Função duplicada removida - usando apenas a versão melhorada acima

// Função para sincronizar foto do perfil com GitHub API
async function syncProfilePhoto() {
    // Evitar chamadas duplicadas
    if (_syncProfilePhotoExecuted) {
        return;
    }
    _syncProfilePhotoExecuted = true;
    
    try {
        console.log('🖼️ Sincronizando foto do perfil com GitHub API...');
        
        const profileData = await getGitHubData('profile');
        const profilePhotos = document.querySelectorAll('.foto-perfil img, #profile-photo');
        
        if (profileData && profileData.avatar_url) {
            profilePhotos.forEach(img => {
                if (img) {
                    img.src = profileData.avatar_url;
                    console.log('✅ Foto do perfil atualizada:', profileData.avatar_url);
                }
            });
        } else {
            // Usar foto de fallback
            profilePhotos.forEach(img => {
                if (img) {
                    img.src = GITHUB_FALLBACK_DATA.profile.avatar_url;
                    console.log('✅ Usando foto de fallback');
                }
            });
        }
    } catch (error) {
        console.log('⚠️ Erro ao sincronizar foto do perfil, usando fallback:', error);
        const profilePhotos = document.querySelectorAll('.foto-perfil img, #profile-photo');
        profilePhotos.forEach(img => {
            if (img) {
                img.src = GITHUB_FALLBACK_DATA.profile.avatar_url;
            }
        });
    }
}

// Sistema de Partículas
function initParticleSystem() {
    // Criar container de partículas se não existir
    let container = document.querySelector('.particles-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'particles-container';
        document.body.insertBefore(container, document.body.firstChild);
    }
    
    // Configurações do sistema de partículas
    const config = {
        particleCount: 40,          // Número total de partículas
        minSize: 2,                 // Tamanho mínimo em pixels
        maxSize: 5,                 // Tamanho máximo em pixels
        minSpeed: 1,                // Velocidade mínima (pixels por segundo)
        maxSpeed: 3,                // Velocidade máxima (pixels por segundo)
        types: ['golden', 'light', 'dark'] // Tipos de partículas
    };
    
    // Criar partículas iniciais
    for (let i = 0; i < config.particleCount; i++) {
        createParticle(container, config);
    }
}

function createParticle(container, config) {
    // Criar elemento da partícula
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Configurações aleatórias para esta partícula
    const size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const speed = Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed;
    const delay = Math.random() * 5; // Delay aleatório para iniciar animação
    const duration = Math.random() * 10 + 15; // Duração entre 15-25 segundos
    const type = config.types[Math.floor(Math.random() * config.types.length)];
    
    // Adicionar classe de tipo
    particle.classList.add(type);
    
    // Aplicar propriedades CSS
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    
    // Configurar animação
    const keyframes = [
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(${Math.random() * 360}deg)`, opacity: 0.8 },
        { transform: `translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ];
    
    const animOptions = {
        duration: duration * 1000,
        delay: delay * 1000,
        iterations: 1,
        easing: 'ease-in-out',
        fill: 'forwards'
    };
    
    // Adicionar ao DOM
    container.appendChild(particle);
    
    // Iniciar animação
    const anim = particle.animate(keyframes, animOptions);
    
    // Remover partícula quando animação terminar e criar uma nova
    anim.onfinish = () => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
        createParticle(container, config);
    };
}

// Garantir que a sincronização da foto funcione em todas as páginas
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(syncProfilePhoto, 100);
    
    // Sistema de partículas DESABILITADO para melhor performance
    // initParticleSystem();
    
    // Carregar perfil do LinkedIn se estivermos na página principal
    setTimeout(() => {
        if (document.getElementById('linkedin-profile')) {
            loadLinkedInProfile();
        }
    }, 500);
});

// Sincronizar foto quando a página estiver totalmente carregada
window.addEventListener('load', () => {
    setTimeout(syncProfilePhoto, 200);
});

function toggleMenu() {
    let menu = document.getElementById("menu-lateral");
    menu.classList.toggle("menu-aberto");
}

// Função para o novo menu horizontal
function toggleHorizontalMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (navMenu) {
        navMenu.classList.toggle('active');
        
        // Animar o ícone do toggle
        const icon = navToggle.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    }
}

// Fechar menu horizontal ao clicar fora dele
document.addEventListener('click', function(event) {
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    const horizontalNav = document.querySelector('.horizontal-nav');
    
    if (navMenu && navMenu.classList.contains('active')) {
        if (!horizontalNav.contains(event.target)) {
            navMenu.classList.remove('active');
            const icon = navToggle.querySelector('i');
            icon.className = 'fas fa-bars';
        }
    }
});

// Fechar menu horizontal ao redimensionar a tela
window.addEventListener('resize', function() {
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (window.innerWidth > 768 && navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        const icon = navToggle.querySelector('i');
        icon.className = 'fas fa-bars';
    }
});

// Tornar as funções globais para serem acessíveis pelo HTML
window.toggleMenu = toggleMenu;
window.toggleHorizontalMenu = toggleHorizontalMenu;

// Loading Screen
window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    // Sincronizar foto do perfil
    syncProfilePhoto();
    
    // Carregar dados do GitHub ao finalizar o carregamento da página
    console.log('🚀 Página carregada, iniciando fetchGitHubData...');
    
    // Aguardar um pouco para garantir que todos os elementos estão disponíveis
    setTimeout(() => {
        const reposElement = document.getElementById('github-repos');
        const profileElement = document.getElementById('github-profile');
        console.log('📦 Elemento github-repos encontrado:', !!reposElement);
        console.log('👤 Elemento github-profile encontrado:', !!profileElement);
        console.log('🎯 DOM está pronto, iniciando fetchGitHubData...');
        
        // Log adicional para verificar estado dos elementos
        if (profileElement) {
            console.log('🔍 Conteúdo atual do perfil:', profileElement.innerHTML);
        }
        if (reposElement) {
            console.log('🔍 Conteúdo atual dos repos:', reposElement.innerHTML);
        }
        
        fetchGitHubData();
        ensureReposDisplay(); // Garantir que os repos sejam exibidos
    }, 500); // Aumentei o tempo de 100ms para 500ms
});

// Função para garantir que os repositórios sejam exibidos
function ensureReposDisplay() {
    const reposElement = document.getElementById('github-repos');
    
    if (!reposElement) {
        console.warn('⚠️ Elemento github-repos não encontrado');
        return;
    }
    
    // Se o elemento está vazio ou só tem loading, tentar recarregar
    if (!reposElement.innerHTML.trim() || reposElement.innerHTML.includes('Carregando')) {
        console.log('🔄 Tentando recarregar repositórios...');
        
        // Verificar se há dados em cache
        const cachedRepos = getCacheItem(GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY);
        
        if (cachedRepos && cachedRepos.length > 0) {
            console.log('📦 Usando dados do cache para repositórios');
            displayRepositories(cachedRepos);
        } else {
            console.log('🌐 Fazendo nova requisição para repositórios');
            // Se não há cache, fazer nova requisição
            fetchGitHubRepositories().then(repos => {
                if (repos && repos.length > 0) {
                    displayRepositories(repos);
                }
            }).catch(error => {
                console.error('❌ Erro ao buscar repositórios:', error);
            });
        }
    }
    
    // Remover classe de loading se ainda estiver presente
    reposElement.classList.remove('loading');
}

// Função para exibir repositórios
function displayRepositories(repos) {
    console.log('🎨 Exibindo repositórios:', repos);
    
    if (!Array.isArray(repos) || repos.length === 0) {
        console.warn('❌ Dados de repositórios inválidos para exibição');
        return;
    }
    
    // Usar a função existente updateGitHubRepos que já tem a estilização premium
    updateGitHubRepos(repos);
}

// Função para buscar dados do GitHub
async function fetchGitHubData() {
    // Nome de usuário do GitHub (altere para o seu)
    const username = GITHUB_USERNAME;
    
    // Verificar cache primeiro
    const cachedData = getFromCache();
    if (cachedData) {
        console.log('📂 Usando dados do cache...');
        const { languageStats, technologyStats, totalBytes } = cachedData;
        createSkillCards(languageStats, technologyStats, totalBytes, true);
        
        // Usar dados de fallback para perfil e repos
        fetchGitHubProfile(username);
        fetchGitHubRepositories(username);
        return;
    }
    
    console.log('🔄 Tentando buscar dados reais da API do GitHub para:', username);
    
    try {
        // Tentar buscar dados de perfil e repositórios
        await Promise.all([
            fetchGitHubProfile(username),
            fetchGitHubRepositories(username)
        ]);
        
        // Tentar analisar habilidades dos repositórios
        await analyzeSkillsFromRepos(username);
        
    } catch (error) {
        console.error('❌ Erro ao buscar dados do GitHub:', error);
        console.log('🔄 Usando dados de fallback como alternativa...');
        
        // Usar dados de fallback completos em caso de erro
        useFallbackData();
        
        // Gerar skills de fallback
        generateFallbackSkills();
    }
    
    // Verificação adicional após 2 segundos para garantir que tudo foi aplicado
    setTimeout(() => {
        console.log('🕒 Verificação final dos dados GitHub...');
        const profileElement = document.getElementById('github-profile');
        const reposElement = document.getElementById('github-repos');
        
        if (profileElement && profileElement.innerHTML.includes('loader')) {
            console.log('⚠️ Perfil ainda com loader, forçando atualização...');
            const realProfile = {
                name: "Mikael Ferreira",
                bio: null,
                public_repos: 6,
                followers: 1,
                following: 0,
                avatar_url: "https://avatars.githubusercontent.com/u/142128917?v=4",
                html_url: `https://github.com/${GITHUB_USERNAME}`
            };
            updateGitHubProfile(realProfile);
        }
        
        if (reposElement && reposElement.innerHTML.includes('loader')) {
            console.log('⚠️ Repos ainda com loader, forçando atualização...');
            useFallbackData();
        }
    }, 2000);
}

// Função para obter dados do cache de skills
function getFromCache() {
    try {
        const cacheKey = 'github-skills-cache';
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Cache válido por 1 hora (3600000 ms)
        if (now - data.timestamp > 3600000) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        console.log('📂 Cache de skills encontrado e válido');
        return data.skills;
    } catch (error) {
        console.warn('⚠️ Erro ao ler cache de skills:', error);
        return null;
    }
}

// Função para salvar dados no cache de skills
function saveToCache(skillsData) {
    try {
        const cacheKey = 'github-skills-cache';
        const data = {
            skills: skillsData,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(data));
        console.log('💾 Skills salvas no cache com sucesso');
    } catch (error) {
        console.warn('⚠️ Erro ao salvar cache de skills:', error);
    }
}

// Função para analisar habilidades a partir dos repositórios
async function analyzeSkillsFromRepos(username) {
    console.log(`🔍 Analisando habilidades dos repositórios de ${username}...`);
    
    try {
        // Buscar repositórios do usuário
        const repos = await getGitHubData('repos');
        
        // Verificar se repos é um array válido
        if (!repos || !Array.isArray(repos) || repos.length === 0) {
            console.warn('❌ Nenhum repositório encontrado para análise ou dados inválidos');
            generateFallbackSkills();
            return;
        }
        
        console.log(`📚 Encontrados ${repos.length} repositórios para análise`);
        
        // Inicializar contadores
        const languageStats = {};
        const technologyStats = {
            'Firebase': 0,
            'Git': 15, // Base para controle de versão
            'GitHub': 10, // Base para hospedagem
            'VS Code': 8, // Editor padrão
            'API REST': 5 // Base para desenvolvimento web
        };
        let totalBytes = 0;
        
        // Analisar cada repositório
        for (const repo of repos) {
            // Analisar linguagem principal
            if (repo.language) {
                languageStats[repo.language] = (languageStats[repo.language] || 0) + (repo.size || 1024);
                totalBytes += (repo.size || 1024);
                
                // Inferir tecnologias baseadas na linguagem
                if (repo.language === 'JavaScript') {
                    technologyStats['Node.js'] = (technologyStats['Node.js'] || 0) + 10;
                    technologyStats['HTML'] = (technologyStats['HTML'] || 0) + 8;
                    technologyStats['CSS'] = (technologyStats['CSS'] || 0) + 8;
                } else if (repo.language === 'Python') {
                    technologyStats['Flask'] = (technologyStats['Flask'] || 0) + 5;
                    technologyStats['Django'] = (technologyStats['Django'] || 0) + 3;
                } else if (repo.language === 'HTML') {
                    technologyStats['CSS'] = (technologyStats['CSS'] || 0) + 10;
                    technologyStats['Bootstrap'] = (technologyStats['Bootstrap'] || 0) + 5;
                }
            }
            
            // Analisar nome e descrição para inferir tecnologias
            const repoText = `${repo.name} ${repo.description || ''}`.toLowerCase();
            
            if (repoText.includes('firebase')) technologyStats['Firebase'] += 15;
            if (repoText.includes('react')) technologyStats['React'] = (technologyStats['React'] || 0) + 12;
            if (repoText.includes('vue')) technologyStats['Vue.js'] = (technologyStats['Vue.js'] || 0) + 12;
            if (repoText.includes('angular')) technologyStats['Angular'] = (technologyStats['Angular'] || 0) + 12;
            if (repoText.includes('node')) technologyStats['Node.js'] = (technologyStats['Node.js'] || 0) + 10;
            if (repoText.includes('api')) technologyStats['API REST'] += 8;
            if (repoText.includes('portfolio') || repoText.includes('site')) {
                technologyStats['HTML'] = (technologyStats['HTML'] || 0) + 10;
                technologyStats['CSS'] = (technologyStats['CSS'] || 0) + 10;
                technologyStats['JavaScript'] = (technologyStats['JavaScript'] || 0) + 10;
            }
            if (repoText.includes('bot')) {
                technologyStats['Node.js'] = (technologyStats['Node.js'] || 0) + 8;
                technologyStats['API REST'] += 5;
            }
            if (repoText.includes('backend')) {
                technologyStats['Node.js'] = (technologyStats['Node.js'] || 0) + 12;
                technologyStats['API REST'] += 10;
                technologyStats['Express.js'] = (technologyStats['Express.js'] || 0) + 8;
            }
        }
        
        // Garantir que JavaScript esteja presente se houver repos JS
        if (languageStats['JavaScript'] && !technologyStats['JavaScript']) {
            languageStats['JavaScript'] = languageStats['JavaScript'] || totalBytes * 0.4;
        }
        
        // Se não houver dados suficientes, usar fallback
        if (Object.keys(languageStats).length === 0 && totalBytes === 0) {
            console.log('⚠️ Dados insuficientes da API, usando habilidades de fallback');
            generateFallbackSkills();
            return;
        }
        
        // Garantir um total mínimo de bytes
        if (totalBytes < 50000) {
            totalBytes = 150000; // 150KB mínimo
        }
        
        console.log('📊 Estatísticas analisadas:');
        console.log('- Linguagens:', languageStats);
        console.log('- Tecnologias:', technologyStats);
        console.log('- Total bytes:', totalBytes);
        
        // Gerar cartões de habilidades
        createSkillCards(languageStats, technologyStats, totalBytes, false);
        
        // Salvar no cache
        saveToCache({ languageStats, technologyStats, totalBytes });
        
        console.log('✅ Análise de habilidades concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao analisar habilidades dos repositórios:', error);
        console.log('🔄 Fallback para habilidades padrão...');
        generateFallbackSkills();
    }
}

// Função para usar dados de fallback
function useFallbackData() {
    console.log(`📊 Iniciando useFallbackData com dados REAIS do ${GITHUB_USERNAME}...`);
    
    // Dados REAIS do perfil do GitHub (obtidos da API GitHub)
    const fallbackProfile = {
        name: "Mikael Ferreira",
        bio: null,
        public_repos: 6,
        followers: 1,
        following: 0,
        avatar_url: "https://avatars.githubusercontent.com/u/142128917?v=4",
        html_url: `https://github.com/${GITHUB_USERNAME}`
    };
    
    console.log('✅ Dados do perfil real:', fallbackProfile);
    updateGitHubProfile(fallbackProfile);
    
    // Força uma segunda atualização após um delay maior
    setTimeout(() => {
        console.log('🔄 Forçando atualização do perfil GitHub novamente...');
        updateGitHubProfile(fallbackProfile);
    }, 1000);
    
    // Dados REAIS dos repositórios do GitHub (obtidos da API GitHub)
    const fallbackRepos = [
        {
            name: "api",
            description: "API desenvolvida em JavaScript",
            html_url: `https://github.com/${GITHUB_USERNAME}/api`,
            language: "JavaScript",
            stargazers_count: 1,
            forks_count: 0
        },
        {
            name: "backendapiv2",
            description: "Backend API v2",
            html_url: `https://github.com/${GITHUB_USERNAME}/backendapiv2`,
            language: null,
            stargazers_count: 0,
            forks_count: 0
        },
        {
            name: "botauthentic",
            description: "bot-authentic",
            html_url: `https://github.com/${GITHUB_USERNAME}/botauthentic`,
            language: null,
            stargazers_count: 0,
            forks_count: 0
        },
        {
            name: "eu",
            description: "Portfolio pessoal",
            html_url: `https://github.com/${GITHUB_USERNAME}/eu`,
            language: "JavaScript",
            stargazers_count: 1,
            forks_count: 0
        },
        {
            name: "portfolio",
            description: "Portfolio atualizado",
            html_url: `https://github.com/${GITHUB_USERNAME}/portfolio`,
            language: "JavaScript",
            stargazers_count: 0,
            forks_count: 0
        },
        {
            name: "seu-site-perfil",
            description: "Site de perfil pessoal",
            html_url: `https://github.com/${GITHUB_USERNAME}/seu-site-perfil`,
            language: "HTML",
            stargazers_count: 0,
            forks_count: 0
        }
    ];
    
    console.log('✅ Dados dos repositórios reais:', fallbackRepos);
    updateGitHubRepos(fallbackRepos);
}

function generateFallbackSkills() {
    // Dados de fallback baseados no perfil do GitHub
    const fallbackLanguageStats = {
        JavaScript: 70.5,  // Maior proporção baseada nos repositórios JS
        HTML: 20.2,        // Site/perfil tem bastante HTML
        CSS: 8.1,          // Estilização dos projetos
        JSON: 1.0,         // Configurações dos projetos
        Markdown: 0.2      // READMEs dos projetos
    };
    
    const fallbackTechnologyStats = {
        Firebase: 45.0,           // Muito usado no perfil
        Git: 35.0               // Controle de versão
    };
    
    const fallbackTotalBytes = 1024 * 750; // 750KB mais realista
    
    console.log(`🎨 Gerando skills de fallback baseadas no perfil ${GITHUB_USERNAME}...`);
    createSkillCards(fallbackLanguageStats, fallbackTechnologyStats, fallbackTotalBytes, false);
}

// Função principal para gerar cartões de habilidades (versão aprimorada)
function generateSkillsCards(languageStats, technologyStats, totalBytes, fromCache = false) {
    console.log('🎨 Gerando cards de skills com dados:', { languageStats, technologyStats, totalBytes });
    
    const skillsGrid = document.querySelector('.skills-grid');
    if (!skillsGrid) {
        console.warn('❌ Elemento skills-grid não encontrado!');
        return;
    }
    
    // Remover loader
    const loadingElement = document.getElementById('skills-loading');
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Combinar dados de linguagens e tecnologias
    const allSkills = {};
    
    // Processar linguagens
    Object.entries(languageStats).forEach(([lang, bytes]) => {
        const percentage = totalBytes > 0 ? (bytes / totalBytes * 100) : 0;
        if (percentage > 0.5) { // Mostrar linguagens com mais de 0.5%
            allSkills[lang] = {
                percentage: Math.round(percentage),
                type: 'Linguagem',
                bytes: bytes,
                description: getSkillDescription(lang)
            };
        }
    });
    
    // Processar tecnologias
    const maxTechScore = Math.max(...Object.values(technologyStats), 1);
    Object.entries(technologyStats).forEach(([tech, score]) => {
        const percentage = Math.min(Math.round((score / maxTechScore) * 85), 95); // Max 95%
        allSkills[tech] = {
            percentage: Math.max(percentage, 15), // Min 15%
            type: 'Tecnologia',
            score: score,
            description: getSkillDescription(tech)
        };
    });
    
    // Gerar HTML
    let skillsHTML = '';
    const sortedSkills = Object.entries(allSkills).sort((a, b) => b[1].percentage - a[1].percentage);
    
    sortedSkills.forEach(([name, data]) => {
        const skillColor = getSkillColor(name);
        const skillIcon = getSkillIcon(name);
        
        skillsHTML += `
            <div class="skill-card" data-skill="${name}">
                <div class="skill-header">
                    <span class="skill-icon" style="background: rgba(${hexToRgb(skillColor)}, 0.15); border: 2px solid rgba(${hexToRgb(skillColor)}, 0.4);">
                        <i class="${skillIcon}" style="color: ${skillColor};"></i>
                    </span>
                    <h3>${name}</h3>
                </div>
                
                <div class="skill-level">
                    <span class="skill-level-label">Proficiência</span>
                    <div class="skill-stars">
                        ${getSkillStars(data.percentage)}
                    </div>
                </div>
                
                <div class="skill-bar">
                    <div class="skill-progress" style="width: ${data.percentage}%; background: linear-gradient(135deg, ${skillColor}CC, ${skillColor});"></div>
                </div>
                
                <div class="skill-percentage" style="color: ${skillColor};">
                    ${data.percentage}%
                </div>
                
                <div class="skill-description">
                    <p>${data.description}</p>
                </div>
                
                <div class="skill-details">
                    ${data.bytes ? 
                        `<span class="skill-bytes">
                            <i class="fas fa-code"></i> 
                            ${formatBytes(data.bytes)}
                        </span>` : 
                        `<span class="skill-bytes">
                            <i class="fas fa-chart-line"></i> 
                            Score: ${data.score || 'N/A'}
                        </span>`
                    }
                    <span class="skill-type" style="border-color: ${skillColor}; color: ${skillColor};">
                        ${data.type}
                    </span>
                </div>
            </div>
        `;
    });
    
    // Adicionar indicador se dados vêm do cache
    if (fromCache) {
        skillsHTML = `
            <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 1rem; padding: 1rem; background: rgba(200, 170, 110, 0.1); border-radius: 8px; border-left: 4px solid #c8aa6e;">
                <p style="color: #c8aa6e; margin: 0; font-style: italic;">
                    <i class="fas fa-clock" style="margin-right: 0.5rem;"></i>
                    <strong>Dados do Cache:</strong> Informações obtidas do cache local. Clique em "Atualizar Skills" para buscar dados mais recentes.
                </p>
            </div>
        ` + skillsHTML;
    }
    
    skillsGrid.innerHTML = skillsHTML;
    
    // Adicionar animação de entrada
    setTimeout(() => {
        const cards = skillsGrid.querySelectorAll('.skill-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            }, index * 100);
        });
    }, 100);
    
    console.log('✅ Skills cards gerados com sucesso!', { 
        totalSkills: Object.keys(allSkills).length,
        fromCache 
    });
}

// Função para criar cartões de habilidades (alternativa para a função generateSkillsCards)
function createSkillCards(languageStats, technologyStats, totalBytes, fromCache = false) {
    // Usar a função principal se disponível
    if (typeof generateSkillsCards === 'function') {
        return generateSkillsCards(languageStats, technologyStats, totalBytes, fromCache);
    }
    
    console.warn('⚠️ Função generateSkillsCards não encontrada, usando implementação de fallback');
    // Fallback para implementação simples se a principal não existir
    const skillsGrid = document.querySelector('.skills-grid');
    if (!skillsGrid) return;
    
    const loadingElement = document.getElementById('skills-loading');
    if (loadingElement) loadingElement.remove();
    
    let simpleHTML = '<div style="text-align: center; color: var(--text-secondary);">Skills carregadas com implementação básica</div>';
    skillsGrid.innerHTML = simpleHTML;
}

function getSkillDescription(skill) {
    const descriptions = {
        'JavaScript': 'Linguagem principal para desenvolvimento web dinâmico e interativo.',
        'HTML': 'Estruturação e marcação de páginas web modernas.',
        'CSS': 'Estilização e design responsivo de interfaces web.',
        'Python': 'Linguagem versátil para automação, scripts e desenvolvimento backend.',
        'Java': 'Desenvolvimento de aplicações enterprise e sistemas robustos.',
        'React': 'Biblioteca para criação de interfaces de usuário reativas e componentes.',
        'Node.js': 'Runtime JavaScript para desenvolvimento de servidores e APIs.',
        'Firebase': 'Plataforma de desenvolvimento de aplicações com backend como serviço.',
        'Git': 'Sistema de controle de versão distribuído para colaboração em código.',
        'Bootstrap': 'Framework CSS para desenvolvimento rápido e responsivo.',
        'Express.js': 'Framework web minimalista para Node.js.',
        'API REST': 'Arquitetura para criação de serviços web escaláveis.',
        'Vue.js': 'Framework progressivo para construção de interfaces de usuário.',
        'Angular': 'Plataforma completa para desenvolvimento de aplicações web.',
        'MongoDB': 'Banco de dados NoSQL orientado a documentos.',
        'MySQL': 'Sistema de gerenciamento de banco de dados relacional.',
        'PHP': 'Linguagem para desenvolvimento web server-side.',
        'TypeScript': 'Superset do JavaScript com tipagem estática.',
        'Sass': 'Extensão CSS com recursos avançados de pré-processamento.',
        'Webpack': 'Bundler de módulos para aplicações JavaScript modernas.',
        'Docker': 'Plataforma de containerização para deployment de aplicações.',
        'Kubernetes': 'Orquestração de containers em escala empresarial.',
        'AWS': 'Plataforma de computação em nuvem da Amazon.',
        'Azure': 'Serviços de nuvem da Microsoft para desenvolvimento e deployment.',
        'VS Code': 'Editor de código-fonte otimizado para desenvolvimento web moderno.',
        'GitHub': 'Plataforma de hospedagem e colaboração de código-fonte.',
        'NPM': 'Gerenciador de pacotes para o ecossistema Node.js.',
        'Yarn': 'Gerenciador de dependências rápido e confiável.',
        'ESLint': 'Ferramenta de linting para identificação de problemas no código.',
        'Prettier': 'Formatador de código para manter consistência de estilo.',
        'Jest': 'Framework de testes para JavaScript com foco em simplicidade.',
        'Cypress': 'Framework de testes end-to-end para aplicações web.',
        'PostgreSQL': 'Sistema de banco de dados objeto-relacional avançado.',
        'Redis': 'Estrutura de dados em memória para cache e armazenamento.',
        'GraphQL': 'Linguagem de consulta para APIs e runtime para executar consultas.',
        'JSON': 'Formato de intercâmbio de dados leve e legível.',
        'XML': 'Linguagem de marcação extensível para estruturação de dados.',
        'Markdown': 'Linguagem de marcação leve para formatação de texto.',
        'Babel': 'Compilador JavaScript para usar recursos modernos.',
        'Webpack': 'Bundler de módulos para otimização de aplicações.',
        'Gulp': 'Toolkit para automação de tarefas de desenvolvimento.',
        'Grunt': 'Task runner JavaScript para automação de workflows.',
        'Responsive Design': 'Técnicas para criar layouts adaptativos a diferentes dispositivos.',
        'PWA': 'Progressive Web Apps para experiências app-like na web.',
        'SEO': 'Otimização para motores de busca e melhor indexação.',
        'Performance': 'Otimização de performance e velocidade de carregamento.',
        'Accessibility': 'Desenvolvimento inclusivo para todos os usuários.',
        'UI/UX': 'Design de interfaces e experiência do usuário.'
    };
    
    return descriptions[skill] || `Tecnologia utilizada no desenvolvimento de projetos modernos.`;
}

function getSkillStars(percentage) {
    const stars = 5;
    const filledStars = Math.round((percentage / 100) * stars);
    let starsHTML = '';
    
    for (let i = 1; i <= stars; i++) {
        if (i <= filledStars) {
            starsHTML += '<i class="fas fa-star filled"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    
    return starsHTML;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) :
        '200, 170, 110'; // fallback para cor dourada
}

function getSkillIcon(skill) {
    const skillMapping = {
        'JavaScript': 'fab fa-js',
        'HTML': 'fab fa-html5',
        'CSS': 'fab fa-css3-alt',
        'Python': 'fab fa-python',
        'Java': 'fab fa-java',
        'React': 'fab fa-react',
        'Node.js': 'fab fa-node-js',
        'Firebase': 'fas fa-fire',
        'Git': 'fab fa-git-alt',
        'Bootstrap': 'fab fa-bootstrap',
        'Express.js': 'fas fa-server',
        'API REST': 'fas fa-plug',
        'Vue.js': 'fab fa-vuejs',
        'Angular': 'fab fa-angular',
        'MongoDB': 'fas fa-database',
        'MySQL': 'fas fa-database',
        'PHP': 'fab fa-php',
        'TypeScript': 'fab fa-js',
        'Sass': 'fab fa-sass',
        'Webpack': 'fas fa-box',
        'Docker': 'fab fa-docker',
        'Kubernetes': 'fas fa-dharmachakra',
        'AWS': 'fab fa-aws',
        'Azure': 'fab fa-microsoft',
        'VS Code': 'fas fa-code',
        'GitHub': 'fab fa-github',
        'NPM': 'fab fa-npm',
        'Yarn': 'fas fa-yarn',
        'ESLint': 'fas fa-check-circle',
        'Prettier': 'fas fa-magic',
        'Jest': 'fas fa-vial',
        'Cypress': 'fas fa-robot',
        'PostgreSQL': 'fas fa-database',
        'Redis': 'fas fa-memory',
        'GraphQL': 'fas fa-project-diagram',
        'JSON': 'fas fa-code',
        'XML': 'fas fa-code',
        'Markdown': 'fab fa-markdown',
        'Babel': 'fas fa-language',
        'Gulp': 'fas fa-tasks',
        'Grunt': 'fas fa-cogs',
        'Responsive Design': 'fas fa-mobile-alt',
        'PWA': 'fas fa-mobile',
        'SEO': 'fas fa-search',
        'Performance': 'fas fa-tachometer-alt',
        'Accessibility': 'fas fa-universal-access',
        'UI/UX': 'fas fa-paint-brush'
    };
    
    return skillMapping[skill] || 'fas fa-code';
}

function getSkillColor(skill) {
    const skillColors = {
        'JavaScript': '#f7df1e',
        'HTML': '#e34c26',
        'CSS': '#264de4',
        'Python': '#3572a5',
        'Java': '#b07219',
        'React': '#61dafb',
        'Node.js': '#026e00',
        'Firebase': '#ffca28',
        'Git': '#f05032',
        'Bootstrap': '#7952b3',
        'Express.js': '#000000',
        'API REST': '#02569B',
        'Vue.js': '#4fc08d',
        'Angular': '#dd0031',
        'MongoDB': '#4db33d',
        'MySQL': '#00758f',
        'PHP': '#777bb4',
        'TypeScript': '#3178c6',
        'Sass': '#cc6699',
        'Webpack': '#8dd6f9',
        'Docker': '#2496ed',
        'Kubernetes': '#326ce5',
        'AWS': '#ff9900',
        'Azure': '#0078d4',
        'VS Code': '#007acc',
        'GitHub': '#181717',
        'NPM': '#cb3837',
        'Yarn': '#2c8ebb',
        'ESLint': '#4b32c3',
        'Prettier': '#f7b93e',
        'Jest': '#c21325',
        'Cypress': '#17202c',
        'PostgreSQL': '#336791',
        'Redis': '#dc382d',
        'GraphQL': '#e10098',
        'JSON': '#000000',
        'XML': '#ff6600',
        'Markdown': '#083fa1',
        'Babel': '#f9dc3e',
        'Gulp': '#cf4647',
        'Grunt': '#fba919',
        'Responsive Design': '#38a169',
        'PWA': '#5a67d8',
        'SEO': '#4299e1',
        'Performance': '#ed8936',
        'Accessibility': '#805ad5',
        'UI/UX': '#e53e3e'
    };
    
    return skillColors[skill] || '#c8aa6e';
}

// Função para atualizar o perfil com dados do GitHub
function updateGitHubProfile(profileData) {
    console.log('👤 updateGitHubProfile chamada com:', profileData);
    
    // Verificar se há um elemento para exibir o perfil do GitHub
    const profileElement = document.getElementById('github-profile');
    console.log('🔍 Elemento github-profile encontrado:', !!profileElement);
    
    if (profileElement) {
        console.log('🎯 Atualizando perfil GitHub na interface...');
        console.log('📊 Dados que serão exibidos:', {
            repos: profileData.public_repos,
            followers: profileData.followers,
            following: profileData.following,
            name: profileData.name
        });
        
        // Remover o loader primeiro
        const loader = profileElement.querySelector('.loader');
        if (loader) {
            loader.remove();
            console.log('🗑️ Loader removido do perfil GitHub');
        }
        
        // Atualizar informações do perfil
        profileElement.innerHTML = `
            <div class="github-card" style="display: flex; visibility: visible;">
                <div class="github-stats">
                    <div class="stat">
                        <span class="stat-value">${profileData.public_repos}</span>
                        <span class="stat-label">Repositórios</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${profileData.followers}</span>
                        <span class="stat-label">Seguidores</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${profileData.following}</span>
                        <span class="stat-label">Seguindo</span>
                    </div>
                </div>
                <a href="${profileData.html_url}" target="_blank" class="github-link">
                    <i class="fab fa-github"></i> Ver perfil completo
                </a>
            </div>
        `;
        console.log('✅ HTML do perfil GitHub inserido com sucesso!');
        console.log('📄 Conteúdo atual do elemento:', profileElement.innerHTML);
    } else {
        console.warn('⚠️ Elemento github-profile não encontrado no DOM');
    }
}

// Função para atualizar a lista de repositórios do GitHub
function updateGitHubRepos(repos) {
    console.log('🔥 updateGitHubRepos chamada com estilização premium:', repos);
    
    // Verificar se há um elemento para exibir os repositórios
    const reposElement = document.getElementById('github-repos');
    if (!reposElement) {
        console.warn('❌ Elemento github-repos não encontrado no DOM');
        return;
    }
    
    // Verificar se repos é um array válido
    if (!Array.isArray(repos)) {
        console.warn('❌ Dados de repositórios inválidos:', repos);
        reposElement.innerHTML = `
            <h3 style="color: var(--primary-color); text-align: center; margin-bottom: 2rem; font-family: 'Marcellus', serif; font-size: 2rem; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">Meus últimos repositórios</h3>
            <div style="text-align: center; padding: 3rem; background: linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(231, 76, 60, 0.05) 100%); border: 2px solid rgba(231, 76, 60, 0.3); border-radius: 20px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1.5rem; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);"></i>
                <p style="color: #e74c3c; margin: 0; font-size: 1.2rem; font-weight: 600;">Erro ao carregar repositórios do GitHub.</p>
                <p style="color: rgba(231, 76, 60, 0.8); margin: 1rem 0 0; font-size: 1rem;">Verifique a conexão e tente novamente mais tarde.</p>
            </div>
        `;
        return;
    }
    
    if (repos.length === 0) {
        reposElement.innerHTML = `
            <h3 style="color: var(--primary-color); text-align: center; margin-bottom: 2rem; font-family: 'Marcellus', serif; font-size: 2rem; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">Meus últimos repositórios</h3>
            <div style="text-align: center; padding: 3rem; background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%); border: 2px solid rgba(255, 193, 7, 0.3); border-radius: 20px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);">
                <i class="fas fa-info-circle" style="font-size: 3rem; color: #ffc107; margin-bottom: 1.5rem; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);"></i>
                <p style="color: #ffc107; margin: 0; font-size: 1.2rem; font-weight: 600;">Nenhum repositório público encontrado.</p>
            </div>
        `;
        return;
    }
    
    // Header premium com gradiente e tipografia melhorada
    let reposHTML = `
        <div style="text-align: center; margin-bottom: 3rem;">
            <h3 style="
                color: var(--primary-color); 
                font-family: 'Marcellus', serif; 
                font-size: 2.5rem; 
                margin-bottom: 1rem; 
                text-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
                letter-spacing: 2px;
                text-transform: uppercase;
            ">Meus Repositórios GitHub</h3>
            <p style="
                color: var(--text-secondary); 
                font-size: 1.1rem; 
                font-style: italic; 
                opacity: 0.9;
                margin-top: 0.5rem;
            ">
                <i class="fab fa-github" style="color: var(--primary-color); margin-right: 0.5rem; font-size: 1.3rem;"></i>
                Projetos desenvolvidos e hospedados no GitHub
            </p>
        </div>
        <div class="github-repos-premium-grid">
    `;
    
    // Criar card premium para cada repositório
    repos.forEach(repo => {
        console.log('🎨 Processando repositório com design premium:', repo.name);
        
        // Determinar a linguagem e cor
        const language = repo.language || 'Não especificada';
        const languageColors = {
            'JavaScript': '#f1e05a',
            'TypeScript': '#2b7489',
            'Python': '#3572a5',
            'HTML': '#e34c26',
            'CSS': '#1572b6',
            'Java': '#b07219',
            'C++': '#f34b7d',
            'C': '#555555',
            'Go': '#00add8',
            'Rust': '#dea584',
            'PHP': '#4f5d95',
            'Ruby': '#701516',
            'Swift': '#ffac45',
            'Kotlin': '#f18e33',
            'Dart': '#00b4ab'
        };
        
        const languageColor = languageColors[language] || 'var(--primary-color)';
        
        reposHTML += `
            <div class="repo-card-premium" style="
                background: linear-gradient(135deg, 
                    rgba(30, 35, 40, 0.98) 0%, 
                    rgba(25, 30, 35, 0.95) 100%);
                border: 2px solid rgba(200, 170, 110, 0.3);
                border-radius: 20px;
                padding: 2rem;
                transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(15px);
                box-shadow: 
                    0 10px 30px rgba(0, 0, 0, 0.4),
                    0 2px 10px rgba(200, 170, 110, 0.1);
                margin-bottom: 2rem;
            " 
            onmouseover="this.style.transform='translateY(-12px) translateZ(0)'; this.style.boxShadow='0 25px 50px rgba(0, 0, 0, 0.5), 0 10px 30px rgba(200, 170, 110, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(200, 170, 110, 0.8)';"
            onmouseout="this.style.transform='translateY(0) translateZ(0)'; this.style.boxShadow='0 10px 30px rgba(0, 0, 0, 0.4), 0 2px 10px rgba(200, 170, 110, 0.1)'; this.style.borderColor='rgba(200, 170, 110, 0.3)';">
                
                <!-- Barra superior decorativa -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background: linear-gradient(90deg, 
                        var(--primary-color) 0%, 
                        #d4af37 50%, 
                        var(--primary-color) 100%);
                "></div>
                
                <!-- Header do repositório -->
                <div class="repo-header-premium" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                ">
                    <h4 style="
                        color: var(--primary-color);
                        font-size: 1.4rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 1.2px;
                        margin: 0;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                        font-family: 'Marcellus', serif;
                    ">${repo.name || 'Sem nome'}</h4>
                    
                    ${language !== 'Não especificada' ? `
                        <span style="
                            background: linear-gradient(135deg, ${languageColor} 0%, ${languageColor}aa 100%);
                            color: white;
                            padding: 0.4rem 0.8rem;
                            border-radius: 20px;
                            font-size: 0.8rem;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
                            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                        ">${language}</span>
                    ` : ''}
                </div>
                
                <!-- Descrição -->
                <p style="
                    color: var(--text-secondary);
                    line-height: 1.7;
                    margin-bottom: 1.5rem;
                    font-size: 1rem;
                    opacity: 0.9;
                    min-height: 3rem;
                ">${repo.description || 'Sem descrição disponível'}</p>
                
                <!-- Estatísticas -->
                <div class="repo-stats-premium" style="
                    display: flex;
                    gap: 1rem;
                    margin: 1.5rem 0;
                    flex-wrap: wrap;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: var(--text-secondary);
                        font-size: 0.95rem;
                        font-weight: 500;
                        padding: 0.4rem 0.8rem;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 12px;
                        border: 1px solid rgba(200, 170, 110, 0.2);
                        transition: all 0.3s ease;
                    " 
                    onmouseover="this.style.background='rgba(200, 170, 110, 0.1)'; this.style.borderColor='rgba(200, 170, 110, 0.4)'; this.style.transform='scale(1.05)';"
                    onmouseout="this.style.background='rgba(0, 0, 0, 0.3)'; this.style.borderColor='rgba(200, 170, 110, 0.2)'; this.style.transform='scale(1)';">
                        <i class="fas fa-star" style="color: var(--primary-color);"></i>
                        <span>${repo.stargazers_count || 0}</span>
                    </div>
                    
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: var(--text-secondary);
                        font-size: 0.95rem;
                        font-weight: 500;
                        padding: 0.4rem 0.8rem;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 12px;
                        border: 1px solid rgba(200, 170, 110, 0.2);
                        transition: all 0.3s ease;
                    "
                    onmouseover="this.style.background='rgba(200, 170, 110, 0.1)'; this.style.borderColor='rgba(200, 170, 110, 0.4)'; this.style.transform='scale(1.05)';"
                    onmouseout="this.style.background='rgba(0, 0, 0, 0.3)'; this.style.borderColor='rgba(200, 170, 110, 0.2)'; this.style.transform='scale(1)';">
                        <i class="fas fa-code-branch" style="color: var(--primary-color);"></i>
                        <span>${repo.forks_count || 0}</span>
                    </div>
                </div>
                
                <!-- Botão de ação -->
                <div class="repo-actions-premium" style="margin-top: 2rem;">
                    <a href="${repo.html_url}" target="_blank" style="
                        background: linear-gradient(135deg, 
                            var(--primary-color) 0%, 
                            #d4af37 100%);
                        color: var(--background-primary);
                        border: none;
                        padding: 1rem 1.8rem;
                        border-radius: 12px;
                        text-decoration: none;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.2px;
                        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                        display: inline-flex;
                        align-items: center;
                        gap: 0.8rem;
                        font-size: 0.9rem;
                        box-shadow: 
                            0 6px 20px rgba(200, 170, 110, 0.3),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2);
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    "
                    onmouseover="this.style.transform='translateY(-3px) scale(1.05)'; this.style.boxShadow='0 10px 30px rgba(200, 170, 110, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.3)';"
                    onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 6px 20px rgba(200, 170, 110, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';">
                        <i class="fab fa-github" style="font-size: 1.1rem;"></i>
                        Ver no GitHub
                    </a>
                </div>
            </div>
        `;
    });
    
    reposHTML += '</div>';
    
    // Adicionar estilos CSS específicos se não existirem
    if (!document.querySelector('#github-repos-premium-styles')) {
        const style = document.createElement('style');
        style.id = 'github-repos-premium-styles';
        style.textContent = `
            .github-repos-premium-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
                gap: 2rem;
                margin-top: 2rem;
            }
            
            @media (max-width: 768px) {
                .github-repos-premium-grid {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                .repo-card-premium {
                    padding: 1.5rem !important;
                }
                
                .repo-header-premium {
                    flex-direction: column !important;
                    gap: 1rem;
                }
                
                .repo-stats-premium {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    reposElement.innerHTML = reposHTML;
    console.log('✨ Repositórios atualizados com design premium aplicado!');
}

document.addEventListener("DOMContentLoaded", function () {
    // Criar um estilo global para desativar TODAS as animações nos cards
    const style = document.createElement('style');
    style.textContent = `
        .projeto, .skill-card, 
        .projeto *, .skill-card * {
            transform: none !important;
            transition: none !important;
            animation: none !important;
            perspective: none !important;
            transform-style: flat !important;
            box-shadow: none !important;
            will-change: auto !important;
        }
        .projeto:hover, .skill-card:hover,
        .projeto:hover *, .skill-card:hover * {
            transform: none !important;
            transition: none !important;
            animation: none !important;
            perspective: none !important;
            transform-style: flat !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Remover TODAS as transformações e transições dos cards
    const cards = document.querySelectorAll('.projeto, .skill-card');
    cards.forEach(card => {
        // Aplicar estilos com !important para garantir que nada seja aplicado
        card.setAttribute('style', 'transform: none !important; transition: none !important; animation: none !important; opacity: 1 !important; perspective: none !important; box-shadow: none !important;');
        
        // Desativar quaisquer efeitos existentes
        const allElements = card.querySelectorAll('*');
        allElements.forEach(el => {
            el.setAttribute('style', el.getAttribute('style') + '; transform: none !important; transition: none !important; animation: none !important;');
        });
    });
});
// ==================== IMPORTS DO FIREBASE ====================
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    updateDoc, 
    doc,
    enableNetwork,
    disableNetwork,
    limit 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Configurar cache offline
try {
    enableNetwork(db);
} catch (err) {
    console.log('Cache offline não disponível:', err);
}

// Detectar conexão online/offline
window.addEventListener('online', () => {
    console.log('Conexão restaurada');
    enableNetwork(db);
});

window.addEventListener('offline', () => {
    console.log('Conexão perdida - modo offline');
});

// ==================== EXPORTAR FUNÇÕES PARA USO GLOBAL ====================
// Como estamos usando módulos ES6, precisamos exportar explicitamente as funções
// que são chamadas via atributos onclick no HTML
window.toggleMenu = toggleMenu;
window.toggleChat = toggleChat;
window.setUserName = setUserName;
window.sendMessage = sendMessage;
window.toggleTheme = toggleTheme;

// Função de debug para repositórios GitHub
function debugGitHubRepos() {
    console.log('=== DEBUG GITHUB REPOS ===');
    
    // Verificar se o elemento existe
    const reposElement = document.getElementById('github-repos');
    console.log('Elemento github-repos:', reposElement);
    
    if (reposElement) {
        console.log('HTML atual:', reposElement.innerHTML);
        console.log('Classes:', reposElement.className);
        console.log('Estilo display:', window.getComputedStyle(reposElement).display);
    }
    
    // Verificar cache
    const cachedRepos = getCacheItem(GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY);
    console.log('Cache de repos:', cachedRepos);
    
    // Verificar rate limit
    const rateLimit = localStorage.getItem(GITHUB_CACHE_CONFIG.RATE_LIMIT_KEY);
    console.log('Rate limit info:', rateLimit);
    
    console.log('=== FIM DEBUG ===');
}

// Função para limpar cache de skills
function clearSkillsCache() {
    console.log('🧹 Limpando cache de skills...');
    
    try {
        // Limpar cache relacionado a skills/habilidades
        localStorage.removeItem('github_skills_cache');
        localStorage.removeItem('skills_analysis_cache');
        localStorage.removeItem(GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY);
        localStorage.removeItem(GITHUB_CACHE_CONFIG.PROFILE_CACHE_KEY);
        
        console.log('✅ Cache de skills limpo com sucesso');
        
        // Mostrar notificação se a função existir
        if (typeof showNotification === 'function') {
            showNotification('Cache limpo! Recarregando página...', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        return false;
    }
}

// Expor funções de debug globalmente
window.debugGitHubRepos = debugGitHubRepos;
window.clearSkillsCache = clearSkillsCache;

// ==================== SISTEMA DE CHAT COM FIREBASE ====================

// Variáveis globais do chat
let currentUserName = '';
let currentChatId = '';
let messagesListener = null;

// Função para gerar chat_id baseado no nome e data
function generateChatId(nome) {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0].replace(/-/g, '');
    return `${nome.toLowerCase().replace(/\s+/g, '-')}-${dataFormatada}`;
}

// Função para definir o nome do usuário
async function setUserName() {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Por favor, digite seu nome!');
        return;
    }
    
    if (name.length < 2) {
        alert('O nome deve ter pelo menos 2 caracteres!');
        return;
    }
    
    currentUserName = name;
    currentChatId = generateChatId(name);
    
    // Esconder formulário de nome e mostrar chat
    document.getElementById('name-form').style.display = 'none';
    document.getElementById('chat-area').style.display = 'block';
    
    // Atualizar header do chat
    document.getElementById('chat-header').innerHTML = `🤖 Chat - ${currentUserName}`;
    
    // Carregar mensagens anteriores
    loadChatMessages();
    
    // Mostrar mensagem de boas-vindas
    addSystemMessage(`Olá ${currentUserName}! Sua mensagem será enviada para Mikael, que responderá assim que possível. Como posso ajudar você hoje?`);
}

// Função para adicionar mensagem do sistema
function addSystemMessage(message, type = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message system-message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <strong>Sistema:</strong> ${message}
        </div>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para mostrar status de conexão
function updateConnectionStatus(isOnline) {
    const statusMessage = isOnline ? 
        'Conectado - suas mensagens serão enviadas em tempo real' : 
        'Sem conexão - suas mensagens serão enviadas quando a conexão for restaurada';
    
    addSystemMessage(statusMessage, isOnline ? 'success' : 'warning');
}

// Função para carregar mensagens do chat
function loadChatMessages() {
    if (!db || !currentChatId) return;
    
    try {
        const messagesRef = collection(db, 'mensagens');
        const q = query(
            messagesRef,
            where('chat_id', '==', currentChatId),
            limit(50)
        );
        
        // Escutar mudanças em tempo real
        messagesListener = onSnapshot(q, (snapshot) => {
            const chatMessages = document.getElementById('chat-messages');
            // Limpar mensagens anteriores (exceto mensagens do sistema)
            const systemMessages = Array.from(chatMessages.querySelectorAll('.system-message'));
            chatMessages.innerHTML = '';
            systemMessages.forEach(msg => chatMessages.appendChild(msg));
            
            if (snapshot.empty) {
                // Se não houver mensagens, apenas mostramos a mensagem de boas-vindas
                console.log('Nenhuma mensagem anterior encontrada para este chat');
            } else {
                // Converter para array e ordenar por hora no JavaScript
                const messages = [];
                snapshot.forEach((doc) => {
                    messages.push({ data: doc.data(), id: doc.id });
                });
                
                // Ordenar mensagens por hora (mais antigas primeiro)
                messages.sort((a, b) => {
                    const horaA = a.data.hora;
                    const horaB = b.data.hora;
                    
                    // Converter para timestamp para comparação
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
                    
                    return timestampA - timestampB;
                });
                
                // Exibir mensagens na ordem correta
                messages.forEach((msg) => {
                    displayMessage(msg.data, msg.id);
                });
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, (error) => {
            console.error('Erro ao carregar mensagens:', error);
            addSystemMessage('Erro ao carregar mensagens anteriores. Mas você pode enviar novas mensagens normalmente.', 'error');
        });
    } catch (error) {
        console.error('Erro ao configurar listener:', error);
        addSystemMessage('Erro ao conectar com o servidor. Tente recarregar a página.', 'error');
    }
}

// Função para exibir mensagem na interface
function displayMessage(messageData, messageId) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Verificar se a mensagem já existe na interface (evitar duplicatas)
    if (document.querySelector(`[data-message-id="${messageId}"]`)) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message user-message ${messageData.respondido ? 'responded' : ''}`;
    messageDiv.dataset.messageId = messageId;
    
    // Tratar corretamente o timestamp do Firestore
    let hora;
    if (messageData.hora) {
        if (typeof messageData.hora.toDate === 'function') {
            // Caso seja um timestamp do Firestore
            hora = messageData.hora.toDate().toLocaleTimeString();
        } else if (messageData.hora instanceof Date) {
            // Caso seja um objeto Date normal
            hora = messageData.hora.toLocaleTimeString();
        } else {
            // Fallback
            hora = new Date().toLocaleTimeString();
        }
    } else {
        hora = new Date().toLocaleTimeString();
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <strong>Você:</strong> ${messageData.mensagem}
        </div>
        <div class="message-time">${hora}</div>
        ${messageData.resposta ? `
            <div class="admin-response">
                <strong>Mikael:</strong> ${messageData.resposta}
            </div>
        ` : ''}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para enviar mensagem
async function sendMessage() {
    if (!currentUserName) {
        alert('Por favor, defina seu nome primeiro!');
        return;
    }
    
    const inputField = document.getElementById('chat-input');
    const message = inputField.value.trim();
    
    if (!message) return;
    
    if (!db) {
        addSystemMessage('Sistema offline. Mensagem será salva localmente.', 'warning');
        // Salvar mensagem localmente se Firebase não estiver disponível
        saveMessageLocally(message);
        inputField.value = '';
        return;
    }
    
    try {
        // Criar objeto da mensagem
        const messageData = {
            nome: currentUserName,
            mensagem: message,
            hora: new Date(),
            chat_id: currentChatId,
            resposta: '',
            respondido: false
        };
        
        // Exibir mensagem imediatamente na interface para feedback visual
        const tempId = 'temp-' + Date.now();
        displayMessage(messageData, tempId);
        
        // Limpar input antes de salvar para feedback imediato
        inputField.value = '';
        
        // Salvar mensagem no Firestore
        await addDoc(collection(db, 'mensagens'), messageData);
        
        console.log('Mensagem enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        
        // Remover mensagem temporária em caso de erro
        const tempMsg = document.querySelector(`[data-message-id^="temp-"]`);
        if (tempMsg) tempMsg.remove();
        
        // Salvar localmente como fallback
        addSystemMessage('Erro no servidor. Mensagem salva localmente.', 'warning');
        saveMessageLocally(message);
        
        // Não restaurar no input pois a mensagem foi salva localmente
    }
}

// Função para salvar mensagem localmente
function saveMessageLocally(message) {
    try {
        const localMessages = JSON.parse(localStorage.getItem('localMessages') || '[]');
        const messageData = {
            nome: currentUserName,
            mensagem: message,
            hora: new Date().toISOString(),
            chat_id: currentChatId,
            local: true
        };
        
        localMessages.push(messageData);
        localStorage.setItem('localMessages', JSON.stringify(localMessages));
        
        // Exibir mensagem local
        displayMessage(messageData, 'local-' + Date.now());
        
    } catch (error) {
        console.error('Erro ao salvar mensagem localmente:', error);
        addSystemMessage('Erro ao salvar mensagem. Tente novamente.', 'error');
    }
}

// Função para permitir envio com Enter
document.addEventListener('DOMContentLoaded', function() {
    // Para o input do nome
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                setUserName();
            }
        });
    }
    
    // Para o input do chat
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// Limpar listener quando a página for fechada
window.addEventListener('beforeunload', function() {
    if (messagesListener) {
        messagesListener();
    }
});

// Detectar mudanças de conexão
window.addEventListener('online', function() {
    if (currentUserName) {
        updateConnectionStatus(true);
    }
});

window.addEventListener('offline', function() {
    if (currentUserName) {
        updateConnectionStatus(false);
    }
});

// ==================== FIM DO SISTEMA DE CHAT ====================

// Função para alternar a visibilidade do chat (widget circular)
function toggleChat() {
    const chatPopup = document.getElementById("chat-popup");
    if (!chatPopup) return;
    
    const isHidden = chatPopup.classList.contains("hidden");
    
    if (isHidden) {
        chatPopup.classList.remove("hidden");
        // Se não tivermos um usuário ainda, focar no campo de nome
        if (!currentUserName) {
            setTimeout(() => {
                const nameInput = document.getElementById('name-input');
                if (nameInput) nameInput.focus();
            }, 100);
        } else {
            // Já temos usuário, focar no campo de mensagem
            setTimeout(() => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }, 100);
        }
    } else {
        chatPopup.classList.add("hidden");
    }
}

// Removido efeito parallax

// Detectar dispositivo móvel para desativar efeitos pesados
function isMobile() {
    return /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    document.body.classList.add('mobile');
}

// Tema claro/escuro
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.getElementById('theme-icon');
    if (document.body.classList.contains('light-mode')) {
        themeIcon.className = 'fas fa-moon';
    } else {
        themeIcon.className = 'fas fa-sun';
    }
}

// Verificar preferência de tema salva
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

// Efeito de cards removido

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('assets/js/sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado com sucesso:', registration.scope);
            })
            .catch(error => {
                console.log('Falha ao registrar o ServiceWorker:', error);
            });
    });
}

// Código para a página de projetos interativos
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na página de projetos interativos
    if (!document.querySelector('.project-tabs')) return;

    console.log('Inicializando página de projetos interativos...');

    // Gestão das abas de projetos
    const tabBtns = document.querySelectorAll('.tab-btn');
    const projectContents = document.querySelectorAll('.project-content');

    console.log('Botões de abas encontrados:', tabBtns.length);
    console.log('Conteúdos de projetos encontrados:', projectContents.length);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            console.log('Aba clicada:', tabId);
            
            tabBtns.forEach(b => b.classList.remove('active'));
            projectContents.forEach(content => content.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log('Aba ativada:', tabId);
            } else {
                console.error('Elemento não encontrado:', `${tabId}-tab`);
            }
        });
    });

    // Inicializar cada projeto
    console.log('Inicializando projetos...');
    initCalculator();
    initSnakeGame();
    initCodeEditor();
    console.log('Projetos inicializados!');
});

// ========== CALCULADORA AVANÇADA ==========
function initCalculator() {
    // Verificar se estamos na página da calculadora
    if (!document.querySelector('.calc-result')) return;
    
    const calculator = {
        displayValue: '0',
        firstOperand: null,
        waitingForSecondOperand: false,
        operator: null,
        memory: 0,
        history: []
    };

    // Elementos da DOM
    const displayOperation = document.querySelector('.calc-operation');
    const displayResult = document.querySelector('.calc-result');
    const standardKeypad = document.querySelector('.standard-keypad');
    const scientificKeypad = document.querySelector('.scientific-keypad');
    const standardModeBtn = document.getElementById('standard-mode');
    const scientificModeBtn = document.getElementById('scientific-mode');
    const historyBtn = document.getElementById('calc-history-btn');
    const historyPanel = document.querySelector('.calc-history');
    const historyList = document.querySelector('.history-list');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Carregar histórico do localStorage
    loadHistory();

    // Configurar teclado científico
    setupScientificKeypad();

    // Event listeners para botões da calculadora
    if (standardKeypad) {
        standardKeypad.addEventListener('click', (event) => {
            if (!event.target.matches('button')) return;
            handleButtonClick(event.target);
        });
    }

    if (scientificKeypad) {
        scientificKeypad.addEventListener('click', (event) => {
            if (!event.target.matches('button')) return;
            handleButtonClick(event.target);
        });
    }

    // Event listeners para mudança de modo
    if (standardModeBtn) {
        standardModeBtn.addEventListener('click', () => {
            standardModeBtn.classList.add('active');
            scientificModeBtn.classList.remove('active');
            standardKeypad.classList.remove('hidden');
            scientificKeypad.classList.add('hidden');
        });
    }

    if (scientificModeBtn) {
        scientificModeBtn.addEventListener('click', () => {
            scientificModeBtn.classList.add('active');
            standardModeBtn.classList.remove('active');
            scientificKeypad.classList.remove('hidden');
            standardKeypad.classList.add('hidden');
        });
    }

    // Toggle histórico
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            historyPanel.classList.toggle('hidden');
        });
    }

    // Limpar histórico
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            calculator.history = [];
            saveHistory();
            renderHistory();
        });
    }

    // Suporte a teclado
    document.addEventListener('keydown', (event) => {
        if (!document.querySelector('.calculator')) return;
        
        const key = event.key;
        
        if (/[0-9]/.test(key)) {
            inputDigit(parseInt(key, 10));
            updateDisplay();
        } else if (key === '.') {
            inputDecimal();
            updateDisplay();
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            handleOperator(key);
            updateDisplay();
        } else if (key === 'Enter' || key === '=') {
            handleEquals();
            updateDisplay();
        } else if (key === 'Backspace') {
            handleBackspace();
            updateDisplay();
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
            resetCalculator();
            updateDisplay();
        }
    });

    // Funções da calculadora
    function handleButtonClick(button) {
        if (button.classList.contains('number')) {
            inputDigit(parseInt(button.textContent, 10));
            updateDisplay();
        } else if (button.classList.contains('decimal')) {
            inputDecimal();
            updateDisplay();
        } else if (button.classList.contains('operator')) {
            handleOperator(button.textContent);
            updateDisplay();
        } else if (button.classList.contains('equals')) {
            handleEquals();
            updateDisplay();
        } else if (button.classList.contains('clear')) {
            resetCalculator();
            updateDisplay();
        } else if (button.classList.contains('backspace')) {
            handleBackspace();
            updateDisplay();
        } else if (button.classList.contains('percent')) {
            handlePercent();
            updateDisplay();
        } else if (button.classList.contains('scientific')) {
            handleScientificOperation(button.getAttribute('data-operation'));
            updateDisplay();
        }
    }

    function inputDigit(digit) {
        const { displayValue, waitingForSecondOperand } = calculator;
        
        if (waitingForSecondOperand) {
            calculator.displayValue = String(digit);
            calculator.waitingForSecondOperand = false;
        } else {
            calculator.displayValue = displayValue === '0' ? String(digit) : displayValue + digit;
        }
    }

    function inputDecimal() {
        if (calculator.waitingForSecondOperand) {
            calculator.displayValue = '0.';
            calculator.waitingForSecondOperand = false;
            return;
        }
        
        if (!calculator.displayValue.includes('.')) {
            calculator.displayValue += '.';
        }
    }

    function handleOperator(nextOperator) {
        const { firstOperand, displayValue, operator } = calculator;
        const inputValue = parseFloat(displayValue);
        
        if (operator && calculator.waitingForSecondOperand) {
            calculator.operator = nextOperator;
            return;
        }
        
        if (firstOperand === null && !isNaN(inputValue)) {
            calculator.firstOperand = inputValue;
        } else if (operator) {
            const result = calculate(firstOperand, inputValue, operator);
            calculator.displayValue = `${parseFloat(result.toFixed(7))}`;
            calculator.firstOperand = result;
            
            // Adicionar ao histórico
            addToHistory(`${firstOperand} ${operator} ${inputValue}`, result);
        }
        
        calculator.waitingForSecondOperand = true;
        calculator.operator = nextOperator;
        
        displayOperation.textContent = `${calculator.firstOperand} ${calculator.operator}`;
    }

    function handleEquals() {
        const { firstOperand, displayValue, operator } = calculator;
        const inputValue = parseFloat(displayValue);
        
        if (operator && !calculator.waitingForSecondOperand) {
            const result = calculate(firstOperand, inputValue, operator);
            calculator.displayValue = `${parseFloat(result.toFixed(7))}`;
            calculator.firstOperand = result;
            
            // Adicionar ao histórico
            addToHistory(`${firstOperand} ${operator} ${inputValue}`, result);
            
            displayOperation.textContent = `${firstOperand} ${operator} ${inputValue} =`;
            calculator.operator = null;
        }
    }

    function handlePercent() {
        const { displayValue } = calculator;
        const percentValue = parseFloat(displayValue) / 100;
        calculator.displayValue = String(percentValue);
    }

    function handleBackspace() {
               if (calculator.displayValue.length > 1) {
            calculator.displayValue = calculator.displayValue.slice(0, -1);
        } else {
            calculator.displayValue = '0';
        }
    }

    function resetCalculator() {
        calculator.displayValue = '0';
        calculator.firstOperand = null;
        calculator.waitingForSecondOperand = false;
        calculator.operator = null;
        displayOperation.textContent = '';
    }

    function calculate(firstOperand, secondOperand, operator) {
        if (operator === '+') {
            return firstOperand + secondOperand;
        } else if (operator === '-') {
            return firstOperand - secondOperand;
        } else if (operator === '*') {
            return firstOperand * secondOperand;
        } else if (operator === '/') {
            return firstOperand / secondOperand;
        }
        
        return secondOperand;
    }

    function handleScientificOperation(operation) {
        const { displayValue } = calculator;
        const inputValue = parseFloat(displayValue);
        let result;
        
        switch (operation) {
            case 'sqrt':
                result = Math.sqrt(inputValue);
                break;
            case 'square':
                result = Math.pow(inputValue, 2);
                break;
            case 'sin':
                result = Math.sin(inputValue * Math.PI / 180); // Degrees
                break;
            case 'cos':
                result = Math.cos(inputValue * Math.PI / 180); // Degrees
                break;
            case 'tan':
                result = Math.tan(inputValue * Math.PI / 180); // Degrees
                break;
            case 'log':
                result = Math.log10(inputValue);
                break;
            case 'ln':
                result = Math.log(inputValue);
                break;
            case 'pi':
                result = Math.PI;
                break;
            default:
                return;
        }
        
        calculator.displayValue = `${parseFloat(result.toFixed(7))}`;
        calculator.firstOperand = result;
        calculator.waitingForSecondOperand = true;
        
        // Adicionar ao histórico
        addToHistory(`${operation}(${inputValue})`, result);
    }

    function updateDisplay() {
        if (displayResult) {
            displayResult.textContent = calculator.displayValue;
        }
    }

    function setupScientificKeypad() {
        if (!scientificKeypad) return;
        
        const scientificButtons = [
            { label: 'sin', op: 'sin' },
            { label: 'cos', op: 'cos' },
            { label: 'tan', op: 'tan' },
            { label: 'π', op: 'pi' },
            { label: '√', op: 'sqrt' },
            { label: 'x²', op: 'square' },
            { label: 'log', op: 'log' },
            { label: 'ln', op: 'ln' }
        ];
        
        scientificButtons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.className = 'calc-key scientific';
            button.setAttribute('data-operation', btn.op);
            scientificKeypad.appendChild(button);
        });
        
        // Adicionar os botões padrão ao keypad científico
        const standardButtons = standardKeypad.querySelectorAll('button');
        standardButtons.forEach(btn => {
            const clone = btn.cloneNode(true);
            scientificKeypad.appendChild(clone);
        });
    }

    function addToHistory(expression, result) {
        calculator.history.push({ expression, result });
        saveHistory();
        renderHistory();
    }

    function saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(calculator.history));
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem('calculatorHistory');
        if (savedHistory) {
            calculator.history = JSON.parse(savedHistory);
            renderHistory();
        }
    }

    function renderHistory() {
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        calculator.history.slice().reverse().forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const expression = document.createElement('div');
            expression.className = 'history-expression';
            expression.textContent = item.expression;
            
            const result = document.createElement('div');
            result.className = 'history-result';
            result.textContent = item.result;
            
            historyItem.appendChild(expression);
            historyItem.appendChild(result);
            historyList.appendChild(historyItem);
        });
    }

    // Inicializar display
    updateDisplay();
}

// ========== JOGO SNAKE ==========
function initSnakeGame() {
    // Verificar se estamos na página do jogo
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start-game');
    const pauseBtn = document.getElementById('pause-game');
    const restartBtn = document.getElementById('restart-game');
    const currentScoreElement = document.getElementById('current-score');
    const highScoreElement = document.getElementById('high-score');
    const finalScoreElement = document.querySelector('.final-score');
    const gameMessage = document.querySelector('.game-message');
    const difficultySlider = document.getElementById('difficulty');
    
    // Carregar high score do localStorage
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    highScoreElement.textContent = highScore;
    
    // Variáveis do jogo
    const gridSize = 20;
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;
    
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let speed = 150; // ms
    let gameInterval = null;
    let isPaused = false;
    let obstacles = [];
    
    // Inicializar jogo
    function initGame() {
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        
        score = 0;
        currentScoreElement.textContent = score;
        
        direction = 'right';
        nextDirection = 'right';
        
        generateFood();
        setDifficulty();
        
        // Gerar obstáculos apenas em dificuldades médio e difícil
        obstacles = [];
        if (difficultySlider.value > 1) {
            generateObstacles();
        }
        
        draw();
    }
    
    function setDifficulty() {
        const difficulty = difficultySlider.value;
        switch(parseInt(difficulty)) {
            case 1: // Fácil
                speed = 180;
                break;
            case 2: // Médio
                speed = 130;
                break;
                       case 3: // Difícil
                speed = 80;
                break;
        }
    }
    
    function startGame() {
        if (gameInterval) return;
        
        initGame();
        gameInterval = setInterval(gameLoop, speed);
        
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        gameMessage.classList.add('hidden');
    }
    
    function pauseGame() {
        if (!gameInterval) return;
        
        if (isPaused) {
            gameInterval = setInterval(gameLoop, speed);
            pauseBtn.textContent = 'Pausar';
        } else {
            clearInterval(gameInterval);
            gameInterval = null;
            pauseBtn.textContent = 'Continuar';
        }
        
        isPaused = !isPaused;
    }
    
    function gameOver() {
        clearInterval(gameInterval);
        gameInterval = null;
        
        // Atualizar high score se necessário
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }
        
        // Mostrar mensagem de game over
        finalScoreElement.textContent = score;
        gameMessage.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
    }
    
    function gameLoop() {
        moveSnake();
        
        if (checkCollision()) {
            gameOver();
            return;
        }
        
        if (eatFood()) {
            generateFood();
            score += 10;
            currentScoreElement.textContent = score;
            
            // Adicionar obstáculo a cada 5 comidas em dificuldade difícil
            if (difficultySlider.value == 3 && score % 50 === 0) {
                generateObstacles(1);
            }
        } else {
            // Remover a cauda apenas se não comeu
            snake.pop();
        }
        
        draw();
    }
    
    function moveSnake() {
        // Atualizar direção
        direction = nextDirection;
        
        // Calcular nova posição da cabeça
        const head = { ...snake[0] };
        
        switch (direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }
        
        // Teletransportar se atingir borda
        if (head.x < 0) head.x = gridWidth - 1;
        if (head.x >= gridWidth) head.x = 0;
        if (head.y < 0) head.y = gridHeight - 1;
        if (head.y >= gridHeight) head.y = 0;
        
        // Adicionar nova cabeça à frente
        snake.unshift(head);
    }
    
    function checkCollision() {
        const head = snake[0];
        
        // Verificar colisão com o corpo
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        
        // Verificar colisão com obstáculos
        for (let obs of obstacles) {
            if (head.x === obs.x && head.y === obs.y) {
                return true;
            }
        }
        
        return false;
    }
    
    function eatFood() {
        const head = snake[0];
        
        if (head.x === food.x && head.y === food.y) {
            return true;
        }
        
        return false;
    }
    
    function generateFood() {
        // Criar comida em posição aleatória que não colida com cobra ou obstáculos
        let validPosition = false;
        let newFood;
        
        while (!validPosition) {
            newFood = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };
            
            validPosition = true;
            
            // Verificar se colide com a cobra
            for (let segment of snake) {
                if (newFood.x === segment.x && newFood.y === segment.y) {
                    validPosition = false;
                }
            }
            
            // Verificar se colide com obstáculos
            for (let obs of obstacles) {
                if (newFood.x === obs.x && newFood.y === obs.y) {
                    validPosition = false;
                }
            }
        }
        
        food = newFood;
    }
    
    function generateObstacles(count = 3) {
        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let newObstacle;
            
            while (!validPosition) {
                newObstacle = {
                    x: Math.floor(Math.random() * gridWidth),
                    y: Math.floor(Math.random() * gridHeight)
                };
                
                validPosition = true;
                
                // Verificar se colide com a cobra
                for (let segment of snake) {
                    if (newObstacle.x === segment.x && newObstacle.y === segment.y) {
                        validPosition = false;
                    }
                }
                
                // Verificar se colide com comida
                if (newObstacle.x === food.x && newObstacle.y === food.y) {
                    validPosition = false;
                }
                
                // Verificar se colide com outros obstáculos
                for (let obs of obstacles) {
                    if (newObstacle.x === obs.x && newObstacle.y === obs.y) {
                        validPosition = false;
                    }
                }
            }
            
            obstacles.push(newObstacle);
        }
    }
    
    function draw() {
        // Limpar canvas
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-primary');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar cobra
        for (let i = 0; i < snake.length; i++) {
            if (i === 0) {
                // Cabeça
                ctx.fillStyle = '#4CAF50';
            } else {
                // Corpo
                ctx.fillStyle = '#8BC34A';
            }
            
            ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
        }
        
        // Desenhar comida
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
        
        // Desenhar obstáculos
        ctx.fillStyle = '#607D8B';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x * gridSize, obs.y * gridSize, gridSize - 2, gridSize - 2);
        });
    }
    
    // Event listeners e controles
    document.addEventListener('keydown', (event) => {
        if (!document.querySelector('.game-container')) return;
        
        const key = event.key.toLowerCase();
        const arrowControls = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
        const wasdControls = { w: 'up', s: 'down', a: 'left', d: 'right' };
        
        // Verificar controles selecionados
        const useWasd = document.getElementById('wasd').checked;
        const controls = useWasd ? wasdControls : arrowControls;
        
        // Definir direção com base no controle atual
        const newDirection = controls[key];
        
        if (!newDirection) return;
        
        // Evitar direção oposta
        if (
            (direction === 'up' && newDirection === 'down') ||
            (direction === 'down' && newDirection === 'up') ||
            (direction === 'left' && newDirection === 'right') ||
            (direction === 'right' && newDirection === 'left')
        ) {
            return;
        }
        
        nextDirection = newDirection;
    });
    
    // Botões de controle
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseGame);
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }
    
    // Desenhar o canvas inicial
    draw();
}

// ========== EDITOR DE CÓDIGO ==========
function initCodeEditor() {
    // Verificar se estamos na página do editor
    const codeInput = document.getElementById('code-input');
    if (!codeInput) return;
    
    const highlightedCode = document.getElementById('highlighted-code');
    const consoleOutput = document.getElementById('console-output');
    const runCodeBtn = document.getElementById('run-code');
    const saveSnippetBtn = document.getElementById('save-snippet');
    const clearEditorBtn = document.getElementById('clear-editor');
    const clearConsoleBtn = document.getElementById('clear-console');
    const savedSnippetsSelect = document.getElementById('saved-snippets');
    
    // Variáveis
    let snippets = [];
    
    // Carregar snippets salvos
    loadSnippets();
    
    // Event listeners
    codeInput.addEventListener('input', updateHighlightedCode);
    codeInput.addEventListener('scroll', syncScroll);
    codeInput.addEventListener('keydown', handleTabKey);
    
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', runCode);
    }
    
    if (saveSnippetBtn) {
        saveSnippetBtn.addEventListener('click', saveSnippet);
    }
    
    if (clearEditorBtn) {
        clearEditorBtn.addEventListener('click', () => {
            codeInput.value = '';
            updateHighlightedCode();
        });
    }
    
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
    
    if (savedSnippetsSelect) {
        savedSnippetsSelect.addEventListener('change', loadSelectedSnippet);
    }
    
    // Suporte para atalhos de teclado
    document.addEventListener('keydown', (event) => {
        if (!document.querySelector('.code-editor-container')) return;
        
        // Ctrl+Enter para executar código
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            runCode();
        }
        
        // Ctrl+S para salvar snippet
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveSnippet();
        }
    });
    
    // Funções
   
    function updateHighlightedCode() {
        const code = codeInput.value;
        highlightedCode.innerHTML = code;
        hljs.highlightElement(highlightedCode);
    }
    
    function syncScroll() {
        highlightedCode.scrollTop = codeInput.scrollTop;
        highlightedCode.scrollLeft = codeInput.scrollLeft;
    }
    
    function handleTabKey(event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            
            const start = codeInput.selectionStart;
            const end = codeInput.selectionEnd;
            
            // Inserir 4 espaços no cursor atual
            codeInput.value = codeInput.value.substring(0, start) + '    ' + codeInput.value.substring(end);
            
            // Mover cursor para depois da tabulação
            codeInput.selectionStart = codeInput.selectionEnd = start + 4;
            
            updateHighlightedCode();
        }
    }
    
    function runCode() {
        const code = codeInput.value;
        
        clearConsole();
        
        try {
            // Substituir console.log para capturar saídas
            const originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn
            };
            
            console.log = function() {
                const output = Array.from(arguments).join(' ');
                appendToConsole(output, 'log');
                originalConsole.log.apply(console, arguments);
            };
            
            console.error = function() {
                const output = Array.from(arguments).join(' ');
                appendToConsole(output, 'error');
                originalConsole.error.apply(console, arguments);
            };
            
            console.warn = function() {
                const output = Array.from(arguments).join(' ');
                appendToConsole(output, 'warn');
                originalConsole.warn.apply(console, arguments);
            };
            
            // Executar código em uma função para criar escopo
            const result = new Function(code)();
            
            // Se o código retornar algum valor, mostrar no console
            if (result !== undefined) {
                appendToConsole(result, 'log');
            }
            
            // Restaurar console original
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
        } catch (error) {
            appendToConsole(error.message, 'error');
        }
    }
    
    function appendToConsole(content, type = 'log') {
        const line = document.createElement('div');
        line.className = `console-${type}`;
        
        if (typeof content === 'object') {
            try {
                content = JSON.stringify(content, null, 2);
            } catch (e) {
                content = content.toString();
            }
        }
        
        line.textContent = content;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    function clearConsole() {
        consoleOutput.innerHTML = '';
    }
    
    function saveSnippet() {
        const code = codeInput.value.trim();
        if (!code) return;
        
        const snippetName = prompt('Digite um nome para o snippet:');
        if (!snippetName) return;
        
        // Verificar se já existe um snippet com este nome
        const existingIndex = snippets.findIndex(s => s.name === snippetName);
        
        if (existingIndex !== -1) {
            const override = confirm(`Já existe um snippet chamado "${snippetName}". Deseja sobrescrever?`);
            
            if (override) {
                snippets[existingIndex].code = code;
            } else {
                return;
            }
        } else {
            snippets.push({ name: snippetName, code });
            addSnippetToList(snippetName);
        }
        
        localStorage.setItem('codeSnippets', JSON.stringify(snippets));
        alert(`Snippet "${snippetName}" salvo com sucesso!`);
    }
    
    function loadSnippets() {
        const savedSnippets = localStorage.getItem('codeSnippets');
        
        if (savedSnippets) {
            snippets = JSON.parse(savedSnippets);
            
            // Adicionar snippets ao select
            snippets.forEach(snippet => {
                addSnippetToList(snippet.name);
            });
        }
    }
    
    function addSnippetToList(name) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        savedSnippetsSelect.appendChild(option);
    }
    
    function loadSelectedSnippet() {
        const selectedName = savedSnippetsSelect.value;
        
        if (!selectedName) return;
        
        const snippet = snippets.find(s => s.name === selectedName);
        
        if (snippet) {
            codeInput.value = snippet.code;
            updateHighlightedCode();
        }
        
        savedSnippetsSelect.selectedIndex = 0;
    }
    
    // Inicializar o editor com o conteúdo atual
    updateHighlightedCode();
}

// ==================== SISTEMA DE ANÁLISE DE SKILLS AUTOMÁTICO ====================

// Função para verificar status do sistema GitHub
window.checkGitHubSystemStatus = function() {
    const status = {
        cache: {},
        rateLimit: {},
        system: 'OK'
    };
    
    // Verificar cache de perfil usando sistema centralizado
    const profileCached = gitHubAPI.cache.get(`/users/${GITHUB_USERNAME}`);
    status.cache.profile = {
        exists: !!profileCached,
        key: GITHUB_CACHE_CONFIG.PROFILE_CACHE_KEY,
        lastUpdate: profileCached ? 'Disponível' : 'Não encontrado'
    };
    
    // Verificar cache de repositórios usando sistema centralizado
    const reposCached = gitHubAPI.cache.get(`/users/${GITHUB_USERNAME}/repos`);
    status.cache.repos = {
        exists: !!reposCached,
        key: GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY,
        lastUpdate: reposCached ? 'Disponível' : 'Não encontrado'
    };
    
    // Verificar rate limit
    const rateLimit = checkRateLimit();
    status.rateLimit = {
        canMakeRequest: rateLimit.canMakeRequest,
        requestsLeft: rateLimit.requestsLeft,
        maxRequests: GITHUB_CACHE_CONFIG.MAX_REQUESTS_PER_HOUR,
        resetTime: rateLimit.resetTime ? new Date(rateLimit.resetTime).toLocaleTimeString() : 'N/A'
    };
    
    console.table(status.cache);
    console.table(status.rateLimit);
    console.log('📊 GitHub System Status (script.js):', status);
    return status;
};

// Função para limpar cache do GitHub
window.clearGitHubCache = function() {
    console.log('🧹 Limpando cache do GitHub (script.js)...');
    
    // Limpar caches específicos
    localStorage.removeItem(GITHUB_CACHE_CONFIG.PROFILE_CACHE_KEY);
    localStorage.removeItem(GITHUB_CACHE_CONFIG.REPOS_CACHE_KEY);
    localStorage.removeItem(GITHUB_CACHE_CONFIG.RATE_LIMIT_KEY);
    
    // Limpar caches antigos
    const keys = Object.keys(localStorage);
    const oldGithubKeys = keys.filter(key => 
        key.includes('github_') && 
        !key.includes('_v2') &&
        !Object.values(GITHUB_CACHE_CONFIG).includes(key)
    );
    
    oldGithubKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removido cache antigo: ${key}`);
    });
    
    console.log('✅ Cache do GitHub limpo com sucesso!');
    
    // Mostrar notificação se a função estiver disponível
    if (typeof showNotification === 'function') {
        showNotification('Cache do GitHub limpo com sucesso!', 'success');
    }
};

// ==================== FUNCIONALIDADES DO HEADER RENOVADO ====================

// Inicializar funcionalidades do novo header
function initHeroHeader() {
    // Scroll suave para o indicador
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const firstSection = document.querySelector('#featured-reports, section');
            if (firstSection) {
                firstSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    // Animação de entrada do hero content
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 1s ease-out';
                }
            });
        }, {
            threshold: 0.1
        });
        
        observer.observe(heroContent);
    }

    // Efeito parallax sutil no background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroBackground = document.querySelector('.hero-background');
        
        if (heroBackground && scrolled < window.innerHeight) {
            const speed = scrolled * 0.5;
            heroBackground.style.transform = `translateY(${speed}px)`;
        }
    });

    // Adicionar animação CSS se não existir
    if (!document.querySelector('#hero-animations')) {
        const style = document.createElement('style');
        style.id = 'hero-animations';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Animação de carregamento da foto de perfil
function initProfileImageAnimation() {
    const profileImage = document.querySelector('.profile-image');
    if (profileImage) {
        profileImage.addEventListener('load', () => {
            profileImage.style.animation = 'fadeIn 0.8s ease-out';
        });
        
        // Se a imagem já estiver carregada
        if (profileImage.complete) {
            profileImage.style.animation = 'fadeIn 0.8s ease-out';
        }
    }
}

// Efeitos de hover melhorados para os botões de ação
function initActionButtonEffects() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(btn => {
        // Efeito ripple
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                z-index: 1;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Adicionar animação ripple se não existir
    if (!document.querySelector('#ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Gerenciamento de tema no header
function updateHeaderTheme() {
    const heroHeader = document.querySelector('.hero-header');
    const body = document.body;
    
    if (heroHeader) {
        if (body.classList.contains('light-mode')) {
            heroHeader.style.background = `linear-gradient(135deg, 
                #ffffff 0%, 
                #f8f9fa 25%,
                #e9ecef 50%,
                #f8f9fa 75%,
                #ffffff 100%
            )`;
        } else {
            // Voltar ao tema padrão
            heroHeader.style.background = '';
        }
    }
}

// Inicializar todas as funcionalidades do header renovado
function initNewHeaderFeatures() {
    try {
        initHeroHeader();
        initProfileImageAnimation();
        initActionButtonEffects();
        
        // Atualizar tema quando necessário
        const themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(updateHeaderTheme, 100);
            });
        }
        
        // Aplicar tema atual
        updateHeaderTheme();
        
        console.log('✅ Header renovado inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar header renovado:', error);
    }
}

// Adicionar ao sistema de inicialização
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    initNewHeaderFeatures();
});

// ==================== FIM DAS FUNCIONALIDADES DO HEADER RENOVADO ====================
