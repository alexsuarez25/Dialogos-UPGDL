import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  type Unsubscribe,
} from "firebase/database";
import { app } from "./client";
import { buildBuiltInCatalogSnapshot } from "../mapCatalogExport";
import type { MapCatalogRtdb, MapCatalogTree } from "../mapCatalogTypes";
import { MAP_CATALOG_ROOT } from "./mapCustomNodesRealtime";

const db = getDatabase(app);
const CATALOG_REF = ref(db, MAP_CATALOG_ROOT);

export type LoadDefaultCatalogMode = "mergeBuiltIn" | "replaceAll";

/**
 * Writes the built-in tree from source (`mapStatic` via `buildBuiltInCatalogSnapshot`) into RTDB `map_catalog`.
 * Use when pointing at a new Firebase project or after wiping the DB.
 *
 * - **mergeBuiltIn** — Updates only `main`, `projects`, `*subs`, `version`, `generatedAt`. Keeps existing `custom_nietos`.
 * - **replaceAll** — Replaces the entire `map_catalog` document with defaults and `custom_nietos: {}`.
 */
export async function loadDefaultMapCatalogIntoDatabase(
  mode: LoadDefaultCatalogMode
): Promise<void> {
  const base = buildBuiltInCatalogSnapshot();
  if (mode === "replaceAll") {
    await set(CATALOG_REF, {
      ...base,
      custom_nietos: {},
    });
    return;
  }
  await update(CATALOG_REF, {
    version: base.version,
    generatedAt: base.generatedAt,
    main: base.main,
    projects: base.projects,
    cinov_subs: base.cinov_subs,
    aliados_subs: base.aliados_subs,
    invest_subs: base.invest_subs,
  });
}

/** Copy `map_catalog/built_in_v1` and `custom_map_nodes/*` into `map_catalog` when the new tree is missing. */
async function migrateLegacyCatalogIfNeeded(): Promise<void> {
  const snap = await get(CATALOG_REF);
  const v = snap.exists() ? (snap.val() as Record<string, unknown>) : null;
  if (v && Array.isArray(v.main) && v.main.length > 0) return;

  const oldBuilt = await get(ref(db, `${MAP_CATALOG_ROOT}/built_in_v1`));
  const oldN = await get(ref(db, "custom_map_nodes/nietos"));

  const tree: MapCatalogTree = oldBuilt.exists()
    ? (oldBuilt.val() as MapCatalogTree)
    : buildBuiltInCatalogSnapshot();

  const custom_nietos: Record<string, unknown> = {};
  if (oldN.exists() && oldN.val() && typeof oldN.val() === "object") {
    Object.assign(custom_nietos, oldN.val() as object);
  }
  if (v?.custom_nietos && typeof v.custom_nietos === "object") {
    Object.assign(custom_nietos, v.custom_nietos as object);
  }

  const payload: MapCatalogRtdb = {
    ...tree,
    custom_nietos: custom_nietos as MapCatalogRtdb["custom_nietos"],
  };
  await set(CATALOG_REF, payload);
}

/**
 * Ensures `map_catalog` has a valid built-in tree. Preserves `custom_nietos` when patching.
 */
export async function ensureMapCatalogSeeded(): Promise<void> {
  await migrateLegacyCatalogIfNeeded();
  let snap = await get(CATALOG_REF);
  if (!snap.exists()) {
    await set(CATALOG_REF, {
      ...buildBuiltInCatalogSnapshot(),
      custom_nietos: {},
    });
    return;
  }
  const val = snap.val() as Record<string, unknown>;
  if (Array.isArray(val.main) && val.main.length > 0) return;

  const base = buildBuiltInCatalogSnapshot();
  await update(CATALOG_REF, {
    version: base.version,
    generatedAt: base.generatedAt,
    main: base.main,
    projects: base.projects,
    cinov_subs: base.cinov_subs,
    aliados_subs: base.aliados_subs,
    invest_subs: base.invest_subs,
  });
}

export function subscribeMapCatalog(
  onData: (data: MapCatalogRtdb | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onValue(
    CATALOG_REF,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.val() as MapCatalogRtdb);
    },
    (err) => onError?.(err)
  );
}

/** @deprecated use `ensureMapCatalogSeeded` */
export async function ensureBuiltInMapCatalogSeeded(): Promise<void> {
  return ensureMapCatalogSeeded();
}

/** @deprecated use `subscribeMapCatalog` */
export function subscribeBuiltInCatalog(
  onData: (data: MapCatalogRtdb | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return subscribeMapCatalog(onData, onError);
}
