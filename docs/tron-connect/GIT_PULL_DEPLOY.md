# Git Pull Deployment (VPS)

## 初回のみ

```bash
cd /var/www
git clone <your_repo_url> perpx-local-integration
cd perpx-local-integration
npm install
npm run build:split
```

## 更新時

```bash
cd /var/www/perpx-local-integration
git fetch --all --prune
git pull origin main
npm ci
npm run build:split
```

静的ファイルを反映:

```bash
bash scripts/deploy-static-split.sh
```

API を Node で常駐している場合のみ再起動:

```bash
pm2 restart perpx-admin-bridge-api
```

## 運用メモ

- デプロイ前にローカルで `npm run check` を通す
- `VITE_WALLETCONNECT_PROJECT_ID` は本番値を必ず設定
- 管理画面連携を使う場合のみ `VITE_ADMIN_BRIDGE_ENABLED=1`
- フロント/管理画面の分離構成は `docs/tron-connect/VPS_SPLIT_DEPLOY.md` を参照
