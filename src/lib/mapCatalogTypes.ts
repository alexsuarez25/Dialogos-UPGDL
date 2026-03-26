/**
 * RTDB `map_catalog` — built-in tree plus optional extra micro-nodes (`custom_nietos`).
 */
import type { CustomNietosState } from "./firebase/mapCustomNodesRealtime";

export type MapMainBranch = {
  key: string;
  name: string;
  color: string;
  angle: number;
};

/** Tree fields used for layout / search (from DB or seed). */
export type MapCatalogTree = {
  version?: number;
  generatedAt?: number;
  main: MapMainBranch[];
  projects: unknown[];
  cinov_subs: unknown[];
  aliados_subs: unknown[];
  invest_subs: unknown[];
};

/** Full document at `map_catalog`. */
export type MapCatalogRtdb = MapCatalogTree & {
  custom_nietos?: CustomNietosState;
};

/** @deprecated alias */
export type MapBuiltInCatalogV1 = MapCatalogTree;

export function isValidMapCatalog(v: unknown): v is MapCatalogTree {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.main) &&
    o.main.length > 0 &&
    Array.isArray(o.projects) &&
    Array.isArray(o.cinov_subs) &&
    Array.isArray(o.aliados_subs) &&
    Array.isArray(o.invest_subs)
  );
}
