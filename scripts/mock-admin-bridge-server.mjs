import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
const port = Number.parseInt(process.env.ADMIN_BRIDGE_PORT || "3010", 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const sessions = new Map();
const events = [];
const requestsBySession = new Map();
const requestResults = new Map();

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/admin-bridge/sessions", (req, res) => {
  const { chain, address, walletProvider, userAgent } = req.body || {};
  if (!chain || !address) {
    return res.status(400).json({ error: "chain_and_address_required" });
  }

  const sessionId = makeId("sess");
  const challenge = `PerpX bridge challenge:${sessionId}`;
  const session = {
    sessionId,
    chain,
    address,
    walletProvider: walletProvider || null,
    userAgent: userAgent || null,
    createdAt: new Date().toISOString(),
    verified: false,
  };
  sessions.set(sessionId, session);
  requestsBySession.set(sessionId, []);

  return res.json({ sessionId, challenge });
});

app.post("/api/admin-bridge/sessions/:sessionId/verify", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "session_not_found" });

  const { signature } = req.body || {};
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "signature_required" });
  }

  session.verified = true;
  session.verifiedAt = new Date().toISOString();
  sessions.set(session.sessionId, session);
  return res.json({ ok: true });
});

app.post("/api/admin-bridge/events", (req, res) => {
  const event = req.body || {};
  if (!event.sessionId || !event.eventType || !event.chain) {
    return res.status(400).json({ error: "invalid_event" });
  }
  events.push({ ...event, id: makeId("evt"), ts: new Date().toISOString() });
  return res.json({ ok: true });
});

app.get("/api/admin-bridge/events", (_req, res) => {
  res.json({ events });
});

app.get("/api/admin-bridge/sessions", (_req, res) => {
  res.json({ sessions: Array.from(sessions.values()) });
});

app.get("/api/admin-bridge/requests", (req, res) => {
  const sessionId = String(req.query.session_id || "");
  if (!sessionId) return res.status(400).json({ error: "session_id_required" });

  const list = requestsBySession.get(sessionId) || [];
  return res.json({ requests: list.filter((x) => x.status === "pending") });
});

app.post("/api/admin-bridge/requests", (req, res) => {
  const { sessionId, type, payload } = req.body || {};
  if (!sessionId || !type) {
    return res.status(400).json({ error: "sessionId_and_type_required" });
  }
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: "session_not_found" });
  }

  const request = {
    id: makeId("req"),
    sessionId,
    type,
    payload: payload && typeof payload === "object" ? payload : {},
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const current = requestsBySession.get(sessionId) || [];
  current.push(request);
  requestsBySession.set(sessionId, current);

  return res.json({ request });
});

app.post("/api/admin-bridge/requests/:requestId/result", (req, res) => {
  const requestId = req.params.requestId;
  const body = req.body || {};

  let found = null;
  for (const [sessionId, list] of requestsBySession.entries()) {
    const request = list.find((item) => item.id === requestId);
    if (request) {
      request.status = body.status === "success" ? "success" : "failed";
      request.updatedAt = new Date().toISOString();
      found = { sessionId, request };
      break;
    }
  }

  if (!found) return res.status(404).json({ error: "request_not_found" });

  requestResults.set(requestId, {
    requestId,
    status: body.status,
    result: body.result || null,
    error: body.error || null,
    updatedAt: new Date().toISOString(),
  });

  return res.json({ ok: true });
});

app.get("/api/admin-bridge/request-results", (_req, res) => {
  res.json({ results: Array.from(requestResults.values()) });
});

app.listen(port, () => {
  console.log(`[mock-admin-bridge] listening on http://localhost:${port}`);
  console.log("[mock-admin-bridge] endpoints:");
  console.log("  POST /api/admin-bridge/sessions");
  console.log("  POST /api/admin-bridge/sessions/:sessionId/verify");
  console.log("  POST /api/admin-bridge/events");
  console.log("  GET  /api/admin-bridge/requests?session_id=...");
  console.log("  POST /api/admin-bridge/requests");
  console.log("  POST /api/admin-bridge/requests/:requestId/result");
});
