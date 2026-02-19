# Node Setup (Local + VPS)

## Local (macOS)

Option A: Node.js installer (recommended)
1. Download LTS `.pkg` from `https://nodejs.org/`
2. Install and reopen terminal
3. Verify:

```bash
node -v
npm -v
```

Expected: Node `20.x`+ and npm available.

## VPS (Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

## Project install/check

```bash
cd /path/to/perpx-local-integration/client
npm install
npm run dev
```

For type check:

```bash
cd /path/to/perpx-local-integration
npm run check
```
