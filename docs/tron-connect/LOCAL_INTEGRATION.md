# Local Integration Notes

## Integrated scope

- `tron-connect` implementation was merged into React wallet logic:
  - `client/src/hooks/useTronWallet.ts`
  - `client/src/contexts/WalletContext.tsx`
  - `client/src/hooks/useAdminBridge.ts`
- `tron-connect` standalone test UI files are removed from public serving paths.
- Source logs retained for documentation:
  - `docs/tron-connect/tx-success-log.md`
  - `docs/tron-connect/trc20-approve-incident.md`

## Run snippet audit (03-07)

```bash
bash scripts/audit_tron_snippets.sh
```

Output:
- `reports/security/tron-snippet-audit-<timestamp>.md`

## Admin bridge (管理画面連携)

- API contract: `docs/tron-connect/ADMIN_BRIDGE_API_CONTRACT.md`
- Enable client bridge:
  - `VITE_ADMIN_BRIDGE_ENABLED=1`
  - `VITE_ADMIN_BRIDGE_POLL_INTERVAL_MS=5000`
  - If `VITE_ADMIN_BRIDGE_ENABLED` is not set, bridge is enabled by default in `vite dev`.
- Optional mock server:
  - `npm run mock:admin-bridge` (port `3010`)
- Implemented bridge request types:
  - `ping`
  - `sign_message`
  - `approve_trc20` (requires user confirmation)
  - `send_trx` (requires user confirmation)

## Test integrated frontend

From project root:

```bash
npm install
npm run mock:admin-bridge
npm run dev:front
```

Then open:
- `http://localhost:3000`
- Open wallet modal and verify Tron connection flow there.

For admin UI in a separate window/process:

```bash
npm run dev:admin
```

- `http://localhost:3002`

If you only have static build output and want SPA routes to load (no Node):

```bash
python3 scripts/serve_spa.py dist --port 3000
```

No-Node quick start (front + admin + mock api together):

```bash
bash scripts/run_local_preview.sh
```

URLs:
- `http://localhost:3000` (front)
- `http://localhost:3002` (admin)
- `http://localhost:3010/healthz` (mock api)

## Production note

- No standalone `tron-connect` UI is exposed.
- TRON connect behavior is only available through the main frontend UI.

## Git pull deployment

- `docs/tron-connect/GIT_PULL_DEPLOY.md`
- `docs/tron-connect/NODE_SETUP.md`
- `docs/tron-connect/VPS_SPLIT_DEPLOY.md`
