import { useState, useRef, useCallback } from "react";
import { WW } from "../lib/mapGeometry";

type ViewBox = readonly [number, number, number, number];

export function useCamera(init: ViewBox) {
  const initial: [number, number, number, number] = [...init];
  const [vb, setVb] = useState<[number, number, number, number]>(initial);
  const cur = useRef<[number, number, number, number]>(initial);
  const an = useRef<number | null>(null);
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const flyTo = useCallback((tgt: number[], dur = 850) => {
    if (an.current) cancelAnimationFrame(an.current);
    const fr = [...cur.current];
    const st = performance.now();
    const tk = (now: number) => {
      const t = Math.min((now - st) / dur, 1);
      const e = ease(t);
      const nx = fr.map((v, i) => v + (tgt[i] - v) * e);
      cur.current = nx as [number, number, number, number];
      setVb(nx as [number, number, number, number]);
      if (t < 1) an.current = requestAnimationFrame(tk);
    };
    an.current = requestAnimationFrame(tk);
  }, []);
  const zoomAt = useCallback(
    (cx: number, cy: number, el: HTMLElement, f: number) => {
      if (an.current) cancelAnimationFrame(an.current);
      const r = el.getBoundingClientRect();
      const [vx, vy, vw, vh] = cur.current;
      const mx = vx + ((cx - r.left) / r.width) * vw;
      const my = vy + ((cy - r.top) / r.height) * vh;
      const nw = Math.max(800, Math.min(WW * 0.8, vw * f));
      const nh = (nw * vh) / vw;
      cur.current = [
        mx - (mx - vx) * (nw / vw),
        my - (my - vy) * (nh / vh),
        nw,
        nh,
      ];
      setVb([...cur.current]);
    },
    []
  );
  const panBy = useCallback((dx: number, dy: number, el: HTMLElement) => {
    if (an.current) cancelAnimationFrame(an.current);
    const r = el.getBoundingClientRect();
    const [vx, vy, vw, vh] = cur.current;
    cur.current = [
      vx - (dx * vw) / r.width,
      vy - (dy * vh) / r.height,
      vw,
      vh,
    ];
    setVb([...cur.current]);
  }, []);
  return { vb, flyTo, zoomAt, panBy };
}
