import { useState, useCallback, useRef, useEffect } from 'react';
import type SignClient from '@walletconnect/sign-client';
import { getWalletConnectClient } from '@/lib/walletConnectClient';
import {
  TRON_CHAINS,
  TRON_CHAIN_NAMES,
  TRON_EXPLORERS,
  TRON_FULL_NODES,
  isTronAddress,
  isMobileDevice,
  TRON_MOBILE_WALLETS,
} from '@/config/walletConstants';
import { getWalletConnectionErrorMessage } from '@/lib/walletConnectionError';

export type TronProviderType = 'walletconnect' | 'extension' | null;

export interface TronWalletState {
  address: string | null;
  chainId: string | null;
  chainName: string | null;
  isConnected: boolean;
  providerType: TronProviderType;
  isPending: boolean;
  error: string | null;
}

interface UseTronWalletReturn extends TronWalletState {
  connect: (mode?: 'auto' | 'tronlink' | 'walletconnect') => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  approveTrc20: (params: TronApproveParams) => Promise<TronTxResult>;
  sendTrx: (params: TronSendTrxParams) => Promise<TronTxResult>;
  wcUri: string | null;
}

export interface TronApproveParams {
  token: string;
  spender: string;
  amount: string;
  chainId?: string | null;
}

export interface TronSendTrxParams {
  to: string;
  amountTrx: string;
  chainId?: string | null;
}

export interface TronTxResult {
  txid: string;
  explorerUrl: string | null;
}

// Extend Window for TronLink
declare global {
  interface Window {
    tronLink?: {
      request: (args: { method: string }) => Promise<any>;
      ready?: boolean;
      tronWeb?: any;
    };
    tronWeb?: any;
  }
}

