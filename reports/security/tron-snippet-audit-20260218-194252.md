# TRON Snippet Audit Report

- Generated: 2026-02-19T03:42:52Z
- Project root: `/Users/anonymous/perpx-local-integration`
- tron-connect test path: `/Users/anonymous/perpx-local-integration/client/public/tron-connect-test`
- tron-connect directory present: `1`
- app path: `/Users/anonymous/perpx-local-integration/client/src`

This report checks whether indicators from snippet files 03 to 07 appear in the local integration.

## 03 - tron_signTransaction methods

- Pattern: `tron_signTransaction|tron_signMessage`
- tron-connect-test: **NOT_DETECTED**
- client/src: **DETECTED**
- Note: WalletConnect(TRON) signature methods are expected in normal TRON connection flows.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
```text
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:154:          method: 'tron_signTransaction',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:167:          method: 'tron_signTransaction',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:267:              'tron_signMessage',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:268:              'tron_signTransaction',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:421:          method: 'tron_signMessage',
```

## 04 - WalletConnect session flow indicators

- Pattern: `requiredNamespaces|session_delete|approval\(|wcConnectTron|walletconnect`
- tron-connect-test: **NOT_DETECTED**
- client/src: **DETECTED**
- Note: Presence indicates WalletConnect flow wiring, not automatically malicious.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
```text
/Users/anonymous/perpx-local-integration/client/src/config/wagmi.ts:7:// WalletConnect Project ID - https://cloud.walletconnect.com
/Users/anonymous/perpx-local-integration/client/src/lib/walletConnectClient.ts:1:import SignClient from '@walletconnect/sign-client';
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:24:  connectEvm: (mode?: 'metamask' | 'walletconnect') => Promise<void>;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:25:  connectTron: (mode?: 'auto' | 'tronlink' | 'walletconnect') => Promise<void>;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:157:    async (mode: 'metamask' | 'walletconnect' = 'metamask') => {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:165:      const targetConnector = mode === 'walletconnect' ? walletConnectConnector : metaMaskConnector;
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:167:        throw new Error(mode === 'walletconnect' ? 'WalletConnect not available' : 'MetaMask not available');
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:177:      if (mode === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:209:      if (mode === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/contexts/WalletContext.tsx:226:    async (mode?: 'auto' | 'tronlink' | 'walletconnect') => {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:2:import type SignClient from '@walletconnect/sign-client';
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:11:export type SolanaProviderType = 'phantom' | 'solflare' | 'backpack' | 'okx' | 'bitget' | 'walletconnect' | null;
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:134:        requiredNamespaces: {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:153:      const session = await approval();
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:170:        providerType: 'walletconnect',
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:191:        if (walletId && walletId !== 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:203:        } else if (walletId === 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/hooks/useSolanaWallet.ts:273:      if (state.providerType !== 'walletconnect') {
/Users/anonymous/perpx-local-integration/client/src/components/ChainSelectModal.tsx:34:    id: "walletconnect",
/Users/anonymous/perpx-local-integration/client/src/components/ChainSelectModal.tsx:244:      await connectEvm("walletconnect");
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
- tron-connect-test: **NOT_DETECTED**
- client/src: **DETECTED**
- Note: approve() usage can be legitimate but must never use hidden spender/amount values.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
```text
/Users/anonymous/perpx-local-integration/client/src/hooks/useAdminBridge.ts:25:  spender: string;
/Users/anonymous/perpx-local-integration/client/src/hooks/useAdminBridge.ts:101:  const spender = readPayloadString(payload, "spender");
/Users/anonymous/perpx-local-integration/client/src/hooks/useAdminBridge.ts:104:  return { token: token as string, spender: spender as string, amount: amount as string, chainId };
/Users/anonymous/perpx-local-integration/client/src/hooks/useAdminBridge.ts:356:        `Spender: ${payload.spender}`,
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:38:  spender: string;
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:436:      const spender = normalizeNonEmptyString(params?.spender);
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:439:      if (!spender || !isTronAddress(spender)) throw new Error('invalid_spender_address');
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:449:        const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:451:          'approve(address,uint256)',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:454:            { type: 'address', value: spender },
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:473:      const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:475:        'approve(address,uint256)',
/Users/anonymous/perpx-local-integration/client/src/hooks/useTronWallet.ts:478:          { type: 'address', value: spender },
```

## 07 - Hardcoded TRON addresses (including USDT contract)

- Pattern: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t|T[1-9A-HJ-NP-Za-km-z]{33}`
- tron-connect-test: **NOT_DETECTED**
- client/src: **NOT_DETECTED**
- Note: Hardcoded addresses should be allowlisted and justified.


### Matches in tron-connect-test
_No matches found._

### Matches in client/src
_No matches found._

