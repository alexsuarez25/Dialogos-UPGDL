/**
 * TAG_MAP en Realtime Database bajo `tag_map/entries`.
 * Cada entrada: clave codificada (nombre del nodo con caracteres prohibidos en RTDB)
 * y valor { name: string, indices: number[] }.
 */
import {
  getDatabase,
  ref,
  set,
  remove,
  get,
  onValue,
  type Unsubscribe,
} from "firebase/database";
import { app } from "./client";

export const TAG_MAP_ROOT = "tag_map";

const db = getDatabase(app);

export type TagMapEntry = {
  name: string;
  indices: number[];
};

export function encodeTagMapKey(nodeName: string): string {
  const bytes = new TextEncoder().encode(nodeName);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTagMapKey(encoded: string): string {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function entriesRef() {
  return ref(db, `${TAG_MAP_ROOT}/entries`);
}

function entryRef(encodedKey: string) {
  return ref(db, `${TAG_MAP_ROOT}/entries/${encodedKey}`);
}

/** Convierte snapshot entries → Record<nombreVisible, indices[]> */
export function flattenTagMapEntries(
  raw: Record<string, unknown> | null
): Record<string, number[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number[]> = {};
  for (const val of Object.values(raw)) {
    const o = val as { name?: string; indices?: unknown };
    const name = o?.name != null ? String(o.name) : "";
    if (!name) continue;
    const indices = Array.isArray(o.indices)
      ? o.indices.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
      : [];
    out[name] = indices;
  }
  return out;
}

export async function getTagMapFromDb(): Promise<Record<string, number[]> | null> {
  const snap = await get(entriesRef());
  return snap.exists() ? flattenTagMapEntries(snap.val() as Record<string, unknown>) : null;
}

export function subscribeTagMap(
  onData: (
    map: Record<string, number[]> | null,
    /** Firebase tiene hijos en `tag_map/entries` */
    remoteHasRows: boolean
  ) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onValue(
    entriesRef(),
    (snap) => {
      const remoteHasRows = snap.exists();
      const flat = remoteHasRows
        ? flattenTagMapEntries(snap.val() as Record<string, unknown>)
        : null;
      onData(flat, remoteHasRows);
    },
    (err) => onError?.(err)
  );
}

export async function setTagMapEntry(
  nodeName: string,
  indices: number[]
): Promise<void> {
  const name = nodeName.trim();
  if (!name) throw new Error("Nombre del nodo obligatorio");
  const k = encodeTagMapKey(name);
  await set(entryRef(k), { name, indices: [...indices], updatedAt: Date.now() });
}

export async function deleteTagMapEntry(nodeName: string): Promise<void> {
  const k = encodeTagMapKey(nodeName.trim());
  await remove(entryRef(k));
}

/** Sustituye todas las entradas por el objeto dado (p. ej. TAG_MAP_DEFAULT). */
export async function seedTagMapFromObject(
  map: Record<string, number[]>
): Promise<void> {
  const payload: Record<string, TagMapEntry & { updatedAt: number }> = {};
  const now = Date.now();
  for (const [name, indices] of Object.entries(map)) {
    const nm = String(name).trim();
    if (!nm) continue;
    payload[encodeTagMapKey(nm)] = {
      name: nm,
      indices: [...indices],
      updatedAt: now,
    };
  }
  await set(entriesRef(), payload);
}

/** Borra todo `tag_map/entries`. */
export async function clearTagMapEntries(): Promise<void> {
  await remove(entriesRef());
}
