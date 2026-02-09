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
  followers: document.getElementById("followers"),
  following: document.getElementById("following"),
  githubUpdated: document.getElementById("githubUpdated"),
  syncedAt: document.getElementById("syncedAt"),
  status: document.getElementById("status")
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
  el.followers.textContent = String(profile.followers ?? 0);
  el.following.textContent = String(profile.following ?? 0);
  el.githubUpdated.textContent = formatDate(profile.updated_at);
  el.syncedAt.textContent = formatDate(new Date().toISOString());
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

async function fetchProfile() {
  el.status.textContent = "Consultando API GitHub...";

  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
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

    const profile = await response.json();
    updateUI(profile);
    el.status.textContent = "Online";
  } catch (error) {
    el.status.textContent = "Erro";
    el.bio.textContent = error.message;
    console.error("Erro API GitHub:", error);
  }
}

fetchProfile();
setInterval(fetchProfile, refreshMs);
