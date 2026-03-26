/**
 * Default built-in tree (for RTDB `map_catalog` when seeded). Extra micro-nodes use `custom_nietos`.
 */
import {
  MAIN,
  PROJECTS,
  CINOV_SUBS,
  ALIADOS_SUBS,
  INVEST_SUBS,
} from "./mapStatic";

export function buildBuiltInCatalogSnapshot(): {
  version: number;
  generatedAt: number;
  main: typeof MAIN;
  projects: typeof PROJECTS;
  cinov_subs: typeof CINOV_SUBS;
  aliados_subs: typeof ALIADOS_SUBS;
  invest_subs: typeof INVEST_SUBS;
} {
  return {
    version: 1,
    generatedAt: Date.now(),
    main: MAIN,
    projects: PROJECTS,
    cinov_subs: CINOV_SUBS,
    aliados_subs: ALIADOS_SUBS,
    invest_subs: INVEST_SUBS,
  };
}
