import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { rewardsStorage, type ChainKind } from '@/lib/rewardsStorage';
import { detectMetaMaskAvailable, isPhantomEvmProvider } from '@/lib/evmProviders';
import {
  useTronWallet,
  type TronApproveParams,
  type TronSendTrxParams,
  type TronTxResult,
} from '@/hooks/useTronWallet';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';

export type ActiveChain = 'evm' | 'tron' | 'sol' | null;

interface WalletContextType {
  // Unified state
  isConnected: boolean;
  address: string | null;
  activeChain: ActiveChain;
  chainName: string | null;
  isPending: boolean;

  // Actions
  connectEvm: (mode?: 'metamask' | 'walletconnect') => Promise<void>;
  connectTron: (mode?: 'auto' | 'tronlink' | 'walletconnect') => Promise<void>;
  connectSolana: (walletId?: string) => Promise<void>;
  signActiveMessage: (message: string) => Promise<string | null>;
  executeTronApproveTrc20: (params: TronApproveParams) => Promise<TronTxResult>;
  executeTronSendTrx: (params: TronSendTrxParams) => Promise<TronTxResult>;
  disconnect: () => void;
  openChainSelect: () => void;

  // Chain select modal
  isChainSelectOpen: boolean;
  setChainSelectOpen: (open: boolean) => void;

  // Tron-specific
  tronWcUri: string | null;
  tronProviderType: string | null;

  // EVM-specific
  evmWcUri: string | null;

  // Solana-specific
  solanaWcUri: string | null;
  solanaWalletName: string | null;
  solanaAvailableWallets: Array<{ id: string; name: string; icon: string; available: boolean }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // EVM (wagmi only)
  const wagmiAccount = useAccount();
  const { connectAsync, connectors, isPending: evmConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const evmAddress = wagmiAccount.address || null;
  const evmConnected = wagmiAccount.isConnected;
  const [evmWcUri, setEvmWcUri] = useState<string | null>(null);
  const evmWcListenerRef = useRef<((uri: string) => void) | null>(null);

  // Tron
  const tron = useTronWallet();

  // Solana
  const solana = useSolanaWallet();

  // Chain select modal
  const [isChainSelectOpen, setChainSelectOpen] = useState(false);

  const [activeChain, setActiveChain] = useState<ActiveChain>(null);

  // Determine unified state
  const isPending = tron.isPending || solana.isPending || evmConnecting;
  const isConnected = evmConnected || tron.isConnected || solana.isConnected;

  let address: string | null = null;
  let chainName: string | null = null;
  let resolvedChain: ActiveChain = null;

  if (activeChain === 'evm' && evmConnected && evmAddress) {
    address = evmAddress;
    chainName = 'EVM';
    resolvedChain = 'evm';
  } else if (activeChain === 'tron' && tron.isConnected && tron.address) {
    address = tron.address;
    chainName = tron.chainName || 'Tron';
    resolvedChain = 'tron';
  } else if (activeChain === 'sol' && solana.isConnected && solana.address) {
    address = solana.address;
    chainName = solana.walletName || 'Solana';
    resolvedChain = 'sol';
  } else if (evmConnected && evmAddress) {
    address = evmAddress;
    chainName = 'EVM';
    resolvedChain = 'evm';
  } else if (tron.isConnected && tron.address) {
    address = tron.address;
    chainName = tron.chainName || 'Tron';
    resolvedChain = 'tron';
  } else if (solana.isConnected && solana.address) {
    address = solana.address;
    chainName = solana.walletName || 'Solana';
    resolvedChain = 'sol';
  }

  // Keep activeChain aligned with currently connected wallets.
  useEffect(() => {
    if (activeChain === 'evm' && evmConnected && evmAddress) return;
    if (activeChain === 'tron' && tron.isConnected && tron.address) return;
    if (activeChain === 'sol' && solana.isConnected && solana.address) return;

    if (evmConnected && evmAddress) {
      setActiveChain('evm');
      return;
    }
    if (tron.isConnected && tron.address) {
      setActiveChain('tron');
      return;
    }
    if (solana.isConnected && solana.address) {
      setActiveChain('sol');
      return;
    }
    setActiveChain(null);
  }, [activeChain, evmConnected, evmAddress, tron.isConnected, tron.address, solana.isConnected, solana.address]);

  // Sync with rewardsStorage
  useEffect(() => {
    // Use the chain that actually produced the `address` to avoid mismatches
    // (e.g. Tron address being labeled as EVM when activeChain is out-of-sync).
    if (isConnected && address && resolvedChain) {
      const chainKind: ChainKind = resolvedChain === 'sol' ? 'sol' : resolvedChain === 'tron' ? 'tron' : 'evm';
      const chainType = resolvedChain === 'sol' ? 'solana' as const : resolvedChain === 'tron' ? 'tron' as const : 'evm' as const;
      rewardsStorage.set({
        chain: chainKind,
        chainType,
        address,
        isConnected: true,
      });
      rewardsStorage.initUser(address, chainKind);
    } else if (!isConnected) {
      const currentState = rewardsStorage.get();
      if (currentState.isConnected) {
        rewardsStorage.set({
          chain: null,
          chainType: null,
          address: null,
          isConnected: false,
        });
      }
    }
  }, [isConnected, address, resolvedChain]);

  // Connect functions
  const connectEvm = useCallback(
    async (mode: 'metamask' | 'walletconnect' = 'metamask') => {
      // Disconnect other chains first
      if (tron.isConnected) await tron.disconnect();
      if (solana.isConnected) await solana.disconnect();

      const metaMaskConnector = connectors.find(c => c.id === 'metaMask' || c.name === 'MetaMask');
      const walletConnectConnector = connectors.find(c => c.id === 'walletConnect' || c.name === 'WalletConnect');

      const targetConnector = mode === 'walletconnect' ? walletConnectConnector : metaMaskConnector;
      if (!targetConnector) {
        throw new Error(mode === 'walletconnect' ? 'WalletConnect not available' : 'MetaMask not available');
      }

      if (mode === 'metamask') {
        const metaMaskAvailable = detectMetaMaskAvailable();
        if (!metaMaskAvailable) {
          throw new Error('MetaMask not detected. Disable Phantom EVM or use WalletConnect.');
        }
      }

      if (mode === 'walletconnect') {
        setEvmWcUri(null);
        try {
          const provider: any = await targetConnector.getProvider();
          if (provider?.on) {
            const handler = (uri: string) => setEvmWcUri(uri);
            evmWcListenerRef.current = handler;
            provider.on('display_uri', handler);
          }
        } catch {
          // ignore
        }
      }

      await connectAsync({ connector: targetConnector });

      if (mode === 'metamask') {
        try {
          const provider: any = await targetConnector.getProvider();
          if (isPhantomEvmProvider(provider)) {
            wagmiDisconnect();
            throw new Error('MetaMask not detected. Phantom EVM provider was selected.');
          }
        } catch (err: any) {
          if (err?.message) {
            throw err;
          }
        }
      }
      setActiveChain('evm');

      // Cleanup display_uri listener and QR once connected
      if (mode === 'walletconnect') {
        try {
          const provider: any = await targetConnector.getProvider();
          if (provider?.off && evmWcListenerRef.current) {
            provider.off('display_uri', evmWcListenerRef.current);
          }
        } catch {
          // ignore
        }
        evmWcListenerRef.current = null;
        setEvmWcUri(null);
      }
    },
    [connectAsync, connectors, tron, solana]
  );

  const connectTron = useCallback(
    async (mode?: 'auto' | 'tronlink' | 'walletconnect') => {
      // Disconnect EVM first
      if (evmConnected) {
        wagmiDisconnect();
      }
      if (solana.isConnected) {
        await solana.disconnect();
      }
      // Small delay to ensure wagmi disconnect completes
      await new Promise(resolve => setTimeout(resolve, 150));
      await tron.connect(mode);
      setActiveChain('tron');
    },
    [evmConnected, wagmiDisconnect, solana, tron]
  );

  const connectSolana = useCallback(
    async (walletId?: string) => {
      // Disconnect EVM first
      if (evmConnected) {
        wagmiDisconnect();
      }
      if (tron.isConnected) {
        await tron.disconnect();
      }
      // Small delay to ensure wagmi disconnect completes
      await new Promise(resolve => setTimeout(resolve, 150));
      await solana.connect(walletId);
      setActiveChain('sol');
    },
    [evmConnected, wagmiDisconnect, tron, solana]
  );

  const signActiveMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!message) throw new Error('Message is required');

