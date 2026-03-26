import { TAG_MAP_DEFAULT } from "../tagMapDefault.js";
import { TAGS } from "../tagMapDefault.js";

/** Live tag map; RTDB subscription mutates `.map` */
export const tagMapLive = { map: { ...TAG_MAP_DEFAULT } as Record<string, number[]> };

export function getTags(name: string): string[] {
  const indices = tagMapLive.map[name];
  if (!indices) return [];
  return indices.map((i) => TAGS[i]).filter(Boolean);
}
