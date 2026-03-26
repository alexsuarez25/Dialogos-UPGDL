/**
 * Extra micro-nodes under existing catalog children only (`map_catalog/custom_nietos`).
 * Keys are built-in child ids: project `key`, CINOV/Aliados/Invest sub `key`, etc.
 */
import {
  getDatabase,
  ref,
  set,
  onValue,
  type Unsubscribe,
} from "firebase/database";
import { app } from "./client";

export const MAP_CATALOG_ROOT = "map_catalog";

const db = getDatabase(app);

export type CustomNietoRow = {
  name: string;
  contact?: string;
};

/** child key → micro-nodes */
export type CustomNietosState = Record<string, CustomNietoRow[]>;

function coerceObjectArray<T extends object>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val))
    return val.map((x) =>
      x && typeof x === "object" ? { ...x } : x
    ) as T[];
  if (typeof val !== "object") return [];
  return Object.keys(val as object)
    .sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isInteger(na) && Number.isInteger(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    })
    .map((k) => (val as Record<string, T>)[k])
    .filter((x) => x != null && typeof x === "object") as T[];
}

export function normalizeCustomNietos(raw: unknown): CustomNietosState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CustomNietosState = {};
  for (const [pk, val] of Object.entries(raw)) {
    out[pk] = coerceObjectArray<CustomNietoRow>(val);
  }
  return out;
}

/** Micro-nodes for one built-in child (sub or project key). */
export function customNietosForChildKey(
  state: CustomNietosState,
  childKey: string
): CustomNietoRow[] {
  return coerceObjectArray<CustomNietoRow>(state[childKey]);
}

/** @deprecated use `customNietosForChildKey` */
export const customNietosForHijo = customNietosForChildKey;

function nietosRef() {
  return ref(db, `${MAP_CATALOG_ROOT}/custom_nietos`);
}

export function subscribeCustomNietos(
  onData: (data: CustomNietosState | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onValue(
    nietosRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const v = snap.val();
      onData(v && typeof v === "object" ? (v as CustomNietosState) : null);
    },
    (err) => onError?.(err)
  );
}

export async function setCustomNietos(state: CustomNietosState): Promise<void> {
  await set(nietosRef(), state);
}
