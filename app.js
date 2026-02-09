const config = window.APP_CONFIG ?? {};
const username = config.githubUsername || "mikaeldmts";
const refreshSeconds = Number(config.refreshSeconds ?? 60);
const refreshMs = Number.isFinite(refreshSeconds) && refreshSeconds > 0 ? refreshSeconds * 1000 : 60000;

const el = {
  title: document.getElementById("title"),
  avatar: document.getElementById("avatar"),
  name: document.getElementById("name"),
  username: document.getElementById("username"),
  bio: document.getElementById("bio"),
  repos: document.getElementById("repos"),
  githubUpdated: document.getElementById("githubUpdated"),
  syncedAt: document.getElementById("syncedAt"),
  status: document.getElementById("status"),
  repoCards: document.getElementById("repoCards"),
  repoCountNote: document.getElementById("repoCountNote"),
  skillsGrid: document.getElementById("skillsGrid"),
  skillsLoading: document.getElementById("skillsLoading"),
  skillsCountNote: document.getElementById("skillsCountNote")
};

const SKILL_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#264de4",
  Python: "#3572a5",
  Java: "#b07219",
  PHP: "#777bb4",
  "C#": "#178600",
  React: "#61dafb",
  "Node.js": "#3c873a",
  Firebase: "#ffca28",
  Git: "#f1502f",
  GitHub: "#8b949e",
  "API REST": "#38bdf8",
  "Express.js": "#a3a3a3",
  Bootstrap: "#7952b3",
  "Vue.js": "#42b883",
  Angular: "#dd1b16",
  Docker: "#2496ed",
  SQL: "#e38c00",
  JSON: "#94a3b8",
  Markdown: "#9ca3af"
};

const SKILL_ICONS = {
  JavaScript: "fab fa-js",
  TypeScript: "fas fa-code",
  HTML: "fab fa-html5",
  CSS: "fab fa-css3-alt",
  Python: "fab fa-python",
  Java: "fab fa-java",
  PHP: "fab fa-php",
  React: "fab fa-react",
  "Node.js": "fab fa-node-js",
  Firebase: "fas fa-fire",
  Git: "fab fa-git-alt",
  GitHub: "fab fa-github",
  "API REST": "fas fa-plug",
  "Express.js": "fas fa-server",
  Bootstrap: "fab fa-bootstrap",
  "Vue.js": "fab fa-vuejs",
  Angular: "fab fa-angular",
  Docker: "fab fa-docker",
  SQL: "fas fa-database",
  JSON: "fas fa-brackets-curly",
  Markdown: "fab fa-markdown"
};

const SKILL_DESCRIPTIONS = {
  JavaScript: "Linguagem principal para interfaces dinâmicas e aplicações web completas.",
  TypeScript: "Tipagem estática para bases robustas e manutenção de longo prazo.",
  HTML: "Estrutura semântica para páginas acessíveis e bem organizadas.",
  CSS: "Estilização e responsividade com foco em experiência visual.",
  Python: "Automação e backend para tarefas de dados e produtividade.",
  Java: "Base sólida para aplicações empresariais e APIs robustas.",
  PHP: "Desenvolvimento web server-side com integração de banco de dados.",
  React: "Componentização de UI para frontends modernos e reativos.",
  "Node.js": "Runtime para APIs e serviços backend em JavaScript.",
  Firebase: "Backend as a Service para dados e integrações em tempo real.",
  Git: "Versionamento e colaboração de código em equipe.",
  GitHub: "Plataforma de hospedagem, revisão e gestão de projetos.",
  "API REST": "Arquitetura de serviços para integração entre sistemas.",
  "Express.js": "Framework minimalista para APIs em Node.js.",
  Bootstrap: "Framework CSS para construção rápida de interfaces responsivas.",
  "Vue.js": "Framework progressivo para interfaces web interativas.",
  Angular: "Framework completo para aplicações front-end de grande escala.",
  Docker: "Containerização para padronizar ambientes de desenvolvimento e deploy.",
  SQL: "Consultas e modelagem de dados em bancos relacionais.",
  JSON: "Formato de troca de dados usado em integrações de API.",
  Markdown: "Documentação técnica clara para projetos e repositórios."
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const base = 1024;
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / base ** exp;

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exp]}`;
}

function hexToRgb(hexColor) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor || "");
  if (!result) return "125,211,252";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

function getSkillColor(skillName) {
  return SKILL_COLORS[skillName] || "#7dd3fc";
}

function getSkillIcon(skillName) {
  return SKILL_ICONS[skillName] || "fas fa-code";
}

function getSkillDescription(skillName) {
  return SKILL_DESCRIPTIONS[skillName] || "Tecnologia utilizada em projetos reais do GitHub.";
}

function updateUI(profile) {
  el.title.textContent = `GitHub Profile: ${profile.login}`;
  el.avatar.src = profile.avatar_url || "";
  el.avatar.alt = `Avatar de ${profile.login}`;
  el.name.textContent = profile.name || "Sem nome";
  el.username.textContent = `@${profile.login}`;
  el.username.href = profile.html_url || `https://github.com/${username}`;
  el.bio.textContent = profile.bio || "Sem bio informada.";
  el.repos.textContent = String(profile.public_repos ?? 0);
  el.githubUpdated.textContent = formatDate(profile.updated_at);
  el.syncedAt.textContent = formatDate(new Date().toISOString());
}

