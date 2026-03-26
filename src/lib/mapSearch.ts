import { TAGS } from "../tagMapDefault.js";
import { KEYWORDS } from "./mapStatic";
import type { NodeIndexEntry } from "../types/nodes";
import type { CatalogProject } from "./mapLayoutFromCatalog";

export interface SmartSearchResult {
  tags: string[];
  nodes: NodeIndexEntry[];
}

export function smartSearch(
  query: string,
  tagMap: Record<string, number[]>,
  projects: CatalogProject[],
  nodeIndex: NodeIndexEntry[],
  findInIndex: (name: string) => NodeIndexEntry[]
): SmartSearchResult {
  try {
    if (!query || query.length < 2) return { tags: [], nodes: [] };
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const matchedTagIdx = new Set<number>();
    for (const [kw, indices] of Object.entries(KEYWORDS)) {
      if (q.includes(kw) || kw.includes(q)) {
        indices.forEach((i) => matchedTagIdx.add(i));
      }
    }
    TAGS.forEach((tag, i) => {
      const tn = tag
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (tn.includes(q) || q.includes(tn.split(" ")[0])) matchedTagIdx.add(i);
    });
    const matchedNodes: NodeIndexEntry[] = [];
    const seen = new Set<string>();
    projects.forEach((p) => {
      const sn = p.short
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const fn = (p.desc?.title || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (
        sn.includes(q) ||
        fn.includes(q) ||
        q.split(" ").some((w) => w.length > 2 && (sn.includes(w) || fn.includes(w)))
      ) {
        if (!seen.has(p.short)) {
          seen.add(p.short);
          matchedNodes.push({
            name: p.short,
            type: "Proyecto",
            parent: "Proyectos",
            branch: "proyectos",
            projKey: p.key,
            matchType: "direct",
          });
        }
      }
    });
    nodeIndex.forEach((n) => {
      const nn = n.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (
        nn.includes(q) ||
        q.split(" ").some((w) => w.length > 2 && nn.includes(w))
      ) {
        if (!seen.has(n.name)) {
          seen.add(n.name);
          matchedNodes.push({ ...n, matchType: "direct" });
        }
      }
    });
    if (matchedTagIdx.size > 0) {
      Object.entries(tagMap).forEach(([name, indices]) => {
        if (seen.has(name)) return;
        if (indices.some((i) => matchedTagIdx.has(i))) {
          const entry = findInIndex(name);
          if (entry.length > 0) {
            seen.add(name);
            matchedNodes.push({ ...entry[0], matchType: "tag" });
          }
        }
      });
    }
    const matchedTags = [...matchedTagIdx].map((i) => TAGS[i]);
    return {
      tags: matchedTags || [],
      nodes: (matchedNodes || []).slice(0, 30),
    };
  } catch (e) {
    console.error("smartSearch error:", e);
    return { tags: [], nodes: [] };
  }
}
