import type { FbContactoRecord } from "../types/nodes";

/** Module ref updated by RTDB `subscribeContactos` — same as legacy App */
export const fbContactosRef: { current: FbContactoRecord[] } = { current: [] };

export type LocalContactRow = { fbId?: string; name: string; cargo?: string; email?: string };

/** Static fallback map: substring of node name → contact label */
export type StaticContactTable = Record<string, string>;

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
    }));
  const pending = Array.isArray(contactsMap[pk])
    ? contactsMap[pk].filter((x) => !x.fbId)
    : [];
  const sig = (r: LocalContactRow) =>
    `${String(r.name || "")}\0${String(r.email || "")}\0${String(r.cargo || "")}`;
  const seen = new Set(fromFb.map(sig));
  const extra = pending.filter((p) => !seen.has(sig(p)));
  return [...fromFb, ...extra];
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
  if (linked.length) {
    const first = linked[0];
    const nm = String(first.nombre || "").trim();
    const cg = String(first.cargo || "").trim();
    if (nm) return cg ? `${nm} (${cg})` : nm;
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
