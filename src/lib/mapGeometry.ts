import { CX, CY, R3, fan, pol } from "./mapGeometryCore";

export {
  WW,
  HH,
  CX,
  CY,
  R1,
  R2,
  R3,
  RP,
  NR0,
  NR1,
  NR2,
  NR3,
  pol,
  fan,
  CAM_HOME,
  camBB,
  camN,
} from "./mapGeometryCore";

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
