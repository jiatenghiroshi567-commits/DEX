export function isPhantomEvmProvider(provider: any): boolean {
  if (!provider) return false;
  if (provider.isPhantom || provider.isPhantomWallet) return true;
  if (typeof window !== "undefined") {
    const phantomProvider = (window as any).phantom?.ethereum;
    if (phantomProvider && provider === phantomProvider) return true;
  }
  return false;
}

export function isMetaMaskProvider(provider: any): boolean {
  if (!provider) return false;
  if (!provider.isMetaMask) return false;
  if (isPhantomEvmProvider(provider)) return false;
  if (provider.isRabby || provider.isBraveWallet || provider.isCoinbaseWallet) return false;
  return true;
}

export function getMetaMaskProvider(targetWindow?: Window): any | undefined {
  const win = targetWindow ?? (typeof window !== "undefined" ? window : undefined);
  if (!win) return undefined;
  const ethereum = (win as any).ethereum;
  if (!ethereum) return undefined;

  const providers = Array.isArray(ethereum.providers) ? ethereum.providers : [];
  const metaMaskProvider = providers.find(isMetaMaskProvider);
  if (metaMaskProvider) return metaMaskProvider;
  if (isMetaMaskProvider(ethereum)) return ethereum;
  return undefined;
}

export function detectMetaMaskAvailable(targetWindow?: Window): boolean {
  return !!getMetaMaskProvider(targetWindow);
}
