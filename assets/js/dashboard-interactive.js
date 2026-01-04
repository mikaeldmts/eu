// ===== DASHBOARD INTERATIVO - FUNCIONALIDADES AVANÇADAS =====

// Inicialização do Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

function initDashboard() {
    console.log('🚀 Inicializando Dashboard Ultra Moderno...');
    
    // Inicializar componentes
    initSearchSystem();
    initTabSystem();
    initCardInteractions();
    initAnimations();
    initMetrics();
    initRecentContent(); // Nova função
    initGitHubSection();  // Nova função
    
    console.log('✅ Dashboard inicializado com sucesso!');
}

// ===== SISTEMA DE BUSCA GLOBAL =====
function initSearchSystem() {
    const searchInput = document.getElementById('global-search');
    const searchFilters = document.querySelectorAll('.search-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleGlobalSearch, 300));
    }
    
    searchFilters.forEach(filter => {
        filter.addEventListener('click', handleFilterChange);
    });
}

function handleGlobalSearch(event) {
    const query = event.target.value.toLowerCase();
    const activeFilter = document.querySelector('.search-filter.active').dataset.filter;
    
    console.log(`🔍 Buscando: "${query}" | Filtro: ${activeFilter}`);
    
    // Filtrar cards baseado na busca
    filterDashboardCards(query, activeFilter);
    
    // Animação de feedback
    showSearchFeedback(query);
}

function handleFilterChange(event) {
    const filters = document.querySelectorAll('.search-filter');
    filters.forEach(f => f.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const filter = event.currentTarget.dataset.filter;
    const searchQuery = document.getElementById('global-search').value.toLowerCase();
    
    filterDashboardCards(searchQuery, filter);
    
    // Animação do filtro
    animateFilterChange(event.currentTarget);
}

function filterDashboardCards(query, filter) {
    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach(card => {
        const category = card.dataset.category || 'all';
        const cardText = card.textContent.toLowerCase();
        
        const matchesQuery = !query || cardText.includes(query);
        const matchesFilter = filter === 'all' || category === filter;
        
        if (matchesQuery && matchesFilter) {
            showCard(card);
        } else {
            hideCard(card);
        }
    });
}

function showCard(card) {
    card.style.display = 'flex';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        card.style.transition = 'all 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 50);
}

function hideCard(card) {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        card.style.display = 'none';
    }, 300);
}

function showSearchFeedback(query) {
    const searchWrapper = document.querySelector('.search-input-wrapper');
    searchWrapper.style.transform = 'scale(1.02)';
    
    setTimeout(() => {
        searchWrapper.style.transform = 'scale(1)';
    }, 200);
}

function animateFilterChange(filterElement) {
    filterElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        filterElement.style.transform = 'scale(1)';
    }, 200);
}

// ===== SISTEMA DE TABS =====
function initTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });
}

function handleTabChange(event) {
    const tabBtn = event.currentTarget;
    const card = tabBtn.closest('.dashboard-card');
    const tabName = tabBtn.dataset.tab;
    
    // Remover active de todos os tabs e conteúdos
    const allTabs = card.querySelectorAll('.tab-btn');
    const allContents = card.querySelectorAll('.tab-content');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allContents.forEach(content => content.classList.remove('active'));
    
    // Ativar tab e conteúdo selecionados
    tabBtn.classList.add('active');
    const targetContent = card.querySelector(`[data-tab="${tabName}"]`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Animação do tab
    animateTabChange(tabBtn);
    
    // Carregar conteúdo específico se necessário
    loadTabContent(tabName, card);
}

function animateTabChange(tabBtn) {
    tabBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        tabBtn.style.transform = 'scale(1)';
    }, 100);
}

function loadTabContent(tabName, card) {
    console.log(`📑 Carregando conteúdo da tab: ${tabName}`);
    
    switch(tabName) {
        case 'analytics':
            loadAnalyticsData(card);
            break;
        case 'popular':
            loadPopularMedia(card);
            break;
        case 'gallery':
            loadGalleryPreview(card);
            break;
    }
}

// ===== INTERAÇÕES DOS CARDS =====
function initCardInteractions() {
    const expandableCards = document.querySelectorAll('.expandable-card');
    const interactiveCards = document.querySelectorAll('.interactive-card');
    
    // Cards expansíveis
    expandableCards.forEach(card => {
        const expandBtn = card.querySelector('[onclick*="toggleCardExpand"]');
        if (expandBtn) {
            expandBtn.onclick = () => toggleCardExpand(expandBtn);
        }
    });
    
    // Cards interativos
    interactiveCards.forEach(card => {
        card.addEventListener('click', handleCardInteraction);
    });
}

