import { TAGS } from "../tagMapDefault.js";

/** Live tag map; `Dashboard` syncs from `tag_map/entries` only */
export const tagMapLive = { map: {} as Record<string, number[]> };

export function getTags(name: string): string[] {
  const indices = tagMapLive.map[name];
  if (!indices) return [];
  return indices.map((i) => TAGS[i]).filter(Boolean);
}