function createRepoCard(repo) {
  const link = document.createElement("a");
  link.className = "repo-link";
  link.href = repo.html_url;
  link.target = "_blank";
  link.rel = "noreferrer";

  const card = document.createElement("article");
  card.className = "repo-card";

  const title = document.createElement("h3");
  title.className = "repo-title";
  title.textContent = repo.name;

  const desc = document.createElement("p");
  desc.className = "repo-desc";
  desc.textContent = repo.description || "Sem descrição.";

  const meta = document.createElement("p");
  meta.className = "repo-meta";
  meta.textContent = `Linguagem: ${repo.language || "-"} | Stars: ${repo.stargazers_count ?? 0}`;

  const cta = document.createElement("p");
  cta.className = "repo-cta";
  cta.textContent = "Clique aqui para acessar o repositório";

  card.append(title, desc, meta, cta);
  link.appendChild(card);
  return link;
}

function renderRepoCards(repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    el.repoCountNote.textContent = "Nenhum repositório encontrado";
    el.repoCards.innerHTML = "";

    const emptyCard = document.createElement("article");
    emptyCard.className = "repo-card empty";
    emptyCard.innerHTML = '<p class="label">Nenhum repositório público disponível.</p>';
    el.repoCards.appendChild(emptyCard);
    return;
  }

  el.repoCountNote.textContent = `${repos.length} repositório(s) encontrados`;
  el.repoCards.innerHTML = "";

  const fragment = document.createDocumentFragment();
  repos.forEach((repo) => {
    fragment.appendChild(createRepoCard(repo));
  });
  el.repoCards.appendChild(fragment);
}

function buildStars(percentage) {
  const totalStars = 5;
  const filledStars = Math.max(1, Math.round((percentage / 100) * totalStars));
  const fragment = document.createDocumentFragment();

  for (let i = 1; i <= totalStars; i += 1) {
    const star = document.createElement("span");
    star.className = i <= filledStars ? "skill-star filled" : "skill-star";
    star.textContent = "★";
    fragment.appendChild(star);
  }

  return fragment;
}

function analyzeSkillsFromRepos(repos) {
  const languageStats = {};
  const languageRepoCount = {};
  const technologyStats = {
    Git: 12,
    GitHub: 10,
    "API REST": 6
  };
  let totalLanguageBytes = 0;

  repos
    .filter((repo) => !repo.fork)
    .forEach((repo) => {
      const repoBytes = Math.max(Number(repo.size || 0), 1) * 1024;
      const repoText = `${repo.name || ""} ${repo.description || ""}`.toLowerCase();
      const language = repo.language;

      if (language) {
        languageStats[language] = (languageStats[language] || 0) + repoBytes;
        languageRepoCount[language] = (languageRepoCount[language] || 0) + 1;
        totalLanguageBytes += repoBytes;

        if (language === "JavaScript" || language === "TypeScript") {
          technologyStats["Node.js"] = (technologyStats["Node.js"] || 0) + 9;
          technologyStats.React = (technologyStats.React || 0) + 5;
        }
        if (language === "HTML") {
          technologyStats.CSS = (technologyStats.CSS || 0) + 8;
          technologyStats.Bootstrap = (technologyStats.Bootstrap || 0) + 4;
        }
        if (language === "CSS") {
          technologyStats.HTML = (technologyStats.HTML || 0) + 7;
        }
        if (language === "PHP") {
          technologyStats.SQL = (technologyStats.SQL || 0) + 6;
        }
      }

      if (repoText.includes("firebase")) {
        technologyStats.Firebase = (technologyStats.Firebase || 0) + 11;
      }
      if (repoText.includes("api")) {
        technologyStats["API REST"] = (technologyStats["API REST"] || 0) + 8;
      }
      if (repoText.includes("express")) {
        technologyStats["Express.js"] = (technologyStats["Express.js"] || 0) + 7;
      }
      if (repoText.includes("docker")) {
        technologyStats.Docker = (technologyStats.Docker || 0) + 8;
      }
    });

  const mergedSkills = [];
  const languageEntries = Object.entries(languageStats);

  languageEntries.forEach(([language, bytes]) => {
    const distributionPercent = totalLanguageBytes > 0 ? (bytes / totalLanguageBytes) * 100 : 0;
    const diversityBonus = Math.min((languageRepoCount[language] || 1) * 5, 20);
    const finalPercent = Math.min(Math.round(distributionPercent * 0.8 + diversityBonus), 100);

    if (finalPercent < 4) return;

    mergedSkills.push({
      name: language,
      percentage: Math.max(8, finalPercent),
      type: "Linguagem",
      metric: formatBytes(bytes),
      description: getSkillDescription(language)
    });
  });

  const maxTechScore = Math.max(...Object.values(technologyStats), 1);
  Object.entries(technologyStats).forEach(([tech, score]) => {
    const techPercent = Math.min(Math.max(Math.round((score / maxTechScore) * 92), 10), 96);
    mergedSkills.push({
      name: tech,
      percentage: techPercent,
      type: "Tecnologia",
      metric: `Score ${score}`,
      description: getSkillDescription(tech)
    });
  });

  return mergedSkills
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 14);
}