function toggleCardExpand(button) {
    const card = button.closest('.dashboard-card');
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        button.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
        animateCardContract(card);
    } else {
        card.classList.add('expanded');
        button.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
        animateCardExpand(card);
    }
}

function animateCardExpand(card) {
    card.style.zIndex = '100';
    card.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    // Adicionar overlay de background
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 50;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 50);
    
    overlay.addEventListener('click', () => {
        const expandBtn = card.querySelector('[onclick*="toggleCardExpand"]');
        if (expandBtn) toggleCardExpand(expandBtn);
    });
}

function animateCardContract(card) {
    card.style.zIndex = '1';
    
    // Remover overlay
    const overlay = document.querySelector('.card-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

function handleCardInteraction(event) {
    const card = event.currentTarget;
    
    // Efeito de clique
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
    
    // Ação específica baseada no tipo do card
    if (card.classList.contains('games-card')) {
        highlightGamesFeatures();
    }
}

// ===== ANIMAÇÕES AVANÇADAS =====
function initAnimations() {
    // Animação de entrada dos cards
    animateCardsEntrance();
    
    // Animações de hover melhoradas
    enhanceHoverAnimations();
    
    // Partículas de background
    createBackgroundParticles();
}

function animateCardsEntrance() {
    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function enhanceHoverAnimations() {
    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            createHoverEffect(card);
        });
    });
}

function createHoverEffect(card) {
    // Criar efeito de partículas no hover
    const rect = card.getBoundingClientRect();
    const particles = [];
    
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: rgba(200, 170, 110, 0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            left: ${rect.left + Math.random() * rect.width}px;
            top: ${rect.top + Math.random() * rect.height}px;
            animation: particleFade 1s ease-out forwards;
        `;
        
        document.body.appendChild(particle);
        particles.push(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

function createBackgroundParticles() {
    const dashboard = document.querySelector('.dashboard-layout');
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'bg-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(200, 170, 110, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 10 + 15}s linear infinite;
            pointer-events: none;
        `;
        
        dashboard.appendChild(particle);
    }
}

// ===== MÉTRICAS E DADOS =====
function initMetrics() {
    updateMetrics();
    setInterval(updateMetrics, 30000); // Atualizar a cada 30 segundos
}

function updateMetrics() {
    // Simular dados dinâmicos
    const metrics = {
        reportsViews: Math.floor(Math.random() * 500) + 800,
        mediaLikes: Math.floor(Math.random() * 200) + 300,
        mediaShares: Math.floor(Math.random() * 50) + 75,
        reportsCount: Math.floor(Math.random() * 5) + 8,
        mediaCount: Math.floor(Math.random() * 8) + 15
    };
    
    animateMetricUpdate('reports-views', metrics.reportsViews);
    animateMetricUpdate('media-likes', metrics.mediaLikes);
    animateMetricUpdate('media-shares', metrics.mediaShares);
    animateMetricUpdate('reports-count', metrics.reportsCount);
    animateMetricUpdate('media-count', metrics.mediaCount);
}

function animateMetricUpdate(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    const increment = (newValue - currentValue) / 20;
    let current = currentValue;
    
    const animation = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= newValue) || (increment < 0 && current <= newValue)) {
            current = newValue;
            clearInterval(animation);
        }
        element.textContent = Math.floor(current);
    }, 50);
}

// ===== FUNÇÕES ESPECÍFICAS =====
function refreshFeaturedReports() {
    console.log('🔄 Atualizando relatórios em destaque...');
    const container = document.getElementById('featured-reports-container');
    const loading = document.getElementById('featured-reports-loading');
    
    if (loading) loading.style.display = 'flex';
    if (container) container.style.opacity = '0.5';
    
    setTimeout(() => {
        if (loading) loading.style.display = 'none';
        if (container) container.style.opacity = '1';
        showNotification('Relatórios atualizados!', 'success');
    }, 1500);
}

function refreshFeaturedMedia() {
    console.log('🔄 Atualizando mídia em destaque...');
    const container = document.getElementById('featured-media-container');
    const loading = document.getElementById('featured-media-loading');
    
    if (loading) loading.style.display = 'flex';
    if (container) container.style.opacity = '0.5';
    
    setTimeout(() => {
        if (loading) loading.style.display = 'none';
        if (container) container.style.opacity = '1';
        showNotification('Mídia atualizada!', 'success');
    }, 1500);
}

function showGameInfo() {
    showNotification('Abrindo informações do jogo...', 'info');
    setTimeout(() => {
        window.open('pages/games.html', '_blank');
    }, 500);
}

