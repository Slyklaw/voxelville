// Player settings persisted in localStorage (Phase 18).
// Separate from the IndexedDB world save: tiny JSON blob, one key.

const KEY = "voxelville:settings";

export const DEFAULT_SETTINGS = {
  renderDistance: 8, // chunks, radius (2..8)
  sensitivity: 0.0025, // mouse radians per pixel
};

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(hi, Math.max(lo, n));
}

// Parsed + clamped settings, or null when nothing usable is stored.
export function parseSettings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const rd = clamp(raw.renderDistance, 2, 8);
  const se = clamp(raw.sensitivity, 0.0005, 0.01);
  if (rd === null || se === null) return null;
  return {
    renderDistance: Math.round(rd),
    sensitivity: se,
  };
}

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadSettings() {
  const store = storage();
  if (!store) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = parseSettings(JSON.parse(store.getItem(KEY)));
    return parsed ? { ...DEFAULT_SETTINGS, ...parsed } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const store = storage();
  if (!store) return;
  try {
    const clean = parseSettings(settings) || DEFAULT_SETTINGS;
    store.setItem(KEY, JSON.stringify(clean));
  } catch {
    // Private-mode quota errors etc: settings just don't persist.
  }
}
