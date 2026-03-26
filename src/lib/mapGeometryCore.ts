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
