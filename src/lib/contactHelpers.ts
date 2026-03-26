import type { FbContactoRecord } from "../types/nodes";

/** Module ref updated by RTDB `subscribeContactos` — same as legacy App */
export const fbContactosRef: { current: FbContactoRecord[] } = { current: [] };

export type LocalContactRow = {
  fbId?: string;
  name: string;
  cargo?: string;
  email?: string;
  isPrimary?: boolean;
};

/** Static fallback map: substring of node name → contact label */
export type StaticContactTable = Record<string, string>;

export function formatContactNameCargo(name: string, cargo?: string): string {
  const nm = String(name || "").trim();
  const cg = String(cargo || "").trim();
  if (!nm) return "";
  return cg ? `${nm} (${cg})` : nm;
}

/** Choose the row that represents the “main” Firebase contact for a node. */
export function pickPrimaryFbRow(
  linked: FbContactoRecord[]
): FbContactoRecord | null {
  if (linked.length === 0) return null;
  const prim = linked.filter((r) => r.primary === true);
  if (prim.length === 1) return prim[0];
  if (prim.length > 1) {
    return [...prim].sort((a, b) =>
      String(a.id).localeCompare(String(b.id))
    )[0];
  }
  if (linked.length === 1) return linked[0];
  return null;
}

export function mergeItemPopContacts(
  nodeName: string,
  contactsMap: Record<string, LocalContactRow[]>,
  fbList: FbContactoRecord[]
): LocalContactRow[] {
  const pk = String(nodeName || "").trim();
  if (!pk) return [];
  const fromFb = (fbList || [])
    .filter((r) => String(r.parentKey || "") === pk)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((r) => ({
      fbId: r.id,
      name: String(r.nombre || ""),
      cargo: String(r.cargo || ""),
      email: String(r.email || ""),
      isPrimary: r.primary === true,
    }));
  const pending = Array.isArray(contactsMap[pk])
    ? contactsMap[pk].filter((x) => !x.fbId)
    : [];
  const sig = (r: LocalContactRow) =>
    `${String(r.name || "")}\0${String(r.email || "")}\0${String(r.cargo || "")}`;
  const seen = new Set(fromFb.map(sig));
  const extra = pending.filter((p) => !seen.has(sig(p)));
  const combined = [...fromFb, ...extra];
  combined.sort((a, b) => {
    if (!!a.isPrimary !== !!b.isPrimary) return a.isPrimary ? -1 : 1;
    const ak = a.fbId ?? "";
    const bk = b.fbId ?? "";
    if (ak !== bk) return ak.localeCompare(bk);
    return sig(a).localeCompare(sig(b));
  });
  return combined;
}

/** Resolve display contact for a node from Firebase rows + static CT table */
export function resolveGc(
  n: string,
  list: FbContactoRecord[],
  CT: StaticContactTable
): string | null {
  if (!n) return null;
  const linked = list
    .filter((r) => r.parentKey && r.parentKey === n)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const picked = pickPrimaryFbRow(linked);
  if (picked) {
    return formatContactNameCargo(picked.nombre, picked.cargo) || null;
  }
  const patronOnly = list
    .filter((r) => !r.parentKey && r.patron)
    .sort(
      (a, b) => String(b.patron || "").length - String(a.patron || "").length
    );
  for (const r of patronOnly) {
    if (n.includes(r.patron)) return r.nombre || null;
  }
  for (const [k, v] of Object.entries(CT)) {
    if (n.includes(k)) return v;
  }
  return null;
}

/**
 * Label for map / lists: Firebase primary (or single linked row), then local-only
 * primary, then `resolveGc` (patron / static CT).
 */
export function displayPrimaryContactLabel(
  n: string,
  list: FbContactoRecord[],
  contactsMap: Record<string, LocalContactRow[]>,
  CT: StaticContactTable
): string | null {
  if (!n) return null;
  const linked = list.filter((r) => r.parentKey && r.parentKey === n);
  const picked = pickPrimaryFbRow(linked);
  if (picked) {
    const line = formatContactNameCargo(picked.nombre, picked.cargo);
    if (line) return line;
  }
  const loc = contactsMap[n];
  if (Array.isArray(loc) && loc.length) {
    const prim = loc.find((x) => x.isPrimary);
    if (prim?.name) return formatContactNameCargo(prim.name, prim.cargo);
    if (loc.length === 1 && loc[0].name)
      return formatContactNameCargo(loc[0].name, loc[0].cargo);
  }
  return resolveGc(n, list, CT);
}
