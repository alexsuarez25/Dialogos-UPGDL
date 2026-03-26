import type { NodeIndexEntry } from "../types/nodes";
import {
  MAIN,
  PROJECTS,
  CINOV_SUBS,
  ALIADOS_SUBS,
  INVEST_SUBS,
  CT,
} from "./mapStatic";
import { resolveGc } from "./contactHelpers";
import type { FbContactoRecord } from "../types/nodes";

export const WW = 12000;
export const HH = 9000;
export const CX = WW / 2;
export const CY = HH / 2;
export const R1 = 850;
export const R2 = 600;
export const R3 = 500;
export const RP = 520;
export const NR0 = 140;
export const NR1 = 170;
export const NR2 = 75;
export const NR3 = 26;

const toRad = (d: number) => (d * Math.PI) / 180;

export const pol = (cx: number, cy: number, r: number, deg: number) =>
  [cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))] as const;

export function fan(n: number, c: number, ms: number, mx: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [c];
  const sp = Math.min(Math.max((n - 1) * ms, ms * 2), mx);
  const st = sp / (n - 1);
  return Array.from({ length: n }, (_, i) => c - sp / 2 + st * i);
}

export const mPos: Record<string, { x: number; y: number }> = {};
MAIN.forEach((m) => {
  const [x, y] = pol(CX, CY, R1, m.angle);
  mPos[m.key] = { x, y };
});

export function subPos<T extends { angle: number }>(
  mk: string,
  subs: T[]
): (T & { x: number; y: number; angle: number })[] {
  const o = mPos[mk];
  const m = MAIN.find((n) => n.key === mk);
  if (!m) return [];
  const n = subs.length;
  const a = fan(n, m.angle, 34, 190);
  return subs.map((s, i) => {
    const [x, y] = pol(o.x, o.y, R2, a[i]);
    return { ...s, x, y, angle: a[i] };
  });
}

export function itemPos(
  sub: { x: number; y: number },
  items: (string | { name: string })[],
  getContact: (name: string) => string | null
) {
  const outA = (Math.atan2(sub.y - CY, sub.x - CX) * 180) / Math.PI;
  const n = items.length;
  const dynR = Math.max(R3, R3 + Math.max(0, n - 5) * 25);
  const ms = n > 12 ? 18 : n > 8 ? 22 : n > 5 ? 26 : 30;
  const mx = Math.min(300, Math.max(n * ms * 1.2, ms * 3));
  const a = fan(n, outA, ms, mx);
  return items.map((it, i) => {
    const nm = typeof it === "string" ? it : it.name;
    const [x, y] = pol(sub.x, sub.y, dynR, a[i]);
    return { name: nm, x, y, contact: getContact(nm) };
  });
}

export function projPos() {
  const o = mPos.proyectos;
  const n = PROJECTS.length;
  const a = fan(n, MAIN[0].angle, 26, 150);
  return PROJECTS.map((p, i) => {
    const [x, y] = pol(o.x, o.y, R2, a[i]);
    return { ...p, x, y, angle: a[i] };
  });
}

export function temaPos(proj: (typeof PROJECTS)[number]) {
  const pp = projPos().find((p) => p.key === proj.key);
  if (!pp) return [];
  const outA = (Math.atan2(pp.y - CY, pp.x - CX) * 180) / Math.PI;
  const n = proj.tematicas.length;
  const a = fan(n, outA, 34, 180);
  return proj.tematicas.map((t, i) => {
    const nm = t;
    const [x, y] = pol(pp.x, pp.y, RP, a[i]);
    return { name: nm, x, y, angle: a[i] };
  });
}

const emptyFb: FbContactoRecord[] = [];
const initialGc = (name: string) => resolveGc(name, emptyFb, CT);

function buildIndex(getContact: (name: string) => string | null): NodeIndexEntry[] {
  const idx: NodeIndexEntry[] = [];
  const pN = projPos();
  pN.forEach((p) => {
    p.tematicas.forEach((tn) => {
      const nm = typeof tn === "string" ? tn : tn;
      idx.push({
        name: nm,
        type: "Proyecto",
        parent: p.short,
        branch: "proyectos",
        projKey: p.key,
      });
    });
    idx.push({
      name: p.short,
      type: "Proyecto",
      parent: "Proyectos",
      branch: "proyectos",
      projKey: p.key,
    });
    if (p.desc?.title && p.desc.title !== p.short) {
      idx.push({
        name: p.desc.title,
        type: "Proyecto",
        parent: "Proyectos",
        branch: "proyectos",
        projKey: p.key,
      });
    }
  });
  CINOV_SUBS.forEach((sub) => {
    const sp = subPos("cinov", CINOV_SUBS).find((s) => s.key === sub.key);
    (sub.items || []).forEach((it) => {
      const nm = typeof it === "string" ? it : it.name;
      const pos = sp ? itemPos(sp, [it], getContact)[0] : undefined;
      idx.push({
        name: nm,
        type: "CINOV",
        parent: sub.name,
        branch: "cinov",
        subKey: sub.key,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
      });
    });
  });
  ALIADOS_SUBS.forEach((sub) => {
    const sp = subPos("aliados", ALIADOS_SUBS).find((s) => s.key === sub.key);
    (sub.items || []).forEach((it) => {
      const nm = typeof it === "string" ? it : it.name;
      const pos = sp ? itemPos(sp, [it], getContact)[0] : undefined;
      idx.push({
        name: nm,
        type: "Aliado",
        parent: sub.name.split("\n")[0],
        branch: "aliados",
        subKey: sub.key,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
      });
    });
  });
  INVEST_SUBS.forEach((sub) => {
    const sp = subPos("investigacion", INVEST_SUBS).find((s) => s.key === sub.key);
    (sub.items || []).forEach((it) => {
      const nm = typeof it === "string" ? it : it.name;
      const pos = sp ? itemPos(sp, [it], getContact)[0] : undefined;
      idx.push({
        name: nm,
        type: "Investigación",
        parent: sub.name.split("\n")[0],
        branch: "investigacion",
        subKey: sub.key,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
      });
    });
  });
  return idx;
}

/** Built once at load with empty Firebase list — matches legacy `NODE_INDEX` */
export const NODE_INDEX = buildIndex(initialGc);

export function findInIndex(name: string): NodeIndexEntry[] {
  return NODE_INDEX.filter((n) => n.name === name);
}

export const CAM_HOME = [CX - 1600, CY - 1230, 3200, 2460] as const;

export function camBB(
  nodes: { x: number; y: number }[],
  pad = 300
): [number, number, number, number] {
  let x1 = 1e9;
  let x2 = -1e9;
  let y1 = 1e9;
  let y2 = -1e9;
  nodes.forEach((n) => {
    x1 = Math.min(x1, n.x - 120);
    x2 = Math.max(x2, n.x + 120);
    y1 = Math.min(y1, n.y - 100);
    y2 = Math.max(y2, n.y + 100);
  });
  let w = x2 - x1 + pad * 2;
  let h = y2 - y1 + pad * 2;
  const ar = 1.3;
  if (w / h > ar) h = w / ar;
  else w = h * ar;
  w = Math.max(w, 900);
  w = Math.min(w, 2400);
  return [
    x1 - pad + (x2 - x1 + pad * 2 - w) / 2,
    y1 - pad + (y2 - y1 + pad * 2 - h) / 2,
    w,
    h,
  ];
}

export function camN(x: number, y: number): [number, number, number, number] {
  return [x - 350, y - 270, 700, 540];
}
