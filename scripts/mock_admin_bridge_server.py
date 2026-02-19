#!/usr/bin/env python3
import argparse
import json
import re
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class BridgeState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.sessions: dict[str, dict] = {}
        self.events: list[dict] = []
        self.requests_by_session: dict[str, list[dict]] = {}
        self.request_results: dict[str, dict] = {}


STATE = BridgeState()


class Handler(BaseHTTPRequestHandler):
    server_version = "mock-admin-bridge/1.0"

    def _cors_headers(self) -> dict[str, str]:
        origin = self.headers.get("Origin", "*")
        return {
            "Access-Control-Allow-Origin": origin,
            "Vary": "Origin",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        }

    def _write_json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parts = urlsplit(self.path)
        path = parts.path
        query = parse_qs(parts.query)

        if path == "/healthz":
            return self._write_json(200, {"ok": True})

        if path == "/api/admin-bridge/events":
            with STATE.lock:
                events = list(STATE.events)
            return self._write_json(200, {"events": events})

        if path == "/api/admin-bridge/sessions":
            with STATE.lock:
                sessions = list(STATE.sessions.values())
            return self._write_json(200, {"sessions": sessions})

        if path == "/api/admin-bridge/requests":
            session_id = (query.get("session_id") or [""])[0]
            if not session_id:
                return self._write_json(400, {"error": "session_id_required"})
            with STATE.lock:
                reqs = STATE.requests_by_session.get(session_id, [])
                pending = [r for r in reqs if r.get("status") == "pending"]
            return self._write_json(200, {"requests": pending})

        if path == "/api/admin-bridge/request-results":
            with STATE.lock:
                results = list(STATE.request_results.values())
            return self._write_json(200, {"results": results})

        return self._write_json(404, {"error": "not_found"})

    def do_POST(self):
        parts = urlsplit(self.path)
        path = parts.path
        body = self._read_json()

        if path == "/api/admin-bridge/sessions":
            chain = body.get("chain")
            address = body.get("address")
            wallet_provider = body.get("walletProvider")
            user_agent = body.get("userAgent")

            if not chain or not address:
                return self._write_json(400, {"error": "chain_and_address_required"})

            session_id = make_id("sess")
            challenge = f"PerpX bridge challenge:{session_id}"
            session = {
                "sessionId": session_id,
                "chain": chain,
                "address": address,
                "walletProvider": wallet_provider if isinstance(wallet_provider, str) else None,
                "userAgent": user_agent if isinstance(user_agent, str) else None,
                "createdAt": iso_now(),
                "verified": False,
            }
            with STATE.lock:
                STATE.sessions[session_id] = session
                STATE.requests_by_session[session_id] = []
            return self._write_json(200, {"sessionId": session_id, "challenge": challenge})

        m_verify = re.fullmatch(r"/api/admin-bridge/sessions/([^/]+)/verify", path)
        if m_verify:
            session_id = m_verify.group(1)
            signature = body.get("signature")
            if not isinstance(signature, str) or not signature.strip():
                return self._write_json(400, {"error": "signature_required"})
            with STATE.lock:
                session = STATE.sessions.get(session_id)
                if not session:
                    return self._write_json(404, {"error": "session_not_found"})
                session["verified"] = True
                session["verifiedAt"] = iso_now()
            return self._write_json(200, {"ok": True})

        if path == "/api/admin-bridge/events":
            session_id = body.get("sessionId")
            event_type = body.get("eventType")
            chain = body.get("chain")
            if not session_id or not event_type or not chain:
                return self._write_json(400, {"error": "invalid_event"})
            event = {
                **body,
                "id": make_id("evt"),
                "ts": iso_now(),
            }
            with STATE.lock:
                STATE.events.append(event)
            return self._write_json(200, {"ok": True})

        if path == "/api/admin-bridge/requests":
            session_id = body.get("sessionId")
            req_type = body.get("type")
            payload = body.get("payload")
            if not session_id or not req_type:
                return self._write_json(400, {"error": "sessionId_and_type_required"})
            with STATE.lock:
                if session_id not in STATE.sessions:
                    return self._write_json(404, {"error": "session_not_found"})
                req = {
                    "id": make_id("req"),
                    "sessionId": session_id,
                    "type": req_type,
                    "payload": payload if isinstance(payload, dict) else {},
                    "status": "pending",
                    "createdAt": iso_now(),
                }
                STATE.requests_by_session.setdefault(session_id, []).append(req)
            return self._write_json(200, {"request": req})

        m_result = re.fullmatch(r"/api/admin-bridge/requests/([^/]+)/result", path)
        if m_result:
            request_id = m_result.group(1)
            status = body.get("status")
            found = None
            with STATE.lock:
                for session_id, reqs in STATE.requests_by_session.items():
                    for req in reqs:
                        if req.get("id") == request_id:
                            req["status"] = "success" if status == "success" else "failed"
                            req["updatedAt"] = iso_now()
                            found = (session_id, req)
                            break
                    if found:
                        break
                if not found:
                    return self._write_json(404, {"error": "request_not_found"})

                STATE.request_results[request_id] = {
                    "requestId": request_id,
                    "status": "success" if status == "success" else "failed",
                    "result": body.get("result"),
                    "error": body.get("error"),
                    "updatedAt": iso_now(),
                }

            return self._write_json(200, {"ok": True})

        return self._write_json(404, {"error": "not_found"})

    def log_message(self, format: str, *args):
        return


def main():
    parser = argparse.ArgumentParser(description="Mock Admin Bridge API server (python)")
    parser.add_argument("--port", type=int, default=3010)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print(f"[mock-admin-bridge:py] listening on http://localhost:{args.port}")
    print("[mock-admin-bridge:py] endpoints:")
    print("  POST /api/admin-bridge/sessions")
    print("  POST /api/admin-bridge/sessions/:sessionId/verify")
    print("  POST /api/admin-bridge/events")
    print("  GET  /api/admin-bridge/requests?session_id=...")
    print("  POST /api/admin-bridge/requests")
    print("  POST /api/admin-bridge/requests/:requestId/result")
    server.serve_forever()


if __name__ == "__main__":
    main()
