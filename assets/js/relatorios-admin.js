// relatorios-admin.js - Sistema de administração de relatórios
import { auth, db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    getDoc,
    setDoc,
    query, 
    orderBy, 
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { signOut, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Variáveis globais
let currentUser = null;
let allReports = [];

// Aguardar autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('Usuário autenticado para relatórios:', user.uid);
        init();
    } else {
        // Fazer login anônimo automático
        try {
            const userCredential = await signInAnonymously(auth);
            console.log('Login anônimo realizado para relatórios:', userCredential.user.uid);
            currentUser = userCredential.user;
            init();
        } catch (error) {
            console.error('Erro no login anônimo:', error);
            // Ainda assim tentar inicializar
            init();
        }
    }
});

function init() {
    console.log('🔧 Inicializando relatórios admin...');
    setupEventListeners();
    showTab('criar');
    loadReports();
    loadFeaturedReportsSelect();
}

function setupEventListeners() {
    console.log('Configurando event listeners dos relatórios...');
    
    // Tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tab = button.dataset.tab;
            console.log('Clicou na aba:', tab);
            showTab(tab);
        });
    });

    // Controle de origem do relatório (URL vs Arquivo)
    const sourceRadios = document.querySelectorAll('input[name="source-type"]');
    sourceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleSourceType(e.target.value);
        });
    });

    // Formulários
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    const featuredForm = document.getElementById('featured-reports-form');
    if (featuredForm) {
        featuredForm.addEventListener('submit', handleFeaturedSubmit);
    }

    // Botões
    const refreshBtn = document.getElementById('refresh-reports');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadReports);
    }

    const removeAllBtn = document.getElementById('remove-all-featured');
    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', removeAllFeatured);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Modal
    setupModal();
}

function showTab(tabName) {
    console.log('Mudando para aba de relatórios:', tabName);
    
    // Ocultar todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remover active de todos os botões
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Mostrar aba selecionada
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        console.log('Aba de relatórios mostrada:', tabName);
    } else {
        console.error('Aba de relatórios não encontrada:', `${tabName}-tab`);
    }

    // Adicionar active ao botão
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
        console.log('Botão de relatórios ativado:', tabName);
    } else {
        console.error('Botão de relatórios não encontrado:', `[data-tab="${tabName}"]`);
    }

    // Carregar dados específicos da aba
    if (tabName === 'gerenciar') {
        loadReports();
    } else if (tabName === 'destaque') {
        loadFeaturedReports();
        loadFeaturedReportsSelect();
    }
}

function toggleSourceType(type) {
    const urlSection = document.getElementById('url-section');
    const fileSection = document.getElementById('file-section');
    const urlInput = document.getElementById('report-url');
    const fileInput = document.getElementById('report-file');

    if (type === 'url') {
        urlSection.style.display = 'block';
        fileSection.style.display = 'none';
        urlInput.required = true;
        fileInput.required = false;
    } else {
        urlSection.style.display = 'none';
        fileSection.style.display = 'block';
        urlInput.required = false;
        fileInput.required = true;
    }
}

