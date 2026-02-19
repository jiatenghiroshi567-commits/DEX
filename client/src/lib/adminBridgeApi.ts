import { withApiBase } from "@/lib/apiBase";

export type BridgeChain = "tron" | "evm" | "sol";

export interface CreateSessionInput {
  chain: BridgeChain;
  address: string;
  walletProvider?: string | null;
  userAgent?: string | null;
}

export interface CreateSessionResponse {
  sessionId: string;
  challenge?: string;
}

export interface VerifySessionInput {
  chain: BridgeChain;
  address: string;
  message: string;
  signature: string;
}

export interface AdminBridgeEventInput {
  sessionId: string;
  eventType: string;
  chain: BridgeChain;
  address?: string | null;
  payload?: Record<string, unknown>;
}

export interface AdminBridgeRequest {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  status?: string;
  createdAt?: string;
}

export interface CreateAdminBridgeRequestInput {
  sessionId: string;
  type: "sign_message" | "approve_trc20" | "send_trx" | "ping";
  payload?: Record<string, unknown>;
}

export interface AdminBridgeRequestResultInput {
  status: "success" | "failed";
  result?: Record<string, unknown>;
  error?: string;
}

export interface AdminBridgeRequestResult {
  requestId: string;
  status: "success" | "failed";
  result?: Record<string, unknown> | null;
  error?: string | null;
  updatedAt?: string;
}

export interface AdminBridgeSession {
  sessionId: string;
  chain: BridgeChain;
  address: string;
  walletProvider?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  verified?: boolean;
  verifiedAt?: string;
}

export interface AdminBridgeEvent {
  id?: string;
  sessionId: string;
  eventType: string;
  chain: BridgeChain;
  address?: string | null;
  payload?: Record<string, unknown>;
  ts?: string;
}

function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBase(url: string | undefined): string {
  return (url || "").trim().replace(/\/$/, "");
}

