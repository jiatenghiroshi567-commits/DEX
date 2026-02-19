# Admin Bridge API Contract (UI <-> 管理画面)

`WalletConnect(TRON)` を前提に、UI 側は以下の HTTP API を利用します。

## Environment

- `VITE_ADMIN_BRIDGE_ENABLED=1` で有効化
- `VITE_ADMIN_BRIDGE_POLL_INTERVAL_MS=5000` で管理リクエストの取得間隔を制御
- API base は `VITE_API_BASE_URL` を使用

## Endpoints

1. `POST /api/admin-bridge/sessions`
request:
```json
{
  "chain": "tron",
  "address": "T...",
  "walletProvider": "walletconnect",
  "userAgent": "..."
}
```
response:
```json
{
  "sessionId": "sess_xxx",
  "challenge": "optional challenge text"
}
```

2. `POST /api/admin-bridge/sessions/:sessionId/verify`
request:
```json
{
  "chain": "tron",
  "address": "T...",
  "message": "...",
  "signature": "..."
}
```

3. `POST /api/admin-bridge/events`
request:
```json
{
  "sessionId": "sess_xxx",
  "eventType": "wallet_connected",
  "chain": "tron",
  "address": "T...",
  "payload": {}
}
```

4. `GET /api/admin-bridge/requests?session_id=sess_xxx`
response:
```json
{
  "requests": [
    { "id": "req_1", "type": "ping", "payload": {} },
    { "id": "req_2", "type": "sign_message", "payload": { "message": "..." } },
    {
      "id": "req_3",
      "type": "approve_trc20",
      "payload": {
        "token": "T...",
        "spender": "T...",
        "amount": "1000000",
        "chainId": "tron:0x2b6653dc"
      }
    },
    {
      "id": "req_4",
      "type": "send_trx",
      "payload": {
        "to": "T...",
        "amountTrx": "0.1",
        "chainId": "tron:0x2b6653dc"
      }
    }
  ]
}
```

5. `POST /api/admin-bridge/requests/:requestId/result`
request:
```json
{
  "status": "success",
  "result": { "signature": "..." }
}
```
or
```json
{
  "status": "failed",
  "error": "reason"
}
```

## 実装済み request type

- `ping`
- `sign_message`
- `approve_trc20` (user confirmation required)
- `send_trx` (user confirmation required)

## 統計向けイベント例

- `wallet_connected`
- `session_verified`
- `approve_trc20_sent`
- `send_trx_sent`
- `request_failed`

## ローカル検証（モックAPI）

```bash
npm run mock:admin-bridge
```

フロント `.env`:
```bash
VITE_API_BASE_URL=http://localhost:3010
VITE_ADMIN_BRIDGE_ENABLED=1
```
