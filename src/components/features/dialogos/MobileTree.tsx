import { useState } from "react";
import type { MapTreeCatalogSlice } from "../../../lib/mapLayoutFromCatalog";
import { customNietosForChildKey } from "../../../lib/firebase/mapCustomNodesRealtime";
import { TAGS } from "../../../tagMapDefault.js";
import { getTags } from "../../../lib/tagMapStore";
import type { NoteRow } from "../../../types/nodes";
import { cn } from "../../../lib/cn";

export type MobileTreeProps = {
  hasContact: (name: string) => boolean;
  gc: (name: string) => string | null;
  getTagsForItem?: (name: string) => string[];
  cNietos: Record<string, Array<{ name: string; contact?: string }>>;
  deletedNodes: string[];
  notes: Record<string, NoteRow[]>;
  treeCatalog: MapTreeCatalogSlice;
};

export function MobileTree({
  hasContact,
  gc,
  getTagsForItem,
  cNietos,
  deletedNodes,
  notes,
  treeCatalog,
}: MobileTreeProps) {
  const { MAIN, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS } = treeCatalog;
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const [selTag, setSelTag] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [viewItem, setViewItem] = useState<{
    name: string;
    sub?: string;
    main?: string;
    color?: string;
  } | null>(null);
  const tog = (k: string) =>
    setExp((x) => ({ ...x, [k]: !x[k] }));

  const resolveTags = (name: string) =>
    typeof getTagsForItem === "function"
      ? getTagsForItem(name)
      : getTags(name);

  const tagMatches = selTag
    ? (() => {
        const m: Array<{
          name: string;
          sub: string;
          main: string;
          color: string;
        }> = [];
        const check = (name: string) => {
          if (!name || (deletedNodes || []).includes(name)) return false;
          const tgs = resolveTags(name);
          return (tgs || []).includes(selTag);
        };
        MAIN.forEach((main) => {
          const subs =
            main.key === "proyectos"
              ? PROJECTS.map((p) => ({
                  key: p.key,
                  name: p.short,
                  items: p.tematicas || [],
                }))
              : main.key === "cinov"
                ? CINOV_SUBS
                : main.key === "aliados"
                  ? ALIADOS_SUBS
                  : main.key === "investigacion"
                    ? INVEST_SUBS
                    : [];
          subs.forEach((s) => {
            const its = [
              ...(s.items || []).map((i) =>
                typeof i === "string" ? i : i
              ),
              ...customNietosForChildKey(cNietos, s.key).map((n) => n.name),
            ].filter((n) => !(deletedNodes || []).includes(n));
            its.forEach((name) => {
              if (check(name))
                m.push({
                  name,
                  sub: (s.name || "").replace(/\n/g, " "),
                  main: main.name.replace(/\n/g, " "),
                  color: main.color,
                });
            });
          });
        });
        return m;
      })()
    : [];

  const sortedTags = TAGS.slice().sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const popup =
    viewItem ? (
      <div
        onClick={() => setViewItem(null)}
        className="fixed inset-0 z-100 flex items-end bg-black/30"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#FFFDF8]"
        >
          <div className="flex shrink-0 flex-row items-start justify-between gap-0 border-b border-brand-gold/20 px-5 pb-3 pt-[18px]">
            <div className="min-w-0 flex-1">
              <span className="block text-lg font-black text-text-dk">
                {viewItem.name || ""}
              </span>
              {gc(viewItem.name) ? (
                <span className="mt-1.5 block text-xs font-semibold text-brand-gold">
                  👤 {gc(viewItem.name)}
                </span>
              ) : (
                <span className="mt-1.5 block text-[11px] font-semibold text-danger">
                  ⚠ Sin contacto
                </span>
              )}
              {resolveTags(viewItem.name).length > 0 && (
                <div className="mt-2 flex flex-row flex-wrap gap-1">
                  {resolveTags(viewItem.name).map((tg, i) => (
                    <span
                      key={i}
                      className="rounded-[10px] border border-brand-gold/40 bg-brand-gold/15 px-2 py-0.5 text-[9px] font-bold text-brand-gold"
                    >
                      {tg}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewItem(null)}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/50 bg-transparent text-[15px] text-text-lt"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {Array.isArray(notes[viewItem.name]) &&
            notes[viewItem.name].length > 0 ? (
              <div>
                <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-wide text-brand-gold">
                  Notas ({notes[viewItem.name].length})
                </span>
                {(notes[viewItem.name] || [])
                  .filter((n) => n)
                  .map((n, i) => (
                    <div
                      key={i}
                      className="mb-1.5 rounded-lg bg-brand-gold/6 p-2.5"
                    >
                      <span className="text-[10px] text-text-lt">
                        {n.date || ""}
                      </span>
                      <span className="mt-1 block text-xs text-text-dk">
                        {String(
                          (n as NoteRow).text ?? n ?? ""
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="text-xs italic text-text-lt">
                Sin notas registradas
              </span>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-bg font-sans">
      <div className="flex shrink-0 flex-row items-center gap-2.5 border-b border-brand-gold/40 bg-brand-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold">
          <span className="text-[11px] font-black text-brand-white">
            UP
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-display text-sm font-extrabold text-text-dk">
            Diálogos con el Entorno
          </span>
          <span className="text-[9px] text-text-lt">
            Universidad Panamericana Guadalajara
          </span>
        </div>
      </div>
      <div className="shrink-0 border-b border-brand-gold/25 bg-brand-white px-4 py-2.5">
        <button
          type="button"
          onClick={() => setTagOpen((x) => !x)}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-[10px] border px-3.5 py-[11px] text-left text-sm font-semibold",
            selTag
              ? "border-brand-gold/50 bg-brand-gold/10 text-brand-gold"
              : "border-brand-gold/30 bg-brand-gold/6 text-text-lt"
          )}
        >
          <span className="min-w-0 flex-1 text-left">
            {selTag || "Seleccionar temática estratégica..."}
          </span>
        </button>
        {tagOpen && (
          <div className="mt-1.5 max-h-[35vh] overflow-y-auto rounded-[10px] border border-brand-gold/25 bg-brand-white">
            {selTag ? (
              <div
                onClick={() => {
                  setSelTag("");
                  setTagOpen(false);
                }}
                className="cursor-pointer border-b border-brand-gold/10 px-3.5 py-3 text-[13px] font-semibold text-danger"
              >
                ✕ Limpiar filtro
              </div>
            ) : null}
            {sortedTags.map((t, i) => (
              <div
                key={i}
                onClick={() => {
                  setSelTag(t);
                  setTagOpen(false);
                }}
                className={cn(
                  "cursor-pointer border-b border-brand-gold/8 px-3.5 py-[11px] text-[13px] text-text-dk",
                  selTag === t ? "bg-brand-gold/10 font-bold text-brand-gold" : "font-medium"
                )}
              >
                {t}
              </div>
            ))}
          </div>
        )}
        {selTag ? (
          <span className="mt-2 block text-[11px] font-bold text-brand-gold">
            {tagMatches.length} resultado
            {tagMatches.length !== 1 ? "s" : ""} para &quot;{selTag}
            &quot;
          </span>
        ) : null}
      </div>
      {selTag && tagMatches.length > 0 ? (
        <div className="max-h-[30vh] shrink-0 overflow-y-auto border-b-2 border-b-brand-gold/30 bg-brand-white">
          {tagMatches
            .sort((a, b) => a.name.localeCompare(b.name, "es"))
            .map((r, i) => (
              <div
                key={i}
                onClick={() => setViewItem(r)}
                className="flex cursor-pointer flex-row items-center gap-2 border-b border-brand-gold/8 px-4 py-3"
              >
                <div
                  className={cn(
                    "h-[9px] w-[9px] shrink-0 rounded-full",
                    hasContact(r.name) ? "bg-brand-green" : "bg-danger"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-dk">
                    {r.name}
                  </span>
                  <span className="text-[10px] text-text-lt">
                    {r.sub} · {r.main}
                  </span>
                </div>
                <span className="shrink-0 text-sm text-brand-gold">›</span>
              </div>
            ))}
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {MAIN.map((m) => {
          const isO = !!exp["p_" + m.key];
          const bi =
            m.key === "proyectos"
              ? PROJECTS.map((p) => ({
                  key: p.key,
                  name: p.short,
                  color: p.color,
                  items: p.tematicas || [],
                }))
              : m.key === "cinov"
                ? CINOV_SUBS
                : m.key === "aliados"
                  ? ALIADOS_SUBS
                  : m.key === "investigacion"
                    ? INVEST_SUBS
                    : [];
          return (
            <div
              key={m.key}
              className="border-b-2 border-b-brand-gold/20"
            >
              <div
                onClick={() => tog("p_" + m.key)}
                className={cn(
                  "flex cursor-pointer flex-row items-center gap-2.5 px-4 py-[15px]",
                  isO ? "bg-opacity-50" : "bg-brand-white"
                )}
                style={
                  isO
                    ? { background: `${m.color}14` }
                    : { background: "white" }
                }
              >
                <span
                  className={cn(
                    "inline-block text-[13px] text-brand-gold transition-transform duration-200",
                    isO && "rotate-90"
                  )}
                >
                  ▶
                </span>
                <div
                  className="h-[15px] w-[15px] rounded-full"
                  style={{ background: m.color }}
                />
                <span
                  className="flex-1 font-display text-[17px] font-extrabold"
                  style={{ color: m.color }}
                >
                  {(m.name || "").replace(/\n/g, " ")}
                </span>
              </div>
              {isO
                ? bi.map((s, si) => {
                    const sk = s.key;
                    const sN = (s.name || "").replace(/\n/g, " ");
                    const isS = !!exp["s_" + sk];
                    const ri = (s.items || []).map((i) =>
                      typeof i === "string"
                        ? i
                        : String((i as { name?: string }).name ?? i)
                    );
                    const ci = sk
                      ? customNietosForChildKey(cNietos, sk).map((n) => n.name)
                      : [];
                    const ai = [...ri, ...ci]
                      .filter(
                        (n) =>
                          !(deletedNodes || []).includes(n)
                      )
                      .sort((a, b) =>
                        String(a).localeCompare(String(b), "es")
                      );
                    return (
                      <div key={si}>
                        <div
                          onClick={() => tog("s_" + sk)}
                          className="flex cursor-pointer flex-row items-center gap-2 border-t border-brand-gold/6 py-3 pl-8 pr-4"
                          style={{
                            background: isS
                              ? `${s.color || m.color}14`
                              : "transparent",
                          }}
                        >
                          <span
                            className={cn(
                              "inline-block text-[10px] text-brand-gold transition-transform duration-200",
                              isS && "rotate-90"
                            )}
                          >
                            ▶
                          </span>
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              background: s.color || m.color,
                            }}
                          />
                          <span className="flex-1 text-sm font-bold text-text-dk">
                            {sN}
                          </span>
                          <span className="text-[10px] text-text-lt">
                            {String(ai.length)}
                          </span>
                        </div>
                        {isS
                          ? ai.map((nm, ni) =>
                              nm ? (
                                <div
                                  key={ni}
                                  onClick={() =>
                                    setViewItem({ name: nm })
                                  }
                                  className={cn(
                                    "flex cursor-pointer flex-row items-center gap-2 border-t border-brand-gold/6 py-[11px] pl-[52px] pr-4",
                                    selTag &&
                                      resolveTags(nm).includes(
                                        selTag
                                      ) &&
                                      "bg-brand-gold/15"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "h-2 w-2 shrink-0 rounded-full",
                                      hasContact(nm)
                                        ? "bg-brand-green"
                                        : "bg-danger"
                                    )}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-dk">
                                    {nm}
                                  </span>
                                  <span className="text-[13px] text-brand-gold">
                                    ›
                                  </span>
                                </div>
                              ) : null
                            )
                          : null}
                      </div>
                    );
                  })
                : null}
            </div>
          );
        })}
      </div>
      {popup}
    </div>
  );
}
