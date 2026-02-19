import SignClient from '@walletconnect/sign-client';
import { Core } from '@walletconnect/core';
import { WALLETCONNECT_PROJECT_ID, WC_METADATA } from '@/config/walletConstants';

const GLOBAL_CLIENT_PROMISE_KEY = '__perpx_tron_wc_sign_client_promise__';
const TRON_WC_STORAGE_PREFIX = 'perpx-tron';

type GlobalWalletConnectState = typeof globalThis & {
  [GLOBAL_CLIENT_PROMISE_KEY]?: Promise<SignClient> | null;
};

function isRecoverableInitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /reading ['"]list['"]|storage|deserialize|json/i.test(message);
}

function clearWalletConnectStorageCache() {
  if (typeof window === 'undefined') return;
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('wc@2') || key.includes('walletconnect')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore localStorage access failures
  }
}

async function initSignClient() {
  const create = () =>
    SignClient.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: WC_METADATA,
      core: new Core({
        projectId: WALLETCONNECT_PROJECT_ID,
        customStoragePrefix: TRON_WC_STORAGE_PREFIX,
      }),
    });

  try {
    return await create();
  } catch (error) {
    if (!isRecoverableInitError(error)) {
      throw error;
    }
    clearWalletConnectStorageCache();
    return create();
  }
}

export function getWalletConnectClient() {
  const globalState = globalThis as GlobalWalletConnectState;
  if (!globalState[GLOBAL_CLIENT_PROMISE_KEY]) {
    globalState[GLOBAL_CLIENT_PROMISE_KEY] = initSignClient();
  }
  return globalState[GLOBAL_CLIENT_PROMISE_KEY] as Promise<SignClient>;
}