function highlightGamesFeatures() {
    const gameCard = document.querySelector('.games-card');
    const pixels = gameCard.querySelectorAll('.pixel');
    
    pixels.forEach((pixel, index) => {
        setTimeout(() => {
            pixel.style.background = '#ffffff';
            pixel.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
            
            setTimeout(() => {
                pixel.style.background = '';
                pixel.style.boxShadow = '';
            }, 500);
        }, index * 100);
    });
}

// ===== SISTEMA DE NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `dashboard-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, rgba(200, 170, 110, 0.95) 0%, rgba(200, 170, 110, 0.8) 100%);
        color: #0a1428;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: all 0.3s ease;
        font-weight: 500;
        border: 1px solid rgba(200, 170, 110, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(34, 197, 94, 0.8) 100%)';
        notification.style.color = '#ffffff';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===== FUNÇÕES DE CARREGAMENTO DE DADOS =====
function loadAnalyticsData(card) {
    // Simular carregamento de dados de analytics
    console.log('📊 Carregando dados de analytics...');
}

function loadPopularMedia(card) {
    // Simular carregamento de mídia popular
    console.log('🔥 Carregando mídia popular...');
}

function loadGalleryPreview(card) {
    // Simular carregamento de preview da galeria
    console.log('🖼️ Carregando preview da galeria...');
}

// ===== RECENT CONTENT MELHORADO =====
function initRecentContent() {
    const recentTabs = document.querySelectorAll('.recent-tab');
    
    recentTabs.forEach(tab => {
        tab.addEventListener('click', handleRecentTabChange);
    });
      // Carregar dados iniciais
    loadRecentReports();
}

function handleRecentTabChange(event) {
    const tab = event.currentTarget;
    const card = tab.closest('.dashboard-card');
    const tabName = tab.dataset.tab;
    
    // Remover active de todos os tabs e conteúdos
    const allTabs = card.querySelectorAll('.recent-tab');
    const allContents = card.querySelectorAll('.recent-tab-content');
    
    allTabs.forEach(t => t.classList.remove('active'));
    allContents.forEach(content => content.classList.remove('active'));
    
    // Ativar tab e conteúdo selecionados
    tab.classList.add('active');
    const targetContent = card.querySelector(`[data-tab="${tabName}"]`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Carregar conteúdo específico
    loadRecentTabContent(tabName);
}

function loadRecentTabContent(tabName) {
    console.log(`📑 Carregando conteúdo da tab: ${tabName}`);
    
    switch(tabName) {
        case 'reports':
            loadRecentReports();
            break;
        case 'media':
            loadRecentMedia();
            break;
    }
}

function loadActivityTimeline() {
    const timelineContainer = document.getElementById('activity-timeline');
    const loadingIndicator = document.getElementById('activity-timeline-loading');
    
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    // Simular carregamento de timeline
    setTimeout(() => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (timelineContainer) {
            timelineContainer.innerHTML = createTimelineHTML();
        }
        
        updateActivityStats();
    }, 1000);
}

