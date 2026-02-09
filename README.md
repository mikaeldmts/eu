# GitHub Profile Realtime Dashboard

Dashboard local com dados diretos da API pública do GitHub (sem Firebase para exibição).

## Como rodar localmente
1. Instale dependências:
   - `npm install`
2. Inicie o servidor local com recarregamento automático:
   - `npm run dev`
   - ou `npm run dev:open` (abre o navegador sozinho)
3. Abra:
   - `http://127.0.0.1:5500`

## Configuração do dashboard
Edite `config.js`:
- `githubUsername`: usuário alvo do GitHub
- `refreshSeconds`: intervalo de atualização (ex.: 60)

## (Opcional) Sincronizar perfil para Firestore
Se quiser voltar ao fluxo com Firestore no futuro, o script ainda existe:
1. Copie `.env.example` para `.env.local`.
2. Preencha no `.env.local`:
   - `GH_USERNAME` (ex.: `mikaeldmts`)
   - `GH_PROFILE_PAT` (opcional, mas recomendado para evitar limite da API)
   - `FIREBASE_SERVICE_ACCOUNT_PATH=service-account.json`
3. Coloque o arquivo da service account na raiz do projeto com nome:
   - `service-account.json`
4. (Opcional) Em vez de arquivo, você também pode usar:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON completo em uma linha)
5. Rode:
   - `npm run sync:profile`

Isso grava/atualiza o documento:
- `profiles/mikaeldmts`

## Estrutura principal
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `firestore.rules`
- `FIRESTORE_RULES_PARA_COLAR.txt`
- `scripts/sync-profile.mjs`
- `.env.example`

## Observações de custo (free)
- Firestore Spark tem limites diários.
- Leitura em tempo real gera leituras conforme usuários conectados.
- Como a escrita é manual (`npm run sync:profile`), você controla custo facilmente.