export function useTronWallet(): UseTronWalletReturn {
  const [state, setState] = useState<TronWalletState>({
    address: null,
    chainId: null,
    chainName: null,
    isConnected: false,
    providerType: null,
    isPending: false,
    error: null,
  });
  const [wcUri, setWcUri] = useState<string | null>(null);
  const signClientRef = useRef<SignClient | null>(null);
  const sessionRef = useRef<any>(null);
  const approvalRef = useRef<Promise<any> | null>(null);

  const getTronWeb = () => {
    return window.tronWeb || window.tronLink?.tronWeb || null;
  };

  const hasTronExtension = () => {
    return typeof window !== 'undefined' && (!!window.tronLink || !!window.tronWeb);
  };

  const normalizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const ensureTronConnected = () => {
    if (!state.address || !state.providerType) {
      throw new Error('Not connected to TRON wallet');
    }
  };

  const ensureChainMatch = (expectedChainId?: string | null) => {
    if (!expectedChainId) return;
    if (!state.chainId) return;
    if (expectedChainId !== state.chainId) {
      throw new Error(`chain_mismatch_current_${state.chainId}_requested_${expectedChainId}`);
    }
  };

  const resolveExplorerUrl = (chainId: string, txid: string): string | null => {
    const base = TRON_EXPLORERS[chainId] || TRON_EXPLORERS[TRON_CHAINS.mainnet];
    if (!base || !txid) return null;
    return `${base}/#/transaction/${txid}`;
  };

  const extractTxid = (result: any): string | null => {
    const candidates = [
      result?.txid,
      result?.transaction?.txID,
      result?.transaction?.txid,
      result?.txID,
      result?.id,
    ];

    for (const value of candidates) {
      const normalized = normalizeNonEmptyString(value);
      if (normalized) return normalized;
    }
    return null;
  };

  const extractSessionAccount = (session: any): { chainId: string; address: string } | null => {
    const tronAccounts: string[] = session?.namespaces?.tron?.accounts || [];

    const allAccounts: string[] = tronAccounts.length
      ? tronAccounts
      : Object.values(session?.namespaces || {})
          .flatMap((ns: any) => (Array.isArray(ns?.accounts) ? ns.accounts : []))
          .filter((account: unknown): account is string => typeof account === 'string');

    for (const account of allAccounts) {
      const parts = account.split(':');
      if (parts.length < 3) continue;
      const address = normalizeNonEmptyString(parts[parts.length - 1]);
      const chainId = normalizeNonEmptyString(parts.slice(0, 2).join(':'));
      if (!address || !chainId) continue;
      if (!isTronAddress(address)) continue;
      return { chainId, address };
    }

    return null;
  };

  const createReadonlyTronWeb = async (chainId: string): Promise<any> => {
    const mod: any = await import('tronweb');
    const TronWebCtor = mod?.default || mod?.TronWeb || mod;
    const fullHost = TRON_FULL_NODES[chainId] || TRON_FULL_NODES[TRON_CHAINS.mainnet];
    return new TronWebCtor({ fullHost });
  };

  const requestWalletConnectSignature = async (
    transaction: any,
    chainId: string
  ): Promise<any> => {
    if (!signClientRef.current || !sessionRef.current || !state.address) {
      throw new Error('WalletConnect session not available');
    }

    const signClient = signClientRef.current;
    const topic = sessionRef.current.topic;

    try {
      const result: any = await signClient.request({
        topic,
        chainId,
        request: {
          method: 'tron_signTransaction',
          params: {
            address: state.address,
            transaction,
          },
        },
      });
      return result?.result || result;
    } catch {
      const fallback: any = await signClient.request({
        topic,
        chainId,
        request: {
          method: 'tron_signTransaction',
          params: {
            address: state.address,
            transaction: { transaction },
          },
        },
      });
      return fallback?.result || fallback;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (signClientRef.current && sessionRef.current) {
        try {
          signClientRef.current.disconnect({
            topic: sessionRef.current.topic,
            reason: { code: 6000, message: 'User disconnected' },
          });
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Connect via browser extension (TronLink under the hood, but UI should say "Browser Extension")
  const connectExtension = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: null }));
    setWcUri(null);

    if (!hasTronExtension()) {
      const err = new Error('Browser extension not detected. Please install a Tron-compatible extension.');
      setState((prev) => ({
        ...prev,
        isPending: false,
        error: getWalletConnectionErrorMessage(err),
      }));
      throw err;
    }

    try {
      if (window.tronLink?.request) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
      }

      // Wait briefly for tronWeb to populate
      let tronWeb = getTronWeb();
      let address = tronWeb?.defaultAddress?.base58;
      for (let i = 0; i < 10 && !address; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        tronWeb = getTronWeb();
        address = tronWeb?.defaultAddress?.base58;
      }

      if (!tronWeb || !address) {
        throw new Error('Failed to read address from extension');
      }

      // Try to infer chain from full node host
      const nodeHost = tronWeb.fullNode?.host || '';
      const chainId =
        Object.entries(TRON_FULL_NODES).find(([, host]) => nodeHost.startsWith(host))?.[0] ||
        TRON_CHAINS.mainnet;

      setState({
        address,
        chainId,
        chainName: TRON_CHAIN_NAMES[chainId] || 'Tron',
        isConnected: true,
        providerType: 'extension',
        isPending: false,
        error: null,
      });
    } catch (err: any) {
      const message = getWalletConnectionErrorMessage(err);
      setState((prev) => ({
        ...prev,
        isPending: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  // Connect via WalletConnect v2
  // This creates a URI for QR code display and waits for approval in background
  const connectWalletConnect = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: null }));

    try {
      const client = await getWalletConnectClient();
      signClientRef.current = client;

      if (sessionRef.current?.topic && state.address && state.providerType === 'walletconnect') {
        setState((prev) => ({ ...prev, isPending: false, error: null }));
        return;
      }

      const { uri, approval } = await client.connect({
        optionalNamespaces: {
          tron: {
            chains: [TRON_CHAINS.mainnet],
            methods: [
              'tron_signMessage',
              'tron_signTransaction',
              'tron_sign',
            ],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      if (uri) {
        setWcUri(uri);

        // On mobile, try to open wallet app
        if (isMobileDevice()) {
          const wallet = TRON_MOBILE_WALLETS[0]; // Trust Wallet as default
          if (wallet) {
            const encodedUri = encodeURIComponent(uri);
            window.location.href = `${wallet.deepLink}?uri=${encodedUri}`;
          }
        }
      }

      // Store approval promise and wait for it
      if (typeof approval !== 'function') {
        throw new Error('walletconnect_approval_unavailable');
      }

      approvalRef.current = approval();
      const session = await approvalRef.current;
      sessionRef.current = session;
      setWcUri(null);
      approvalRef.current = null;

      const sessionAccount = extractSessionAccount(session);
      if (!sessionAccount) {
        throw new Error('No Tron accounts found in WalletConnect session');
      }

      setState({
        address: sessionAccount.address,
        chainId: sessionAccount.chainId,
        chainName: TRON_CHAIN_NAMES[sessionAccount.chainId] || 'Unknown',
        isConnected: true,
        providerType: 'walletconnect',
        isPending: false,
        error: null,
      });
    } catch (err: any) {
      console.error('[tron-wallet] walletconnect_connect_failed', err);
      const message = getWalletConnectionErrorMessage(err);
      setState((prev) => ({
        ...prev,
        isPending: false,
        error: message,
      }));
      throw err;
    }
  }, [state.address, state.providerType]);

  // Main connect function
  const connect = useCallback(
    async (mode: 'auto' | 'tronlink' | 'walletconnect' = 'auto') => {
      setState((prev) => ({ ...prev, isPending: true, error: null }));
      try {
        if (mode === 'tronlink') {
          await connectExtension();
          return;
        }
        if (mode === 'walletconnect') {
          await connectWalletConnect();
          return;
        }
        // Auto (production default): prefer WalletConnect first, then extension fallback.
        try {
          await connectWalletConnect();
          return;
        } catch (walletConnectError) {
          if (hasTronExtension() && !isMobileDevice()) {
            await connectExtension();
            return;
          }
          throw walletConnectError;
        }
      } catch (err: any) {
        const message = getWalletConnectionErrorMessage(err);
        setState((prev) => ({
          ...prev,
          isPending: false,
          error: message,
        }));
        throw err;
      }
    },
    [connectExtension, connectWalletConnect]
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    if (signClientRef.current && sessionRef.current) {
      try {
        await signClientRef.current.disconnect({
          topic: sessionRef.current.topic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      } catch {
        // ignore
      }
      signClientRef.current = null;
      sessionRef.current = null;
    }
    approvalRef.current = null;
    setWcUri(null);
    setState({
      address: null,
      chainId: null,
      chainName: null,
      isConnected: false,
      providerType: null,
      isPending: false,
      error: null,
    });
  }, []);

  // Sign message
  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!state.address || !state.providerType) {
        throw new Error('Not connected');
      }

      if (state.providerType === 'extension') {
        const tronWeb = getTronWeb();
        if (!tronWeb) throw new Error('TronWeb not available');

        // Use signMessageV2 (recommended by TronLink docs)
        const signFn =
          tronWeb.trx?.signMessageV2 || tronWeb.trx?.signMessage;
        if (typeof signFn !== 'function') {
          throw new Error('TronWeb sign method not available');
        }
        const signature = await signFn.call(tronWeb.trx, message);
        return signature;
      }

      // WalletConnect path
      if (!signClientRef.current || !sessionRef.current) {
        throw new Error('WalletConnect session not available');
      }

      try {
        const result = await signClientRef.current.request({
          topic: sessionRef.current.topic,
          chainId: state.chainId || TRON_CHAINS.mainnet,
          request: {
            method: 'tron_signMessage',
            params: { message, address: state.address },
          },
        });
        return typeof result === 'string' ? result : (result as any)?.signature || null;
      } catch {
        const fallback = await signClientRef.current.request({
          topic: sessionRef.current.topic,
          chainId: state.chainId || TRON_CHAINS.mainnet,
          request: {
            method: 'tron_sign',
            params: {
              address: state.address,
              message,
            },
          },
        });
        return typeof fallback === 'string'
          ? fallback
          : (fallback as any)?.signature || (fallback as any)?.result || null;
      }
    },
    [state.address, state.providerType, state.chainId]
  );

  const approveTrc20 = useCallback(
    async (params: TronApproveParams): Promise<TronTxResult> => {
      ensureTronConnected();

      const token = normalizeNonEmptyString(params?.token);
      const spender = normalizeNonEmptyString(params?.spender);
      const amount = normalizeNonEmptyString(params?.amount);
      if (!token || !isTronAddress(token)) throw new Error('invalid_token_address');
      if (!spender || !isTronAddress(spender)) throw new Error('invalid_spender_address');
      if (!amount || !/^\d+$/.test(amount)) throw new Error('invalid_uint256_amount');

      ensureChainMatch(params?.chainId);

      const chainId = state.chainId || TRON_CHAINS.mainnet;
      if (state.providerType === 'extension') {
        const tronWeb = getTronWeb();
        if (!tronWeb) throw new Error('TronWeb not available');

        const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
          token,
          'approve(address,uint256)',
          { feeLimit: 1e8, callValue: 0 },
          [
            { type: 'address', value: spender },
            { type: 'uint256', value: amount },
          ],
          state.address
        );
        if (!triggerResult?.transaction) throw new Error('approve_build_failed');

        const signed = await tronWeb.trx.sign(triggerResult.transaction);
        const broadcast = await tronWeb.trx.sendRawTransaction(signed);
        const txid = extractTxid(broadcast);
        if (!txid) throw new Error('approve_broadcast_failed');

        return {
          txid,
          explorerUrl: resolveExplorerUrl(chainId, txid),
        };
      }

      const tronWeb = await createReadonlyTronWeb(chainId);
      const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
        token,
        'approve(address,uint256)',
        { feeLimit: 1e8, callValue: 0 },
        [
          { type: 'address', value: spender },
          { type: 'uint256', value: amount },
        ],
        state.address
      );
      if (!triggerResult?.transaction) throw new Error('approve_build_failed');

      const signed = await requestWalletConnectSignature(triggerResult.transaction, chainId);
      const broadcast = await tronWeb.trx.sendRawTransaction(signed);
      const txid = extractTxid(broadcast);
      if (!txid) throw new Error('approve_broadcast_failed');

      return {
        txid,
        explorerUrl: resolveExplorerUrl(chainId, txid),
      };
    },
    [state.address, state.chainId, state.providerType]
  );

  const sendTrx = useCallback(
    async (params: TronSendTrxParams): Promise<TronTxResult> => {
      ensureTronConnected();

      const to = normalizeNonEmptyString(params?.to);
      const amountTrx = normalizeNonEmptyString(params?.amountTrx);
      if (!to || !isTronAddress(to)) throw new Error('invalid_to_address');
      if (!amountTrx || !/^\d+(\.\d+)?$/.test(amountTrx)) throw new Error('invalid_trx_amount');

      ensureChainMatch(params?.chainId);

      const chainId = state.chainId || TRON_CHAINS.mainnet;
      if (state.providerType === 'extension') {
        const tronWeb = getTronWeb();
        if (!tronWeb) throw new Error('TronWeb not available');

        const amountSun = tronWeb.toSun ? tronWeb.toSun(amountTrx) : Math.floor(Number(amountTrx) * 1e6);
        const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, state.address);
        const signed = await tronWeb.trx.sign(tx);
        const broadcast = await tronWeb.trx.sendRawTransaction(signed);
        const txid = extractTxid(broadcast);
        if (!txid) throw new Error('send_trx_broadcast_failed');

        return {
          txid,
          explorerUrl: resolveExplorerUrl(chainId, txid),
        };
      }

      const tronWeb = await createReadonlyTronWeb(chainId);
      const amountSun = tronWeb.toSun ? tronWeb.toSun(amountTrx) : Math.floor(Number(amountTrx) * 1e6);
      const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, state.address);
      const signed = await requestWalletConnectSignature(tx, chainId);
      const broadcast = await tronWeb.trx.sendRawTransaction(signed);
      const txid = extractTxid(broadcast);
      if (!txid) throw new Error('send_trx_broadcast_failed');

      return {
        txid,
        explorerUrl: resolveExplorerUrl(chainId, txid),
      };
    },
    [state.address, state.chainId, state.providerType]
  );

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
    approveTrc20,
    sendTrx,
    wcUri,
  };
}
