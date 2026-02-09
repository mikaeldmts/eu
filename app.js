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
  repoCountNote: document.getElementById("repoCountNote")
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
    el.status.textContent = "Online";
  } catch (error) {
    el.status.textContent = "Erro";
    el.bio.textContent = error.message;
    el.repoCountNote.textContent = "Falha ao carregar";
    console.error("Erro API GitHub:", error);
  }
}

fetchProfile();
setInterval(fetchProfile, refreshMs);