      if (resolvedChain === 'tron' && tron.isConnected) {
        return tron.signMessage(message);
      }

      if (resolvedChain === 'sol' && solana.isConnected) {
        return solana.signMessage(message);
      }

      throw new Error('Message signing is available for connected Tron/Solana wallets only');
    },
    [resolvedChain, tron, solana]
  );

  const executeTronApproveTrc20 = useCallback(
    async (params: TronApproveParams): Promise<TronTxResult> => {
      if (resolvedChain !== 'tron' || !tron.isConnected) {
        throw new Error('Tron wallet is not connected');
      }
      return tron.approveTrc20(params);
    },
    [resolvedChain, tron]
  );

  const executeTronSendTrx = useCallback(
    async (params: TronSendTrxParams): Promise<TronTxResult> => {
      if (resolvedChain !== 'tron' || !tron.isConnected) {
        throw new Error('Tron wallet is not connected');
      }
      return tron.sendTrx(params);
    },
    [resolvedChain, tron]
  );

  const disconnect = useCallback(() => {
    if (evmConnected) {
      wagmiDisconnect();
    }
    if (tron.isConnected) tron.disconnect();
    if (solana.isConnected) solana.disconnect();
    setEvmWcUri(null);
    setActiveChain(null);
    rewardsStorage.set({
      chain: null,
      chainType: null,
      address: null,
      isConnected: false,
    });
  }, [evmConnected, wagmiDisconnect, tron, solana]);

  const openChainSelect = useCallback(() => {
    setChainSelectOpen(true);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        activeChain,
        chainName,
        isPending,
        connectEvm,
        connectTron,
        connectSolana,
        signActiveMessage,
        executeTronApproveTrc20,
        executeTronSendTrx,
        disconnect,
        openChainSelect,
        isChainSelectOpen,
        setChainSelectOpen,
        evmWcUri,
        tronWcUri: tron.wcUri,
        tronProviderType: tron.providerType,
        solanaWcUri: solana.wcUri,
        solanaWalletName: solana.walletName,
        solanaAvailableWallets: solana.availableWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
