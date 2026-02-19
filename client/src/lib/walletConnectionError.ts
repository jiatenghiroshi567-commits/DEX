const CANCELED_PATTERNS = [
  /user rejected/i,
  /user denied/i,
  /request rejected/i,
  /cancelled/i,
  /canceled/i,
  /declined/i,
  /4001/,
];

const WALLET_NOT_FOUND_PATTERNS = [
  /not detected/i,
  /not found/i,
  /install/i,
  /provider not available/i,
];

const WALLETCONNECT_SESSION_PATTERNS = [
  /no tron accounts found/i,
  /walletconnect_approval_unavailable/i,
  /session.*not available/i,
  /unsupported chains|unsupported namespace/i,
];

export const WALLET_CONNECTION_ERROR_MESSAGE =
  "Wallet connection failed. Please reopen your wallet app or extension and try again.";

export const WALLET_CONNECTION_CANCELLED_MESSAGE =
  "Wallet connection was cancelled. Please approve the request in your wallet to continue.";

export const WALLET_NOT_FOUND_MESSAGE =
  "Wallet not detected. Install or open your wallet app/extension and try again.";

export const WALLETCONNECT_SESSION_ERROR_MESSAGE =
  "WalletConnect session could not be established. Please reopen your wallet app and retry.";

export function getWalletConnectionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.trim();

  if (!normalized) return WALLET_CONNECTION_ERROR_MESSAGE;
  if (WALLET_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return WALLET_NOT_FOUND_MESSAGE;
  }
  if (CANCELED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return WALLET_CONNECTION_CANCELLED_MESSAGE;
  }
  if (WALLETCONNECT_SESSION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return WALLETCONNECT_SESSION_ERROR_MESSAGE;
  }
  return WALLET_CONNECTION_ERROR_MESSAGE;
}
