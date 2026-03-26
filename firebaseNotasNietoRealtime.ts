/**
 * Notas de micro-nodos (nietos) en Realtime Database.
 * Path: `notas_nietos/by_node/{encodedParentAndName}/items/{id}`
 * `parentKey` = clave del sub (hijo), mismo `_parentKey` que en ItemPop.
 */
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  type Unsubscribe,
} from "firebase/database";
import { app } from "./firebase";
import { encodeTagMapKey } from "./firebaseTagMapRealtime";

export const NOTAS_NIETOS_ROOT = "notas_nietos";

const db = getDatabase(app);

function scopeKey(parentKey: string, nodeName: string): string {
  return encodeTagMapKey(`${parentKey.trim()}::${nodeName.trim()}`);
}

function itemsRef(parentKey: string, nodeName: string) {
  return ref(
    db,
    `${NOTAS_NIETOS_ROOT}/by_node/${scopeKey(parentKey, nodeName)}/items`
  );
}

function itemRef(parentKey: string, nodeName: string, id: string) {
  return ref(
    db,
    `${NOTAS_NIETOS_ROOT}/by_node/${scopeKey(parentKey, nodeName)}/items/${id}`
  );
}

export type NotaNietoPayload = {
  text: string;
  date: string;
  edited?: string;
};

export type NotaNietoRecord = NotaNietoPayload & {
  id: string;
  parentKey: string;
  nodeName: string;
  updatedAt: number;
};

/** Crea un documento de nota ligado al padre (sub) y al nieto. Devuelve el id de Firebase. */
export async function appendNotaNieto(
  parentKey: string,
  nodeName: string,
  payload: NotaNietoPayload
): Promise<string> {
  const pk = parentKey.trim();
  const nm = nodeName.trim();
  if (!pk || !nm) throw new Error("parentKey y nodeName son obligatorios");
  const listRef = itemsRef(pk, nm);
  const newRef = push(listRef);
  const id = newRef.key;
  if (!id) throw new Error("push() no devolvió key");
  await set(newRef, {
    id,
    parentKey: pk,
    nodeName: nm,
    text: payload.text,
    date: payload.date,
    edited: payload.edited || "",
    updatedAt: Date.now(),
  });
  return id;
}

export async function updateNotaNieto(
  parentKey: string,
  nodeName: string,
  id: string,
  partial: { text: string; edited: string }
): Promise<void> {
  await update(itemRef(parentKey, nodeName, id), {
    text: partial.text,
    edited: partial.edited,
    updatedAt: Date.now(),
  });
}

export async function deleteNotaNieto(
  parentKey: string,
  nodeName: string,
  id: string
): Promise<void> {
  await remove(itemRef(parentKey, nodeName, id));
}

/** Borra todas las notas RTDB de un nieto (p. ej. al eliminar el nodo). */
export async function removeAllNotasForNieto(
  parentKey: string,
  nodeName: string
): Promise<void> {
  const pk = parentKey.trim();
  const nm = nodeName.trim();
  if (!pk || !nm) return;
  await remove(itemsRef(pk, nm));
}

export function subscribeNotasNieto(
  parentKey: string,
  nodeName: string,
  onData: (rows: NotaNietoRecord[] | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const pk = parentKey.trim();
  const nm = nodeName.trim();
  if (!pk || !nm) {
    onData(null);
    return () => {};
  }
  return onValue(
    itemsRef(pk, nm),
    (snap) => {
      if (!snap.exists()) {
        onData([]);
        return;
      }
      const raw = snap.val() as Record<string, NotaNietoRecord>;
      const rows = Object.values(raw)
        .filter((r) => r && r.id)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onData(rows);
    },
    (err) => onError?.(err)
  );
}
