# TRON Snippet Audit Report

- Generated: 2026-02-18T22:25:34Z
- Project root: `/Users/anonymous/perpx-local-integration`
- tron-connect test path: `/Users/anonymous/perpx-local-integration/client/public/tron-connect-test`
- app path: `/Users/anonymous/perpx-local-integration/client/src`

This report checks whether indicators from snippet files 03 to 07 appear in the local integration.

## 03 - tron_signTransaction methods

- Pattern: `tron_signTransaction|tron_signMessage`
- tron-connect-test: **DETECTED**
- client/src: **DETECTED**
- Note: WalletConnect(TRON) signature methods are expected in normal TRON connection flows.


### Matches in tron-connect-test
```text
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/walletconnect.js:1:import{WalletConnectWallet as y,WalletConnectClient as O}from"https://esm.sh/@tronweb3/walletconnect-tron@4.0.1?bundle";import{DEFAULT_TRON_CHAIN as m,TRON_MAINNET as I,TRON_SHASTA as W,TRON_NILE as E,WALLETCONNECT_PROJE [... omitted end of long line]
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/index.html:107:      </html>`;T.document.open(),T.document.write(o),T.document.close(),I&&clearTimeout(I),I=setTimeout(()=>L(),12e4)}function L(){T&&!T.closed&&T.close(),T=null,F="",H=!1,j=null,I&&clearTimeout(I)}function r(e,t,n={}){c [... omitted end of long line]
```

### Matches in client/src
```text
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:156:              'tron_signMessage',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:157:              'tron_signTransaction',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:305:          method: 'tron_signMessage',
```

## 04 - WalletConnect session flow indicators

- Pattern: `requiredNamespaces|session_delete|approval\(|wcConnectTron|walletconnect`
- tron-connect-test: **DETECTED**
- client/src: **DETECTED**
- Note: Presence indicates WalletConnect flow wiring, not automatically malicious.


### Matches in tron-connect-test
```text
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/walletconnect.js:1:import{WalletConnectWallet as y,WalletConnectClient as O}from"https://esm.sh/@tronweb3/walletconnect-tron@4.0.1?bundle";import{DEFAULT_TRON_CHAIN as m,TRON_MAINNET as I,TRON_SHASTA as W,TRON_NILE as E,WALLETCONNECT_PROJE [... omitted end of long line]
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/index.html:79:<script type="module">import{TRON_MAINNET as P,TRON_SHASTA as X,TRON_NILE as Y,WALLETCONNECT_PROJECT_ID as Q,WALLETCONNECT_API_BASE as ae,WALLETCONNECT_SDK_TYPE as ce,WALLETCONNECT_SDK_VERSION as de,WALLETCONNECT_MOBILE_ [... omitted end of long line]
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/index.html:107:      </html>`;T.document.open(),T.document.write(o),T.document.close(),I&&clearTimeout(I),I=setTimeout(()=>L(),12e4)}function L(){T&&!T.closed&&T.close(),T=null,F="",H=!1,j=null,I&&clearTimeout(I)}function r(e,t,n={}){c [... omitted end of long line]
```

### Matches in client/src
```text
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:2:import type SignClient from '@walletconnect/sign-client';
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:11:export type SolanaProviderType = 'phantom' | 'solflare' | 'backpack' | 'okx' | 'bitget' | 'walletconnect' | null;
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:134:        requiredNamespaces: {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:153:      const session = await approval();
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:170:        providerType: 'walletconnect',
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:191:        if (walletId && walletId !== 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:203:        } else if (walletId === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:273:      if (state.providerType !== 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/config/wagmi.ts:7:// WalletConnect Project ID - https://cloud.walletconnect.com
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:19:  connectEvm: (mode?: 'metamask' | 'walletconnect') => Promise<void>;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:20:  connectTron: (mode?: 'auto' | 'tronlink' | 'walletconnect') => Promise<void>;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:149:    async (mode: 'metamask' | 'walletconnect' = 'metamask') => {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:157:      const targetConnector = mode === 'walletconnect' ? walletConnectConnector : metaMaskConnector;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:159:        throw new Error(mode === 'walletconnect' ? 'WalletConnect not available' : 'MetaMask not available');
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:169:      if (mode === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:201:      if (mode === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:218:    async (mode?: 'auto' | 'tronlink' | 'walletconnect') => {
/Users/anonymous/perpx-local-integration/client/src/lib/walletConnectClient.ts:1:import SignClient from '@walletconnect/sign-client';
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:2:import type SignClient from '@walletconnect/sign-client';
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:13:export type TronProviderType = 'walletconnect' | 'extension' | null;
```

## 05 - Max uint or excessive amount constants

- Pattern: `MAX_UINT|MaxUint|0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff|100000000000`
- tron-connect-test: **NOT_DETECTED**
- client/src: **NOT_DETECTED**
- Note: Large constants need manual review when tied to approve() calls.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
_No matches found._

## 06 - Spender/approve call indicators

- Pattern: `spender|approve\(address,uint256\)|approve\(|triggerSmartContract`
- tron-connect-test: **DETECTED**
- client/src: **NOT_DETECTED**
- Note: approve() usage can be legitimate but must never use hidden spender/amount values.


### Matches in tron-connect-test
```text
/Users/anonymous/perpx-local-integration/client/public/tron-connect-test/index.html:107:      </html>`;T.document.open(),T.document.write(o),T.document.close(),I&&clearTimeout(I),I=setTimeout(()=>L(),12e4)}function L(){T&&!T.closed&&T.close(),T=null,F="",H=!1,j=null,I&&clearTimeout(I)}function r(e,t,n={}){c [... omitted end of long line]
```

### Matches in client/src
_No matches found._

## 07 - Hardcoded TRON addresses (including USDT contract)

- Pattern: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t|T[1-9A-HJ-NP-Za-km-z]{33}`
- tron-connect-test: **NOT_DETECTED**
- client/src: **NOT_DETECTED**
- Note: Hardcoded addresses should be allowlisted and justified.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
_No matches found._

