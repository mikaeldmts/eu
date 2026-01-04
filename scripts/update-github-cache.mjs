import { writeFile, mkdir } from 'node:fs/promises';

const username = process.env.GITHUB_USER || 'mikaeldmts';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('Missing GITHUB_TOKEN env (expected from secrets/vars GIT_HUB_API).');
  process.exit(1);
}

const headers = {
  Accept: 'application/vnd.github.v3+json',
  Authorization: `token ${token}`,
  'User-Agent': 'github-cache-bot'
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} ${res.statusText} for ${path} :: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const [profile, repos] = await Promise.all([
  gh(`/users/${username}`),
  gh(`/users/${username}/repos?sort=updated&per_page=10`)
]);

const payload = {
  generatedAt: new Date().toISOString(),
  username,
  profile,
  repos
};

await mkdir('assets/data', { recursive: true });
await writeFile('assets/data/github-cache.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log('Wrote assets/data/github-cache.json');
