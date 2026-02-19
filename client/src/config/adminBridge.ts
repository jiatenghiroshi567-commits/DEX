function parseBool(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return fallback;
}

function parseIntOrDefault(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_ADMIN_BRIDGE_ENABLED = !!import.meta.env.DEV;

export const ADMIN_BRIDGE_ENABLED = parseBool(
  import.meta.env.VITE_ADMIN_BRIDGE_ENABLED,
  DEFAULT_ADMIN_BRIDGE_ENABLED
);
export const ADMIN_BRIDGE_POLL_INTERVAL_MS = parseIntOrDefault(
  import.meta.env.VITE_ADMIN_BRIDGE_POLL_INTERVAL_MS,
  5000
);