function createSkillCard(skill) {
  const card = document.createElement("article");
  card.className = "skill-card";

  const color = getSkillColor(skill.name);
  const iconClass = getSkillIcon(skill.name);
  const rgb = hexToRgb(color);

  const header = document.createElement("div");
  header.className = "skill-header";

  const iconBadge = document.createElement("span");
  iconBadge.className = "skill-icon";
  iconBadge.style.backgroundColor = `rgba(${rgb}, 0.16)`;
  iconBadge.style.borderColor = `rgba(${rgb}, 0.45)`;

  const icon = document.createElement("i");
  icon.className = iconClass;
  icon.style.color = color;
  iconBadge.appendChild(icon);

  const title = document.createElement("h3");
  title.textContent = skill.name;
  header.append(iconBadge, title);

  const level = document.createElement("div");
  level.className = "skill-level";
  const levelLabel = document.createElement("span");
  levelLabel.className = "skill-level-label";
  levelLabel.textContent = "Proficiência";
  const levelStars = document.createElement("div");
  levelStars.className = "skill-stars";
  levelStars.appendChild(buildStars(skill.percentage));
  level.append(levelLabel, levelStars);

  const bar = document.createElement("div");
  bar.className = "skill-bar";
  const progress = document.createElement("div");
  progress.className = "skill-progress";
  progress.style.width = `${skill.percentage}%`;
  progress.style.background = `linear-gradient(90deg, ${color}, ${color}cc)`;
  bar.appendChild(progress);

  const percent = document.createElement("p");
  percent.className = "skill-percentage";
  percent.style.color = color;
  percent.textContent = `${skill.percentage}%`;

  const description = document.createElement("p");
  description.className = "skill-description";
  description.textContent = skill.description;

  const details = document.createElement("div");
  details.className = "skill-details";

  const metric = document.createElement("span");
  metric.className = "skill-metric";
  metric.textContent = skill.metric;

  const type = document.createElement("span");
  type.className = "skill-type";
  type.style.borderColor = `rgba(${rgb}, 0.45)`;
  type.textContent = skill.type;

  details.append(metric, type);
  card.append(header, level, bar, percent, description, details);

  return card;
}

function renderSkillsCards(repos) {
  if (!el.skillsGrid || !el.skillsLoading || !el.skillsCountNote) return;

  const skills = analyzeSkillsFromRepos(repos);
  el.skillsLoading.style.display = "none";
  el.skillsGrid.innerHTML = "";

  if (!skills.length) {
    el.skillsCountNote.textContent = "Sem skills detectadas";
    const empty = document.createElement("article");
    empty.className = "skill-card empty";
    empty.innerHTML = "<p class='label'>Não foi possível calcular skills com os dados atuais.</p>";
    el.skillsGrid.appendChild(empty);
    return;
  }

  el.skillsCountNote.textContent = `${skills.length} skill(s) mapeadas`;
  const fragment = document.createDocumentFragment();

  skills.forEach((skill) => {
    fragment.appendChild(createSkillCard(skill));
  });

  el.skillsGrid.appendChild(fragment);
}

function rateLimitMessage(response) {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");

  if (remaining !== "0" || !reset) {
    return "Falha ao buscar dados da API.";
  }

  const resetDate = new Date(Number(reset) * 1000);
  return `Limite da API atingido. Tenta novamente às ${formatDate(resetDate.toISOString())}.`;
}

async function fetchGithubJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Usuário '${username}' não encontrado.`);
    }

    if (response.status === 403) {
      throw new Error(rateLimitMessage(response));
    }

    throw new Error(`Erro HTTP ${response.status} ao consultar GitHub.`);
  }

  return response.json();
}

async function fetchProfile() {
  el.status.textContent = "Consultando API GitHub...";

  try {
    const profileUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
    const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    const [profile, repos] = await Promise.all([fetchGithubJson(profileUrl), fetchGithubJson(reposUrl)]);

    updateUI(profile);
    renderRepoCards(repos);
    renderSkillsCards(repos);
    el.status.textContent = "Online";
  } catch (error) {
    el.status.textContent = "Erro";
    el.bio.textContent = error.message;
    el.repoCountNote.textContent = "Falha ao carregar";
    if (el.skillsCountNote) el.skillsCountNote.textContent = "Falha ao analisar";
    if (el.skillsLoading) el.skillsLoading.style.display = "none";
    console.error("Erro API GitHub:", error);
  }
}

fetchProfile();
setInterval(fetchProfile, refreshMs);
