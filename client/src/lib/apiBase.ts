function normalizeBase(url: string) {
  return url.trim().replace(/\/$/, "");
}

export function resolveApiBase() {
  const fromEnv = normalizeBase(import.meta.env.VITE_API_BASE_URL || "");
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "perpx.fi" || host === "www.perpx.fi" || host.endsWith(".perpx.fi")) {
      return "https://api.perpx.fi";
    }
  }

  return "";
}

export function withApiBase(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = resolveApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