function createTimelineHTML() {
    const timelineItems = [
        {
            type: 'report',
            title: 'Análise de Performance Q4 2024',
            description: 'Relatório completo sobre métricas de performance',
            time: '2 horas atrás',
            views: '124'
        },
        {
            type: 'media',
            title: 'Novo projeto JavaScript',
            description: 'Upload de screenshots do projeto interativo',
            time: '5 horas atrás',
            likes: '23'
        },
        {
            type: 'report',
            title: 'Dashboard Analytics',
            description: 'Insights sobre uso do dashboard',
            time: '1 dia atrás',
            views: '89'
        },
        {
            type: 'media',
            title: 'UI/UX Showcase',
            description: 'Galeria de designs recentes',
            time: '2 dias atrás',
            likes: '45'
        }
    ];
    
    return timelineItems.map(item => `
        <div class="timeline-item">
            <div class="timeline-icon ${item.type}">
                <i class="fas fa-${item.type === 'report' ? 'chart-line' : 'image'}"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-title">${item.title}</div>
                <div class="timeline-description">${item.description}</div>
                <div class="timeline-meta">
                    <span>${item.time}</span>
                    <span>${item.views ? `${item.views} visualizações` : `${item.likes} curtidas`}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function loadRecentReports() {
    const reportsGrid = document.getElementById('recent-reports-grid');
    const loadingIndicator = document.getElementById('recent-reports-loading');
    
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    setTimeout(() => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (reportsGrid) {
            reportsGrid.innerHTML = createReportsGridHTML();
        }
    }, 800);
}

function createReportsGridHTML() {
    const reports = [
        {
            title: 'Performance Analytics',
            description: 'Análise detalhada de performance do sistema',
            date: '2024-12-08',
            views: '156',
            type: 'dashboard'
        },
        {
            title: 'User Behavior Study',
            description: 'Estudo sobre comportamento de usuários',
            date: '2024-12-07',
            views: '89',
            type: 'research'
        },
        {
            title: 'Technical Review',
            description: 'Revisão técnica de implementações',
            date: '2024-12-06',
            views: '234',
            type: 'technical'
        }
    ];
    
    return reports.map(report => `
        <div class="content-item" onclick="openReport('${report.title}')">
            <div class="item-header">
                <div class="item-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="item-title">${report.title}</div>
            </div>
            <div class="item-description">${report.description}</div>
            <div class="item-footer">
                <span>${report.date}</span>
                <span>${report.views} visualizações</span>
            </div>
        </div>
    `).join('');
}

function loadRecentMedia() {
    const mediaGrid = document.getElementById('recent-media-grid');
    const loadingIndicator = document.getElementById('recent-media-loading');
    
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    setTimeout(() => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (mediaGrid) {
            mediaGrid.innerHTML = createMediaGridHTML();
        }
    }, 800);
}

function createMediaGridHTML() {
    const mediaItems = [
        {
            title: 'Dashboard Screenshot',
            description: 'Captura do novo design do dashboard',
            date: '2024-12-08',
            likes: '45',
            type: 'screenshot'
        },
        {
            title: 'Project Demo',
            description: 'Demonstração do projeto interativo',
            date: '2024-12-07',
            likes: '32',
            type: 'video'
        },
        {
            title: 'UI Components',
            description: 'Biblioteca de componentes visuais',
            date: '2024-12-06',
            likes: '67',
            type: 'design'
        }
    ];
    
    return mediaItems.map(item => `
        <div class="media-item" onclick="openMedia('${item.title}')">
            <div class="item-header">
                <div class="item-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                    <i class="fas fa-image"></i>
                </div>
                <div class="item-title">${item.title}</div>
            </div>
            <div class="item-description">${item.description}</div>
            <div class="item-footer">
                <span>${item.date}</span>
                <span>${item.likes} curtidas</span>
            </div>
        </div>
    `).join('');
}

function updateActivityStats() {
    animateMetricUpdate('total-reports', 12);
    animateMetricUpdate('total-media', 8);
    animateMetricUpdate('total-skills', 15);
    animateMetricUpdate('total-repos', 24);
}

// ===== GITHUB MELHORADO =====
function initGitHubSection() {
    console.log('🐙 Inicializando seção GitHub...');
    
    const githubTabs = document.querySelectorAll('.github-tab');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    console.log('GitHub tabs encontradas:', githubTabs.length);
    console.log('Filter buttons encontrados:', filterBtns.length);
    
    githubTabs.forEach(tab => {
        tab.addEventListener('click', handleGitHubTabChange);
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleRepoFilter);
    });
    
    // Carregar dados iniciais
    loadGitHubProfile();
    loadGitHubRepos();
    loadGitHubActivity();
    
    console.log('✅ Seção GitHub inicializada');
}

function handleGitHubTabChange(event) {
    console.log('🔄 GitHub tab clicked');
    
    const tab = event.currentTarget;
    const card = tab.closest('.dashboard-card');
    const tabName = tab.dataset.tab;
    
    console.log('Tab name:', tabName);
    
    // Remover active de todos os tabs e conteúdos
    const allTabs = card.querySelectorAll('.github-tab');
    const allContents = card.querySelectorAll('.github-tab-content');
    
    allTabs.forEach(t => t.classList.remove('active'));
    allContents.forEach(content => content.classList.remove('active'));
    
    // Ativar tab e conteúdo selecionados
    tab.classList.add('active');
    const targetContent = card.querySelector(`.github-tab-content[data-tab="${tabName}"]`);
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('✅ Tab content activated:', tabName);
    } else {
        console.error('❌ Tab content not found for:', tabName);
    }
}

function handleRepoFilter(event) {
    const btn = event.currentTarget;
    const filter = btn.dataset.filter;
    
    // Remover active de todos os filtros
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Filtrar repositórios
    filterRepositories(filter);
}

function loadGitHubProfile() {
    const profileContainer = document.getElementById('github-profile');
    
    setTimeout(() => {
        if (profileContainer) {
            profileContainer.innerHTML = createProfileHTML();
        }
    }, 1000);
}

function createProfileHTML() {
    return `
        <div class="profile-card">
            <div class="profile-avatar">
                <img src="https://github.com/mikaeldmts.png" alt="Profile Avatar">
            </div>
            <div class="profile-info">
                <div class="profile-name">Mikael Ferreira</div>
                <div class="profile-bio">Desenvolvedor Full-Stack apaixonado por tecnologia e inovação</div>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <span id="github-followers">0</span> seguidores
                    </div>
                    <div class="profile-stat">
                        <span id="github-following">0</span> seguindo
                    </div>
                    <div class="profile-stat">
                        <span id="github-public-repos">0</span> repositórios
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadGitHubRepos() {
    const reposContainer = document.getElementById('github-repos');
    
    setTimeout(() => {
        if (reposContainer) {
            reposContainer.innerHTML = createReposHTML();
        }
    }, 1200);
}

function createReposHTML() {
    const repos = [
        {
            name: 'mikaeldmts.github.io',
            description: 'Portfólio pessoal e dashboard interativo',
            language: 'JavaScript',
            languageColor: '#f1e05a',
            stars: 5,
            visibility: 'public'
        },
        {
            name: 'dashboard-analytics',
            description: 'Sistema de analytics para dashboards',
            language: 'TypeScript',
            languageColor: '#2b7489',
            stars: 12,
            visibility: 'public'
        },
        {
            name: 'ui-components',
            description: 'Biblioteca de componentes reutilizáveis',
            language: 'CSS',
            languageColor: '#563d7c',
            stars: 8,
            visibility: 'private'
        }
    ];
    
    return repos.map(repo => `
        <div class="repo-item" onclick="openRepository('${repo.name}')">
            <div class="repo-header">
                <div class="repo-name">${repo.name}</div>
                <div class="repo-visibility">${repo.visibility}</div>
            </div>
            <div class="repo-description">${repo.description}</div>
            <div class="repo-footer">
                <div class="repo-language">
                    <div class="language-dot" style="background-color: ${repo.languageColor}"></div>
                    <span>${repo.language}</span>
                </div>
                <div class="repo-stars">
                    <i class="fas fa-star"></i>
                    <span>${repo.stars}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function loadGitHubActivity() {
    // Simular dados de atividade
    setTimeout(() => {
        animateMetricUpdate('github-contributions', 1247);
        animateMetricUpdate('github-stars', 25);
        animateMetricUpdate('github-forks', 8);
        animateMetricUpdate('github-followers', 42);
        animateMetricUpdate('github-following', 67);
        animateMetricUpdate('github-public-repos', 18);
    }, 1500);
}

function filterRepositories(filter) {
    const repoItems = document.querySelectorAll('.repo-item');
    
    repoItems.forEach(item => {
        // Lógica de filtro simples (pode ser expandida)
        item.style.display = 'block';
        
        if (filter === 'recent') {
            // Mostrar apenas os 2 primeiros
            const index = Array.from(repoItems).indexOf(item);
            if (index > 1) item.style.display = 'none';
        } else if (filter === 'popular') {
            // Lógica para repositórios populares
            const starsElement = item.querySelector('.repo-stars span');
            const stars = parseInt(starsElement?.textContent || '0');
            if (stars < 8) item.style.display = 'none';
        }
    });
}

// ===== FUNÇÕES DE ABERTURA =====
function openReport(title) {
    showNotification(`Abrindo relatório: ${title}`, 'info');
    setTimeout(() => {
        window.open('pages/relatorios-galeria.html', '_blank');
    }, 500);
}

function openMedia(title) {
    showNotification(`Abrindo mídia: ${title}`, 'info');
    setTimeout(() => {
        window.open('pages/galeria-midia.html', '_blank');
    }, 500);
}

function openRepository(name) {
    showNotification(`Abrindo repositório: ${name}`, 'info');
    setTimeout(() => {
        window.open(`https://github.com/mikaeldmts/${name}`, '_blank');
    }, 500);
}

function animateMetricUpdate(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// ===== INICIALIZAÇÃO MELHORADA =====
function initDashboard() {
    console.log('🚀 Inicializando Dashboard Moderno...');
    
    try {
        // Inicializar componentes principais
        initSearchSystem();
        initTabSystem();
        initCardInteractions();
        initAnimations();
        initMetrics();
        
        // Inicializar seções específicas
        initRecentContent();
        initGitHubSection();
        
        // Carregar dados das skills
        loadSkillsData();
        
        console.log('✅ Dashboard inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização do dashboard:', error);
    }
}

// Garantir que as funções estão disponíveis globalmente
window.clearSkillsCache = clearSkillsCache;
window.loadSkillsData = loadSkillsData;
window.openReport = openReport;
window.openMedia = openMedia;
window.openRepository = openRepository;
