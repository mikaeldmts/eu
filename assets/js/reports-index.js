// reports-index.js - Sistema de relatórios para a página inicial
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Reports-index.js carregado');
    
    // Inicializar imediatamente
    if (db) {
        console.log('🎯 Firebase pronto, carregando relatórios...');
        initializeReports();
    } else {
        console.error('🔥 Firebase não está disponível');
    }
});

function initializeReports() {
    loadRecentReports();
    loadFeaturedReports();
}

async function loadRecentReports() {
    const container = document.getElementById('recent-reports-grid');
    const loading = document.getElementById('recent-reports-loading');
    
    console.log('📊 Tentando carregar relatórios recentes...');
    console.log('Container encontrado:', !!container);
    console.log('Loading encontrado:', !!loading);
    
    if (!container || !loading) {
        console.log('❌ Elementos de relatórios não encontrados:', { container: !!container, loading: !!loading });
        return;
    }
    
    try {
        console.log('📊 Carregando relatórios recentes...');
        
        // Mostrar estado de carregamento
        loading.style.display = 'block';
        container.innerHTML = '';
          // Buscar relatórios recentes (simplificado para evitar índice composto)
        const q = query(
            collection(db, 'relatorios_posts'), 
            orderBy('createdAt', 'desc'), 
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('📊 Relatórios encontrados:', querySnapshot.size);
        
        // Esconder loading
        loading.style.display = 'none';
          if (querySnapshot.empty) {
            console.log('📊 Nenhum relatório encontrado');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>Nenhum relatório disponível</h3>
                    <p>Os relatórios serão exibidos aqui quando adicionados.</p>
                </div>
            `;
        } else {
            let visibleCount = 0;
            querySnapshot.forEach(doc => {
                const report = { id: doc.id, ...doc.data() };
                console.log('📊 Processando relatório:', report);
                
                // Filtrar apenas relatórios visíveis
                if (report.visible === true && visibleCount < 6) {
                    const reportElement = createRecentReportCard(report);
                    container.appendChild(reportElement);
                    visibleCount++;
                }
            });
            
            // Se nenhum relatório visível foi encontrado
            if (visibleCount === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>Nenhum relatório disponível</h3>
                        <p>Os relatórios serão exibidos aqui quando adicionados.</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar relatórios recentes:', error);
        loading.style.display = 'none';
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Erro ao carregar relatórios</h3>
                <p>Tente novamente mais tarde. Detalhes: ${error.message}</p>
            </div>
        `;
    }
}

function createRecentReportCard(report) {
    const card = document.createElement('div');
    card.className = 'recent-media-card';
    
    // Ícones por tipo de relatório
    const typeIcons = {
        'powerbi': 'fas fa-chart-pie',
        'excel': 'fas fa-file-excel',
        'googlesheets': 'fas fa-table',
        'tableau': 'fas fa-chart-bar',
        'other': 'fas fa-chart-line'
    };
    
    const typeLabels = {
        'powerbi': 'Power BI',
        'excel': 'Excel Online',
        'googlesheets': 'Google Sheets',
        'tableau': 'Tableau',
        'other': 'Dashboard'
    };
    
    const icon = typeIcons[report.type] || typeIcons.other;
    const typeLabel = typeLabels[report.type] || typeLabels.other;
    
    const createdAt = report.createdAt && report.createdAt.toDate ? 
        report.createdAt.toDate().toLocaleDateString('pt-BR') : 
        'Data não disponível';
      card.innerHTML = `
        <div class="media-preview-container">
            ${report.previewImage ? 
                `<div style="position: relative; height: 200px; overflow: hidden; border-radius: 8px;">
                    <img src="${report.previewImage}" 
                         alt="Preview do ${report.title}"
                         style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; top: 10px; right: 10px;">
                        <div class="report-type-badge">
                            ${typeLabel}
                        </div>
                    </div>
                </div>` :
                `<div class="report-preview">
                    <div class="report-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="report-type-badge">
                        ${typeLabel}
                    </div>
                </div>`
            }
        </div>
        <div class="media-info">
            <h3 class="media-title">${report.title}</h3>
            <p class="media-description">${report.description || ''}</p>
            <div class="media-meta">
                <span class="media-date">
                    <i class="fas fa-calendar"></i>
                    ${createdAt}
                </span>
            </div>
        </div>
    `;
    
    // Adicionar evento de clique para abrir relatório
    card.addEventListener('click', () => {
        openReport(report);
    });
    
    return card;
}

async function loadFeaturedReports() {
    const container = document.getElementById('featured-reports-container');
    const loading = document.getElementById('featured-reports-loading');
    
    if (!container || !loading) {
        console.log('Elementos de relatórios em destaque não encontrados:', { container, loading });
        return;
    }
    
    try {
        console.log('Carregando relatórios em destaque...');
        
        const docRef = doc(db, 'relatorios_config', 'featured_reports');
        const docSnap = await getDoc(docRef);
        
        console.log('Config de relatórios em destaque:', docSnap.exists() ? docSnap.data() : 'Não encontrado');
        
        container.innerHTML = '';
        
        if (docSnap.exists() && docSnap.data().reports && docSnap.data().reports.length > 0) {
            const featuredReports = docSnap.data().reports;
            console.log('Relatórios em destaque encontrados:', featuredReports.length);
            
            featuredReports.forEach(report => {
                const reportCard = createFeaturedReportCard(report);
                container.appendChild(reportCard);
            });
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Nenhum relatório em destaque</h3>
                    <p>Configure relatórios em destaque no painel administrativo.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro ao carregar relatórios em destaque:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar relatórios em destaque</p>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
        container.style.display = 'flex';
    }
}

function createFeaturedReportCard(report) {
    const card = document.createElement('div');
    card.className = 'featured-media-card';
    
    // Ícones por tipo de relatório
    const typeIcons = {
        'powerbi': 'fas fa-chart-pie',
        'excel': 'fas fa-file-excel',
        'googlesheets': 'fas fa-table',
        'tableau': 'fas fa-chart-bar',
        'other': 'fas fa-chart-line'
    };
    
    const typeLabels = {
        'powerbi': 'Power BI',
        'excel': 'Excel Online',
        'googlesheets': 'Google Sheets',
        'tableau': 'Tableau',
        'other': 'Dashboard'
    };
    
    const icon = typeIcons[report.type] || typeIcons.other;
    const typeLabel = typeLabels[report.type] || typeLabels.other;
    
    card.innerHTML = `
        <div class="featured-media-wrapper">
            <div class="featured-report-preview">
                <div class="featured-report-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="featured-report-type">
                    ${typeLabel}
                </div>
            </div>
            <div class="featured-overlay">
                <div class="featured-badge">
                    <i class="fas fa-star"></i>
                    DESTAQUE
                </div>
            </div>
        </div>
        <div class="featured-info">
            <h3 class="featured-title">${report.title}</h3>
            <p class="featured-description">${report.description}</p>
            <button class="btn-view-featured" onclick="openReport(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                <i class="fas fa-external-link-alt"></i>
                Abrir Relatório
            </button>
        </div>
    `;
    
    return card;
}

// Função global para abrir relatórios
async function resolveEmbedUrl(report) {
    // Se a origem for URL, retornar diretamente
    if (!report || !report.sourceType || report.sourceType === 'url') {
        return report?.embedUrl || '';
    }

    // Para arquivos, o embedUrl contém o ID do documento em relatorios_files
    try {
        const fileDocRef = doc(db, 'relatorios_files', report.embedUrl);
        const fileSnap = await getDoc(fileDocRef);
        if (fileSnap.exists()) {
            const data = fileSnap.data();
            // Se já é Data URL, podemos usar direto no iframe para PDF/HTML
            if (typeof data.data === 'string' && data.data.startsWith('data:')) {
                return data.data;
            }
        }
    } catch (e) {
        console.error('Erro ao resolver arquivo do relatório:', e);
    }
    return '';
}

window.openReport = async function(report) {
    // Criar modal para exibir o relatório
    const modal = document.createElement('div');
    modal.className = 'report-modal';
    const resolvedUrl = await resolveEmbedUrl(report);
    modal.innerHTML = `
        <div class="report-modal-content">
            <div class="report-modal-header">
                <h2>${report.title}</h2>
                <button class="report-modal-close" onclick="closeReportModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="report-modal-body">
                <iframe src="${resolvedUrl || report.embedUrl || ''}" 
                        frameborder="0" 
                        allowfullscreen 
                        class="report-iframe">
                </iframe>
            </div>
        </div>
    `;
    
    modal.id = 'report-modal';
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReportModal();
        }
    });
};

// Função global para fechar modal de relatório
window.closeReportModal = function() {
    const modal = document.getElementById('report-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
};

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReportModal();
    }
});
