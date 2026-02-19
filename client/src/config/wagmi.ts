import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum, base, optimism } from '@reown/appkit/networks';
import { createStorage, injected } from '@wagmi/core';
import { getMetaMaskProvider } from '@/lib/evmProviders';

// WalletConnect Project ID - https://cloud.walletconnect.com
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '7b3c2778deabef041da731133fab3568';

// Metadata for WalletConnect
export const metadata = {
  name: 'PerpX',
  description: 'Next-Gen Perpetual Trading',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://perpx.fi',
  icons: ['/logo.png']
};

// Supported networks
export const networks = [mainnet, arbitrum, base, optimism];

// Fallback storage for non-browser contexts.
const noopStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

const wagmiStorage =
  typeof window !== 'undefined' ? window.localStorage : noopStorage;

// Create wagmi adapter for AppKit
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: wagmiStorage
  }),
  ssr: false,
  projectId,
  networks,
  connectors: [
    injected({
      target: {
        id: 'metaMask',
        name: 'MetaMask',
        provider: (window: Window) => getMetaMaskProvider(window),
      },
      shimDisconnect: true,
    }),
  ]
});

// Export config for WagmiProvider
export const config = wagmiAdapter.wagmiConfig;
