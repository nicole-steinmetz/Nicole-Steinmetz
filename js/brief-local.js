/* Device-only draft. This is not a cross-device backup. */

import { SCHEMA_VERSION } from "./brief-schema.js";

export const LOCAL_KEY = "ns.project-brief.v1";

export function loadLocal(storage) {
  try {
    const raw = storage.getItem(LOCAL_KEY);
    if (!raw) return { ok: true, draft: null };
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || data.schemaVersion !== SCHEMA_VERSION) {
      return { ok: true, draft: null, ignored: "version" };
    }
    return { ok: true, draft: data };
  } catch (error) {
    return { ok: false, draft: null };
  }
}

export function saveLocal(storage, draft) {
  try {
    storage.setItem(LOCAL_KEY, JSON.stringify(draft));
    return { ok: true };
  } catch (error) {
    return { ok: false };
  }
}

export function clearLocal(storage) {
  try {
    storage.removeItem(LOCAL_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false };
  }
}
