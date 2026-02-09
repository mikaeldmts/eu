import fs from "node:fs";
import admin from "firebase-admin";
import { config as loadEnv } from "dotenv";

if (fs.existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
}

const username = process.env.GH_USERNAME || "mikaeldmts";
const githubToken = process.env.GH_PROFILE_PAT || "";
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "service-account.json";

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "github-profile-realtime-dashboard"
};

if (githubToken) {
  headers.Authorization = `Bearer ${githubToken}`;
}

const profileResponse = await fetch(`https://api.github.com/users/${username}`, { headers });

if (!profileResponse.ok) {
  const body = await profileResponse.text();
  throw new Error(`Falha ao consultar GitHub (${profileResponse.status}): ${body}`);
}

const profile = await profileResponse.json();

let serviceAccount;

if (serviceAccountRaw) {
  serviceAccount = JSON.parse(serviceAccountRaw);
} else if (fs.existsSync(serviceAccountPath)) {
  const fileContent = fs.readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(fileContent);
} else {
  throw new Error(
    "Defina FIREBASE_SERVICE_ACCOUNT_JSON no .env.local ou crie service-account.json na raiz do projeto."
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const payload = {
  login: profile.login,
  name: profile.name,
  bio: profile.bio,
  avatarUrl: profile.avatar_url,
  htmlUrl: profile.html_url,
  publicRepos: profile.public_repos,
  followers: profile.followers,
  following: profile.following,
  githubUpdatedAt: profile.updated_at,
  syncedAt: admin.firestore.FieldValue.serverTimestamp()
};

await db.doc(`profiles/${username}`).set(payload, { merge: true });

console.log(`Perfil ${username} sincronizado em profiles/${username}`);
