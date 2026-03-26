/**
 * Firebase Realtime Database helpers for the `contactos` node (DX-oriented API).
 *
 * Rules in Firebase Console must allow the intended read/write paths for `contactos`.
 */
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  get,
  onValue,
  type DatabaseReference,
  type Unsubscribe,
} from "firebase/database";
import { app } from "./client";

/** Root path segment for contact records in Realtime Database */
export const CT = "contactos";

const db = getDatabase(app);

export type ContactoId = string;

/** Loose record shape; tighten fields in your app as needed */
export type ContactoData = Record<string, unknown>;

function contactosRef(): DatabaseReference {
  return ref(db, CT);
}

function contactoRef(id: ContactoId): DatabaseReference {
  return ref(db, `${CT}/${id}`);
}

/** Create with auto-generated key (returns the new id) */
export async function createContacto(data: ContactoData): Promise<ContactoId> {
  const listRef = contactosRef();
  const newRef = push(listRef);
  const id = newRef.key;
  if (!id) throw new Error("push() did not return a key");
  await set(newRef, { ...data, id });
  return id;
}

/** Create or fully replace a contact at a known id */
export async function setContacto(id: ContactoId, data: ContactoData): Promise<void> {
  await set(contactoRef(id), { ...data, id });
}

/** Shallow merge of fields at `contactos/{id}` */
export async function updateContacto(
  id: ContactoId,
  partial: ContactoData
): Promise<void> {
  await update(contactoRef(id), partial);
}

export async function deleteContacto(id: ContactoId): Promise<void> {
  await remove(contactoRef(id));
}

/** Shape stored from the mapa ItemPop contact list */
export type UserContactRow = {
  name?: string;
  cargo?: string;
  email?: string;
  notas?: string;
  /** If true, becomes the only primary for this parent (others cleared). */
  primary?: boolean;
};

/**
 * Varios documentos bajo `contactos/{id}` con el mismo `parentKey` (= nombre exacto del nodo).
 * Elimina todos los que enlazan a ese nodo (y migraciones viejas: un doc con patron exacto sin parentKey).
 */
async function clearPrimaryForParent(parentKey: string): Promise<void> {
  const pk = parentKey.trim();
  if (!pk) return;
  const all = await getAllContactos();
  if (!all) return;
  const tasks: Promise<void>[] = [];
  for (const [id, val] of Object.entries(all)) {
    const o = val as ContactoData & { parentKey?: string; primary?: boolean };
    if (String(o.parentKey ?? "").trim() !== pk) continue;
    if (o.primary === true) {
      tasks.push(
        updateContacto(id, { primary: false, updatedAt: Date.now() })
      );
    }
  }
  await Promise.all(tasks);
}

/** Mark one Firebase contact as primary for its `parentKey`; clears primary on siblings. */
export async function setPrimaryContactForParent(
  parentKey: string,
  fbId: string
): Promise<void> {
  const pk = parentKey.trim();
  const target = String(fbId || "").trim();
  if (!pk || !target) throw new Error("parentKey y fbId son obligatorios");
  const all = await getAllContactos();
  if (!all) return;
  const tasks: Promise<void>[] = [];
  for (const [id, val] of Object.entries(all)) {
    const o = val as ContactoData & { parentKey?: string };
    if (String(o.parentKey ?? "").trim() !== pk) continue;
    const want = id === target;
    tasks.push(
      updateContacto(id, {
        primary: want,
        updatedAt: Date.now(),
      })
    );
  }
  await Promise.all(tasks);
}

export async function removeContactosLinkedToNode(nodeName: string): Promise<number> {
  const p = nodeName.trim();
  if (!p) return 0;
  const all = await getAllContactos();
  if (!all) return 0;
  let removed = 0;
  for (const [id, val] of Object.entries(all)) {
    const o = val as ContactoData & {
      parentKey?: string;
      patron?: string;
    };
    const pk = String(o.parentKey ?? "").trim();
    const pat = String(o.patron ?? "").trim();
    const legacyExactPatron = !pk && pat === p;
    if (pk === p || legacyExactPatron) {
      await deleteContacto(id);
      removed++;
    }
  }
  return removed;
}

/**
 * Sustituye todos los contactos de un nodo: borra enlaces existentes y crea un documento por persona.
 */
export async function replaceContactosForParent(
  parentKey: string,
  rows: UserContactRow[]
): Promise<void> {
  const pk = parentKey.trim();
  if (!pk) return;
  await removeContactosLinkedToNode(pk);
  const valid = rows
    .map((r) => ({
      nombre: String(r.name || "").trim(),
      cargo: String(r.cargo || "").trim(),
      email: String(r.email || "").trim(),
      primary: r.primary === true,
    }))
    .filter((r) => r.nombre);
  const anyMarked = valid.some((r) => r.primary);
  let primaryAssigned = false;
  for (const row of valid) {
    let isPrimary = row.primary && !primaryAssigned;
    if (isPrimary) primaryAssigned = true;
    if (!anyMarked && valid.length === 1) isPrimary = true;
    await createContacto({
      parentKey: pk,
      nombre: row.nombre,
      cargo: row.cargo,
      email: row.email,
      notas: "",
      primary: isPrimary,
      source: "itempop",
      updatedAt: Date.now(),
    });
  }
}

/** Un solo documento al crear micro-nodo desde admin (sin borrar otros contactos del mismo nodo). */
export async function appendContactoForNieto(
  parentKey: string,
  nombre: string
): Promise<ContactoId> {
  const pk = parentKey.trim();
  const nm = nombre.trim();
  if (!pk || !nm) throw new Error("parentKey y nombre son obligatorios");
  await clearPrimaryForParent(pk);
  return createContacto({
    parentKey: pk,
    nombre: nm,
    cargo: "",
    email: "",
    notas: "",
    primary: true,
    source: "nieto",
    updatedAt: Date.now(),
  });
}

/** Agrega un contacto en ItemPop sin borrar los demás del mismo nodo (`parentKey` = nombre del micro-nodo). */
export async function appendContactoForParent(
  parentKey: string,
  row: UserContactRow
): Promise<ContactoId> {
  const pk = parentKey.trim();
  const nombre = String(row.name || "").trim();
  if (!pk || !nombre) throw new Error("parentKey y nombre son obligatorios");
  const makePrimary = row.primary === true;
  if (makePrimary) await clearPrimaryForParent(pk);
  return createContacto({
    parentKey: pk,
    nombre,
    cargo: String(row.cargo || "").trim(),
    email: String(row.email || "").trim(),
    notas: String(row.notas || "").trim(),
    primary: makePrimary,
    source: "itempop",
    updatedAt: Date.now(),
  });
}

/** One-time fetch of a single contact */
export async function getContacto(
  id: ContactoId
): Promise<ContactoData | null> {
  const snap = await get(contactoRef(id));
  return snap.exists() ? (snap.val() as ContactoData) : null;
}

/** One-time fetch of all contacts as id → record */
export async function getAllContactos(): Promise<
  Record<ContactoId, ContactoData> | null
> {
  const snap = await get(contactosRef());
  return snap.exists() ? (snap.val() as Record<ContactoId, ContactoData>) : null;
}

/** Live updates for the whole `contactos` tree */
export function subscribeContactos(
  onData: (records: Record<ContactoId, ContactoData> | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onValue(
    contactosRef(),
    (snap) => onData(snap.exists() ? snap.val() : null),
    (err) => onError?.(err)
  );
}

export { contactosRef, contactoRef, db };