async function uploadFile(file) {
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-bar');
    const progressPercent = document.getElementById('upload-percent');
    
    try {
        progressContainer.style.display = 'block';
        progressBar.style.width = '20%';
        progressPercent.textContent = '20%';
        
        // Converter arquivo para base64
        const base64Data = await convertFileToBase64(file);
        
        progressBar.style.width = '60%';
        progressPercent.textContent = '60%';
        
        // Criar documento no Firestore
        const fileData = {
            id: Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data,
            uploadedAt: serverTimestamp()
        };
        
        progressBar.style.width = '80%';
        progressPercent.textContent = '80%';
        
        // Salvar no Firestore na coleção relatorios_files
        const docRef = await addDoc(collection(db, 'relatorios_files'), fileData);
        
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
        }, 1000);
        
        // Retornar ID do documento para usar como referência
        return docRef.id;
        
    } catch (error) {
        progressContainer.style.display = 'none';
        throw error;
    }
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleReportSubmit(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Criando...';
    submitButton.disabled = true;
    
    try {
        const formData = new FormData(event.target);
        // Utilitário para obter string com trim de forma segura
        const getTrim = (name) => {
            const v = formData.get(name);
            return typeof v === 'string' ? v.trim() : '';
        };

        const sourceType = document.querySelector('input[name="source-type"]:checked')?.value || 'url';
        
        let embedUrl = '';
        
        if (sourceType === 'url') {
            embedUrl = getTrim('embedUrl');
            if (!embedUrl) {
                throw new Error('URL do relatório é obrigatória');
            }
        } else {
            const file = formData.get('file');
            if (!file || file.size === 0) {
                throw new Error('Arquivo é obrigatório');
            }
            
            // Validar tamanho do arquivo (10MB)
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Arquivo muito grande. Máximo permitido: 10MB');
            }
            
            // Upload do arquivo
            embedUrl = await uploadFile(file);
        }
                    const reportData = {
                        title: getTrim('title'),
                        description: getTrim('description'),
                        type: getTrim('type'),
                        embedUrl: embedUrl,
                        // Campo opcional: URL de imagem de prévia
                        previewImage: (getTrim('previewImage') || null),
                        sourceType: sourceType,
                        visible: formData.get('visible') === 'on',
                        createdAt: serverTimestamp(),
                        createdBy: currentUser?.uid || 'anon'
                    };

        if (!reportData.title || !reportData.type || !reportData.embedUrl) {
            throw new Error('Título, tipo e origem do relatório são obrigatórios');
        }

        await addDoc(collection(db, 'relatorios_posts'), reportData);
        showSuccess('Relatório criado com sucesso!');
        
        // Limpar formulário
        event.target.reset();
        
        // Resetar para URL como padrão
        document.querySelector('input[name="source-type"][value="url"]').checked = true;
        toggleSourceType('url');
        
        // Recarregar lista se estiver na aba de gerenciar
        if (!document.getElementById('gerenciar-tab').classList.contains('hidden')) {
            loadReports();
        }
        
    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        showError(error.message || 'Erro ao criar relatório');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

async function loadReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;

    showLoading('Carregando relatórios...');

    try {
        const q = query(collection(db, 'relatorios_posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        allReports = [];
        container.innerHTML = '';

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                    <i class="fas fa-chart-line" style="font-size: 3rem; color: var(--border-color); margin-bottom: 1rem; display: block;"></i>
                    <p>Nenhum relatório encontrado</p>
                </div>
            `;
        } else {
            querySnapshot.forEach(doc => {
                const report = { id: doc.id, ...doc.data() };
                allReports.push(report);
                const reportElement = createReportElement(report);
                container.appendChild(reportElement);
            });
        }

    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        showError('Erro ao carregar relatórios');
    } finally {
        hideLoading();
    }
}

function createReportElement(report) {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-lg border border-gray-700 overflow-hidden';
    
    // Ícones por tipo
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
    
    div.innerHTML = `
        <div class="report-preview">
            ${report.previewImage ? 
                `<div style="position: relative; height: 200px; overflow: hidden; border-radius: 8px;">
                    <img src="${report.previewImage}" 
                         alt="Preview do ${report.title}"
                         style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; top: 10px; right: 10px;">
                        <div class="report-type-label">${typeLabel}</div>
                    </div>
                </div>` :
                `<div class="report-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="report-type-label">${typeLabel}</div>`
            }
        </div>
        <div class="p-4">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-white font-semibold truncate flex-1">${report.title}</h3>
            </div>
            
            <p class="text-gray-400 text-sm mb-3 line-clamp-2">${report.description || 'Sem descrição'}</p>
            
            <div class="flex justify-between items-center text-xs text-gray-500 mb-3">
                <span>${createdAt}</span>
                <span class="${report.visible ? 'text-green-500' : 'text-red-500'}">
                    ${report.visible ? 'Visível' : 'Oculto'}
                </span>
            </div>
            
            <div class="flex gap-2">
                <button onclick="editReport('${report.id}')" 
                        class="flex-1 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 text-sm">
                    <i class="fas fa-edit mr-1"></i> Editar
                </button>
                <button onclick="toggleReportVisibility('${report.id}', ${!report.visible})" 
                        class="flex-1 bg-yellow-600 text-white py-2 px-3 rounded hover:bg-yellow-700 text-sm">
                    <i class="fas fa-eye${report.visible ? '-slash' : ''} mr-1"></i> 
                    ${report.visible ? 'Ocultar' : 'Mostrar'}
                </button>
                <button onclick="deleteReport('${report.id}')" 
                        class="bg-red-600 text-white py-2 px-3 rounded hover:bg-red-700 text-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

window.editReport = function(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;
      // Preencher formulário
    document.getElementById('report-title').value = report.title;
    document.getElementById('report-description').value = report.description || '';
    document.getElementById('report-type').value = report.type;
    document.getElementById('report-url').value = report.embedUrl;
    document.getElementById('report-preview-image').value = report.previewImage || '';
    document.getElementById('report-visible').checked = report.visible;
    
    // Alterar para modo edição
    const form = document.getElementById('report-form');
    form.dataset.editId = reportId;
    
    // Alterar texto do botão
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i>Atualizar Relatório';
    
    // Ir para a aba de criar/editar
    showTab('criar');
    
    showSuccess('Relatório carregado para edição');
};

window.toggleReportVisibility = async function(reportId, visible) {
    showLoading('Atualizando visibilidade...');
    
    try {
        const reportRef = doc(db, 'relatorios_posts', reportId);
        await updateDoc(reportRef, { visible });
        
        showSuccess(`Relatório ${visible ? 'tornado visível' : 'ocultado'} com sucesso!`);
        loadReports();
        
    } catch (error) {
        console.error('Erro ao atualizar visibilidade:', error);
        showError('Erro ao atualizar visibilidade');
    } finally {
        hideLoading();
    }
};

window.deleteReport = function(reportId) {
    showConfirm(
        'Excluir Relatório',
        'Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.',
        async () => {
            showLoading('Excluindo relatório...');
            
            try {
                await deleteDoc(doc(db, 'relatorios_posts', reportId));
                showSuccess('Relatório excluído com sucesso!');
                loadReports();
                
            } catch (error) {
                console.error('Erro ao excluir relatório:', error);
                showError('Erro ao excluir relatório');
            } finally {
                hideLoading();
            }
        }
    );
};

async function loadFeaturedReportsSelect() {
    const select = document.getElementById('featured-report-select');
    if (!select) return;
    
    try {
        // Evitar índice composto exigido combinando where + orderBy; ordenar no cliente
        const q = query(
            collection(db, 'relatorios_posts'),
            where('visible', '==', true)
        );
        const querySnapshot = await getDocs(q);
        
        select.innerHTML = '<option value="">Selecione um relatório</option>';

        // Montar lista e ordenar por título no cliente
        const reports = [];
        querySnapshot.forEach(d => {
            reports.push({ id: d.id, ...d.data() });
        });
        reports.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

        for (const report of reports) {
            const option = document.createElement('option');
            option.value = report.id;
            option.textContent = report.title || '(Sem título)';
            option.dataset.report = JSON.stringify(report);
            select.appendChild(option);
        }
        
    } catch (error) {
        console.error('Erro ao carregar relatórios para seleção:', error);
        select.innerHTML = '<option value="">Erro ao carregar relatórios</option>';
    }
}

async function loadFeaturedReports() {
    const container = document.getElementById('featured-reports-list');
    if (!container) return;
    
    try {
        const docRef = doc(db, 'relatorios_config', 'featured_reports');
        const docSnap = await getDoc(docRef);
        
        container.innerHTML = '';
        
        if (docSnap.exists() && docSnap.data().reports) {
            const featuredReports = docSnap.data().reports;
            
            featuredReports.forEach((report, index) => {
                const reportElement = createFeaturedReportElement(report, index);
                container.appendChild(reportElement);
            });
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-star" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>Nenhum relatório em destaque configurado</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro ao carregar relatórios em destaque:', error);
    }
}

function createFeaturedReportElement(report, index) {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-lg border border-yellow-600 overflow-hidden';
    
    // Ícones por tipo
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
    
    div.innerHTML = `
        <div class="report-preview">
            <div class="report-icon">
                <i class="${icon}"></i>
            </div>
            <div class="report-type-label">${typeLabel}</div>
        </div>
        <div class="p-4">
            <h3 class="text-white font-semibold mb-2">${report.title}</h3>
            <p class="text-gray-400 text-sm mb-3">${report.description}</p>
            <button onclick="removeFeaturedReport(${index})" 
                    class="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
                <i class="fas fa-trash mr-2"></i>Remover
            </button>
        </div>
    `;
    
    return div;
}

async function handleFeaturedSubmit(event) {
    event.preventDefault();
    
    const select = document.getElementById('featured-report-select');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption.dataset.report) {
        showError('Selecione um relatório');
        return;
    }
    
    const report = JSON.parse(selectedOption.dataset.report);
    
    showLoading('Configurando relatório em destaque...');
    
    try {
        const docRef = doc(db, 'relatorios_config', 'featured_reports');
        const docSnap = await getDoc(docRef);
        
        let currentReports = [];
        if (docSnap.exists() && docSnap.data().reports) {
            currentReports = docSnap.data().reports;
        }
        
        // Verificar se já existe
        const exists = currentReports.some(r => r.id === report.id);
        if (exists) {
            showError('Este relatório já está em destaque');
            return;
        }
        
        // Adicionar novo relatório
        currentReports.push(report);
        
        await setDoc(docRef, {
            reports: currentReports,
            updatedAt: serverTimestamp()
        });
        
        showSuccess('Relatório adicionado aos destaques!');
        loadFeaturedReports();
        select.selectedIndex = 0;
        
    } catch (error) {
        console.error('Erro ao configurar destaque:', error);
        showError('Erro ao configurar destaque');
    } finally {
        hideLoading();
    }
}

window.removeFeaturedReport = async function(index) {
    showConfirm(
        'Remover Destaque',
        'Tem certeza que deseja remover este relatório dos destaques?',
        async () => {
            showLoading('Removendo destaque...');
            
            try {
                const docRef = doc(db, 'relatorios_config', 'featured_reports');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const reports = docSnap.data().reports || [];
                    reports.splice(index, 1);
                    
                    await setDoc(docRef, {
                        reports,
                        updatedAt: serverTimestamp()
                    });
                    
                    showSuccess('Relatório removido dos destaques!');
                    loadFeaturedReports();
                }
                
            } catch (error) {
                console.error('Erro ao remover destaque:', error);
                showError('Erro ao remover destaque');
            } finally {
                hideLoading();
            }
        }
    );
};

async function removeAllFeatured() {
    showConfirm(
        'Remover Todos os Destaques',
        'Tem certeza que deseja remover TODOS os relatórios dos destaques?',
        async () => {
            showLoading('Removendo todos os destaques...');
            
            try {
                const docRef = doc(db, 'relatorios_config', 'featured_reports');
                await setDoc(docRef, {
                    reports: [],
                    updatedAt: serverTimestamp()
                });
                
                showSuccess('Todos os destaques foram removidos!');
                loadFeaturedReports();
                
            } catch (error) {
                console.error('Erro ao remover destaques:', error);
                showError('Erro ao remover destaques');
            } finally {
                hideLoading();
            }
        }
    );
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showError('Erro ao fazer logout');
    }
}

// Funções de UI
function showLoading(message = 'Carregando...') {
    // Implementar loading spinner se necessário
    console.log(message);
}

function hideLoading() {
    // Ocultar loading spinner
}

function showSuccess(message) {
    alert('✓ ' + message);
}

function showError(message) {
    alert('✗ ' + message);
}

function setupModal() {
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Remover listeners antigos
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    // Adicionar novo listener
    newOkBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        onConfirm();
    });
    
    modal.style.display = 'flex';
}
