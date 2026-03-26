import type { NodeIndexEntry, FbContactoRecord } from "../types/nodes";
import { CT } from "./mapStatic";
import { resolveGc } from "./contactHelpers";
import type { MapCatalogTree, MapMainBranch } from "./mapCatalogTypes";
import { CX, CY, R1, R2, RP, fan, itemPos, pol } from "./mapGeometry";

export type CatalogProject = {
  key: string;
  name: string;
  short: string;
  color: string;
  desc?: {
    title?: string;
    escuelas?: string[];
    sections?: { h: string; t: string }[];
  };
  tematicas: string[];
};

export type CatalogSub = {
  key: string;
  name: string;
  color?: string;
  listMode?: boolean;
  items?: (string | { name: string })[];
  angle?: number;
};

function asProjects(raw: unknown[]): CatalogProject[] {
  return raw as CatalogProject[];
}

function asSubs(raw: unknown[]): CatalogSub[] {
  return raw as CatalogSub[];
}

/** Props slice for tree UIs (mobile + admin) — comes from RTDB catalog via `createMapLayoutFromCatalog`. */
export type MapTreeCatalogSlice = {
  MAIN: MapMainBranch[];
  PROJECTS: CatalogProject[];
  CINOV_SUBS: CatalogSub[];
  ALIADOS_SUBS: CatalogSub[];
  INVEST_SUBS: CatalogSub[];
};

export type MapLayoutFromCatalog = {
  MAIN: MapMainBranch[];
  PROJECTS: CatalogProject[];
  CINOV_SUBS: CatalogSub[];
  ALIADOS_SUBS: CatalogSub[];
  INVEST_SUBS: CatalogSub[];
  mPos: Record<string, { x: number; y: number }>;
  projPos: () => Array<CatalogProject & { x: number; y: number; angle: number }>;
  subPos: <T extends { angle: number }>(
    mk: string,
    subs: T[]
  ) => (T & { x: number; y: number; angle: number })[];
  temaPos: (
    proj: CatalogProject
  ) => { name: string; x: number; y: number; angle: number }[];
  NODE_INDEX: NodeIndexEntry[];
  findInIndex: (name: string) => NodeIndexEntry[];
};

const emptyFb: FbContactoRecord[] = [];
const initialGc = (name: string) => resolveGc(name, emptyFb, CT);

/** Positions and search index derived from the built-in tree fields of `map_catalog`. */
export function createMapLayoutFromCatalog(
  catalog: MapCatalogTree
): MapLayoutFromCatalog {
  const MAIN = catalog.main;
  const PROJECTS = asProjects(catalog.projects as unknown[]);
  const CINOV_SUBS = asSubs(catalog.cinov_subs as unknown[]);
  const ALIADOS_SUBS = asSubs(catalog.aliados_subs as unknown[]);
  const INVEST_SUBS = asSubs(catalog.invest_subs as unknown[]);

  const mPos: Record<string, { x: number; y: number }> = {};
  MAIN.forEach((m) => {
    const [x, y] = pol(CX, CY, R1, m.angle);
    mPos[m.key] = { x, y };
  });

  function subPos<T extends { angle: number }>(
    mk: string,
    subs: T[]
  ): (T & { x: number; y: number; angle: number })[] {
    const o = mPos[mk];
    const m = MAIN.find((n) => n.key === mk);
    if (!o || !m) return [];
    const n = subs.length;
    const a = fan(n, m.angle, 34, 190);
    return subs.map((s, i) => {
      const [x, y] = pol(o.x, o.y, R2, a[i]);
      return { ...s, x, y, angle: a[i] };
    });
  }

  function projPos(): Array<CatalogProject & { x: number; y: number; angle: number }> {
    const o = mPos.proyectos;
    if (!o) return [];
    const proyectosBranch =
      MAIN.find((n) => n.key === "proyectos") ?? MAIN[0];
    const n = PROJECTS.length;
    const a = fan(n, proyectosBranch.angle, 26, 150);
    return PROJECTS.map((p, i) => {
      const [x, y] = pol(o.x, o.y, R2, a[i]);
      return { ...p, x, y, angle: a[i] };
    });
  }

  function temaPos(
    proj: CatalogProject
  ): { name: string; x: number; y: number; angle: number }[] {
    const pp = projPos().find((p) => p.key === proj.key);
    if (!pp) return [];
    const outA = (Math.atan2(pp.y - CY, pp.x - CX) * 180) / Math.PI;
    const arr = proj.tematicas || [];
    const n = arr.length;
    const a = fan(n, outA, 34, 180);
    return arr.map((t, i) => {
      const nm = t;
      const [x, y] = pol(pp.x, pp.y, RP, a[i]);
      return { name: nm, x, y, angle: a[i] };
    });
  }

  function buildIndex(
    getContact: (name: string) => string | null
  ): NodeIndexEntry[] {
    const idx: NodeIndexEntry[] = [];
    const pN = projPos();
    pN.forEach((p) => {
      (p.tematicas || []).forEach((tn) => {
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
      const sp = subPos("investigacion", INVEST_SUBS).find(
        (s) => s.key === sub.key
      );
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

  const NODE_INDEX = buildIndex(initialGc);

  function findInIndex(name: string): NodeIndexEntry[] {
    return NODE_INDEX.filter((n) => n.name === name);
  }

  return {
    MAIN,
    PROJECTS,
    CINOV_SUBS,
    ALIADOS_SUBS,
    INVEST_SUBS,
    mPos,
    projPos,
    subPos,
    temaPos,
    NODE_INDEX,
    findInIndex,
  };
}