function withAdminBridgeBase(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const overrideBase = normalizeBase(import.meta.env.VITE_ADMIN_BRIDGE_API_BASE_URL);
  if (overrideBase) return `${overrideBase}${normalizedPath}`;
  return withApiBase(normalizedPath);
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(withAdminBridgeBase(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    credentials: "include",
  });

  const raw = await response.text();
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { raw };
    }
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed.message === "string" && parsed.message) ||
      (parsed && typeof parsed.error === "string" && parsed.error) ||
      `admin_bridge_http_${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

export async function fetchAdminBridgeSessions(): Promise<AdminBridgeSession[]> {
  const data = await requestJson<any>("/api/admin-bridge/sessions", {
    method: "GET",
  });
  const list = Array.isArray(data?.sessions) ? data.sessions : [];
  return list
    .map((item: any) => {
      const sessionId = normalizeSessionId(item?.sessionId);
      const chain = typeof item?.chain === "string" ? (item.chain as BridgeChain) : null;
      const address = typeof item?.address === "string" ? item.address : null;
      if (!sessionId || !chain || !address) return null;

      return {
        sessionId,
        chain,
        address,
        walletProvider: typeof item?.walletProvider === "string" ? item.walletProvider : null,
        userAgent: typeof item?.userAgent === "string" ? item.userAgent : null,
        createdAt: typeof item?.createdAt === "string" ? item.createdAt : undefined,
        verified: item?.verified === true,
        verifiedAt: typeof item?.verifiedAt === "string" ? item.verifiedAt : undefined,
      } satisfies AdminBridgeSession;
    })
    .filter((item: AdminBridgeSession | null): item is AdminBridgeSession => !!item);
}

export async function fetchAdminBridgeEvents(): Promise<AdminBridgeEvent[]> {
  const data = await requestJson<any>("/api/admin-bridge/events", {
    method: "GET",
  });
  const list = Array.isArray(data?.events) ? data.events : [];
  return list
    .map((item: any) => {
      const sessionId = normalizeSessionId(item?.sessionId);
      const eventType = typeof item?.eventType === "string" ? item.eventType : "";
      const chain = typeof item?.chain === "string" ? (item.chain as BridgeChain) : null;
      if (!sessionId || !eventType || !chain) return null;

      return {
        id: typeof item?.id === "string" ? item.id : undefined,
        sessionId,
        eventType,
        chain,
        address: typeof item?.address === "string" ? item.address : null,
        payload: item?.payload && typeof item.payload === "object" ? item.payload : undefined,
        ts: typeof item?.ts === "string" ? item.ts : undefined,
      } satisfies AdminBridgeEvent;
    })
    .filter((item: AdminBridgeEvent | null): item is AdminBridgeEvent => !!item);
}

export async function createAdminBridgeSession(
  input: CreateSessionInput
): Promise<CreateSessionResponse> {
  const data = await requestJson<any>("/api/admin-bridge/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const sessionId =
    normalizeSessionId(data?.sessionId) || normalizeSessionId(data?.id);
  if (!sessionId) throw new Error("invalid_session_id");

  return {
    sessionId,
    challenge: typeof data?.challenge === "string" ? data.challenge : undefined,
  };
}

export async function verifyAdminBridgeSession(
  sessionId: string,
  input: VerifySessionInput
): Promise<void> {
  await requestJson(`/api/admin-bridge/sessions/${encodeURIComponent(sessionId)}/verify`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function postAdminBridgeEvent(input: AdminBridgeEventInput): Promise<void> {
  await requestJson("/api/admin-bridge/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminBridgeRequests(
  sessionId: string
): Promise<AdminBridgeRequest[]> {
  const data = await requestJson<any>(
    `/api/admin-bridge/requests?session_id=${encodeURIComponent(sessionId)}`,
    { method: "GET" }
  );

  const list = Array.isArray(data) ? data : Array.isArray(data?.requests) ? data.requests : [];
  return list
    .map((item: any) => ({
      id: normalizeSessionId(item?.id) || "",
      sessionId: normalizeSessionId(item?.sessionId) || undefined,
      type: typeof item?.type === "string" ? item.type : "",
      payload: item?.payload && typeof item.payload === "object" ? item.payload : undefined,
      status: typeof item?.status === "string" ? item.status : undefined,
      createdAt: typeof item?.createdAt === "string" ? item.createdAt : undefined,
    }))
    .filter((item: AdminBridgeRequest) => item.id && item.type);
}

export async function createAdminBridgeRequest(
  input: CreateAdminBridgeRequestInput
): Promise<AdminBridgeRequest> {
  const data = await requestJson<any>("/api/admin-bridge/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const item = data?.request ?? data;
  const id = normalizeSessionId(item?.id);
  const type = typeof item?.type === "string" ? item.type : "";
  if (!id || !type) throw new Error("invalid_request_response");

  return {
    id,
    sessionId: normalizeSessionId(item?.sessionId) || input.sessionId,
    type,
    payload: item?.payload && typeof item.payload === "object" ? item.payload : undefined,
    status: typeof item?.status === "string" ? item.status : undefined,
    createdAt: typeof item?.createdAt === "string" ? item.createdAt : undefined,
  };
}

export async function postAdminBridgeRequestResult(
  requestId: string,
  input: AdminBridgeRequestResultInput
): Promise<void> {
  await requestJson(`/api/admin-bridge/requests/${encodeURIComponent(requestId)}/result`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminBridgeRequestResults(): Promise<AdminBridgeRequestResult[]> {
  const data = await requestJson<any>("/api/admin-bridge/request-results", {
    method: "GET",
  });
  const list = Array.isArray(data?.results) ? data.results : [];
  return list
    .map((item: any) => {
      const requestId = normalizeSessionId(item?.requestId);
      const status = item?.status === "success" ? "success" : item?.status === "failed" ? "failed" : null;
      if (!requestId || !status) return null;
      return {
        requestId,
        status,
        result: item?.result && typeof item.result === "object" ? item.result : null,
        error: typeof item?.error === "string" ? item.error : null,
        updatedAt: typeof item?.updatedAt === "string" ? item.updatedAt : undefined,
      } satisfies AdminBridgeRequestResult;
    })
    .filter((item: AdminBridgeRequestResult | null): item is AdminBridgeRequestResult => !!item);
}
