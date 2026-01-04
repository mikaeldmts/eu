// Simple i18n system for PT/EN with DOM data-i18n bindings
const I18N_STORAGE_KEY = 'site_lang';

const translations = {
  pt: {
    'nav.menu': 'MENU',
    'nav.curriculum': 'Currículo',
    'nav.allProjects': 'Projetos',
    'nav.mentors': 'Mentores',
    'nav.linkedin': 'LinkedIn',
    'nav.certificates': 'Certificados',
    'nav.interactive': 'Interativos',
    'nav.mediaGallery': 'Galeria de Mídia',
    'nav.reports': 'Relatórios',
    'nav.games': 'Jogos',
    'nav.login': 'Entrar',

    'overlay.title': 'Bem-vindo ao Portfólio de <span style="color:#c8aa6e;">Mikael Ferreira</span>',
    'overlay.subtitle': 'Projetos, análises de dados e experiências interativas — tudo em um só lugar. Clique abaixo para acessar a página inicial.',
    'overlay.button': 'Acessar página inicial do portfólio',
    'overlay.tip': 'Dica: você pode acessar a qualquer momento pelo endereço direto.',

    'header.quick.seeCurriculum': 'Ver Currículo',
    'header.quick.projects': 'Projetos',
    'header.quick.analysis': 'Relatórios',
    'scroll.explore': 'Explorar',

    'skills.title': 'Habilidades Técnicas',
    'skills.update': 'Atualizar Skills',
    'skills.explainer.title': 'Como calculo cada métrica:',
    'skills.explainer.html': `
      <div style="display:flex; align-items:center; gap:.6rem; color:#f0e6d2;">
        <i class="fas fa-lightbulb" style="color:#c8aa6e"></i>
        <strong>Como calculo cada métrica:</strong>
      </div>
      <ul style="margin:0; padding-left: 1.1rem; color:#bfb7a4; line-height:1.55;">
        <li><strong>Proficiência</strong>: deriva do percentual da barra (0–100%) convertido em 0–5 estrelas. A barra vem da proporção de <em>bytes</em> por linguagem (via GitHub) ou do <em>score</em> relativo de tecnologias.</li>
        <li><strong>Porcentagem</strong>: linguagens usam <code>bytes_da_linguagem / bytes_totais</code> × 100; tecnologias usam <code>score / score_máximo</code> × 85, limitado entre 15% e 95%.</li>
        <li><strong>Score</strong> (tecnologias): soma ponderada de indícios nos repositórios (linguagem principal, termos como “api”, “react”, “node”, etc.). Serve para ordenar a relevância.</li>
        <li><strong>Dados em tempo real</strong>: calculados a partir dos meus repositórios públicos. Se houver limite de API, exibo valores de fallback consistentes. Você pode clicar em “Atualizar Skills”.</li>
      </ul>
    `,

    'banner.text': '<strong>Em Constante Evolução:</strong> Este site está em atualização contínua e podem ocorrer pequenos bugs de desempenho. <span class="update-banner-highlight">Se notar algo estranho</span>, por favor me reporte pelo chat — sua mensagem será registrada no meu banco de dados para melhorias.',
    'banner.closeAria': 'Fechar aviso'
  },
  en: {
    'nav.menu': 'MENU',
    'nav.curriculum': 'Curriculum',
    'nav.allProjects': 'All Projects',
    'nav.mentors': 'Mentors',
    'nav.linkedin': 'LinkedIn',
    'nav.certificates': 'Certificates',
    'nav.interactive': 'Interactive',
    'nav.mediaGallery': 'Media Gallery',
    'nav.reports': 'Reports',
    'nav.games': 'Games',
    'nav.login': 'Login',

    'overlay.title': 'Welcome to <span style="color:#c8aa6e;">Mikael Ferreira</span>’s Portfolio',
    'overlay.subtitle': 'Projects, data analysis and interactive experiences — all in one place. Click below to enter the home page.',
    'overlay.button': 'Enter portfolio home page',
    'overlay.tip': 'Tip: you can access it anytime by the direct address.',

    'header.quick.seeCurriculum': 'See Curriculum',
    'header.quick.projects': 'Projects',
    'header.quick.analysis': 'Analysis',
    'scroll.explore': 'Explore',

    'skills.title': 'Technical Skills',
    'skills.update': 'Refresh Skills',
    'skills.explainer.title': 'How I calculate each metric:',
    'skills.explainer.html': `
      <div style="display:flex; align-items:center; gap:.6rem; color:#f0e6d2;">
        <i class="fas fa-lightbulb" style="color:#c8aa6e"></i>
        <strong>How I calculate each metric:</strong>
      </div>
      <ul style="margin:0; padding-left: 1.1rem; color:#bfb7a4; line-height:1.55;">
        <li><strong>Proficiency</strong>: derived from the bar percentage (0–100%) mapped into 0–5 stars. The bar comes from the share of <em>bytes</em> per language (GitHub) or the relative <em>score</em> for technologies.</li>
        <li><strong>Percentage</strong>: languages use <code>language_bytes / total_bytes</code> × 100; technologies use <code>score / max_score</code> × 85, clamped between 15% and 95%.</li>
        <li><strong>Score</strong> (technologies): weighted sum of evidence across repositories (main language, terms like “api”, “react”, “node”, etc.). Used to rank relevance.</li>
        <li><strong>Real-time data</strong>: calculated from my public repos. If the API rate limits, consistent fallback values are shown. You can click “Refresh Skills”.</li>
      </ul>
    `,

    'banner.text': '<strong>Constantly Evolving:</strong> This website is under continuous improvement and minor performance bugs may occur. <span class="update-banner-highlight">If you notice anything odd</span>, please report it via chat — your message will be stored in my database for improvements.',
    'banner.closeAria': 'Close notice'
  }
};

function getInitialLang() {
  const saved = localStorage.getItem(I18N_STORAGE_KEY);
  if (saved === 'pt' || saved === 'en') return saved;
  const nav = navigator.language || navigator.userLanguage || 'pt-BR';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function applyTranslations(lang) {
  const dict = translations[lang] || translations.pt;
  document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-br' : 'en');
  // Elements with data-i18n (innerHTML replacement)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
    // Attribute mapping if present
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      const keys = attr.split(',').map(s => s.trim());
      keys.forEach(a => {
        const attrKey = `${key}.${a}`;
        if (dict[attrKey]) el.setAttribute(a, dict[attrKey]);
      });
    }
  });
  // Update toggle label
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'pt' ? 'EN' : 'PT';
}

function setLanguage(lang) {
  localStorage.setItem(I18N_STORAGE_KEY, lang);
  applyTranslations(lang);
}

function toggleLanguage() {
  const current = localStorage.getItem(I18N_STORAGE_KEY) || getInitialLang();
  const next = current === 'pt' ? 'en' : 'pt';
  setLanguage(next);
}

function initI18n() {
  const lang = localStorage.getItem(I18N_STORAGE_KEY) || getInitialLang();
  setLanguage(lang);
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.addEventListener('click', toggleLanguage);
}

// Expose globally for other scripts if needed
window.I18n = { setLanguage, toggleLanguage, applyTranslations, getLanguage: () => localStorage.getItem(I18N_STORAGE_KEY) || getInitialLang() };

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
