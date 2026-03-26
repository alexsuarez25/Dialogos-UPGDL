import { useState } from "react";
import {
  MAIN,
  PROJECTS,
  CINOV_SUBS,
  ALIADOS_SUBS,
  INVEST_SUBS,
} from "../../../lib/mapStatic";
import { TAGS } from "../../../tagMapDefault.js";
import { getTags } from "../../../lib/tagMapStore";
import type { NoteRow } from "../../../types/nodes";

type HijoLike = {
  key: string;
  name: string;
  color?: string;
  items?: unknown[];
  listMode?: boolean;
  short?: string;
};

export type MobileTreeProps = {
  hasContact: (name: string) => boolean;
  gc: (name: string) => string | null;
  getTagsForItem?: (name: string) => string[];
  cHijos: Record<string, HijoLike[]>;
  cNietos: Record<string, Array<{ name: string; contact?: string }>>;
  deletedNodes: string[];
  notes: Record<string, NoteRow[]>;
};

export function MobileTree({
  hasContact,
  gc,
  getTagsForItem,
  cHijos,
  cNietos,
  deletedNodes,
  notes,
}: MobileTreeProps) {
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
          [...subs, ...(cHijos[main.key] || [])].forEach((s) => {
            const its = [
              ...(s.items || []).map((i) =>
                typeof i === "string" ? i : i
              ),
              ...((cNietos[s.key] || []).map((n) => n.name)),
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
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 100,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxHeight: "80vh",
            background: "#FFFDF8",
            borderRadius: "16px 16px 0 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 0,
              padding: "18px 20px 12px",
              borderBottom: "1px solid #C4A55A33",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#2A2520",
                }}
              >
                {viewItem.name || ""}
              </span>
              {gc(viewItem.name) ? (
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#C4A55A",
                    fontWeight: 600,
                  }}
                >
                  👤 {gc(viewItem.name)}
                </span>
              ) : (
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "#CC3333",
                    fontWeight: 600,
                  }}
                >
                  ⚠ Sin contacto
                </span>
              )}
              {resolveTags(viewItem.name).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 4,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  {resolveTags(viewItem.name).map((tg, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#C4A55A",
                        background: "#C4A55A1F",
                        border: "1px solid #C4A55A40",
                        borderRadius: 10,
                        padding: "2px 8px",
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </div>
              )}
            </div>
<button type="button" 
              onClick={() => setViewItem(null)}
              style={{
                background: "transparent",
                border: "1px solid #C4A55A50",
                borderRadius: 8,
                width: 32,
                height: 32,
                fontSize: 15,
                cursor: "pointer",
                color: "#8A8070",
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 20px 20px",
            }}
          >
            {Array.isArray(notes[viewItem.name]) &&
            notes[viewItem.name].length > 0 ? (
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#C4A55A",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: 8,
                  }}
                >
                  Notas ({notes[viewItem.name].length})
                </span>
                {(notes[viewItem.name] || [])
                  .filter((n) => n)
                  .map((n, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#C4A55A0A",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: "#8A8070" }}
                      >
                        {n.date || ""}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#2A2520",
                          marginTop: 3,
                        }}
                      >
                        {String(
                          (n as NoteRow).text ?? n ?? ""
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "#8A8070",
                  fontStyle: "italic",
                }}
              >
                Sin notas registradas
              </span>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div
      style={{
        fontFamily:
          "'Source Sans 3','Segoe UI',system-ui,sans-serif",
        background: "#F5F2EB",
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800;900&family=Cormorant+Garamond:wght@400;700;800&display=swap" />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 10,
          background: "white",
          padding: "12px 16px",
          alignItems: "center",
          flexShrink: 0,
          borderBottom: "1px solid #C4A55A40",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#C4A55A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{ fontSize: 11, fontWeight: 900, color: "white" }}
          >
            UP
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#2A2520",
              fontFamily: "'Cormorant Garamond',serif",
            }}
          >
            Diálogos con el Entorno
          </span>
          <span style={{ fontSize: 9, color: "#8A8070" }}>
            Universidad Panamericana Guadalajara
          </span>
        </div>
      </div>
      <div
        style={{
          padding: "10px 16px",
          background: "white",
          borderBottom: "1px solid #C4A55A25",
          flexShrink: 0,
        }}
      >
<button type="button" 
          onClick={() => setTagOpen((x) => !x)}
          style={{
            width: "100%",
            padding: "11px 14px",
            fontSize: 14,
            fontWeight: 600,
            color: selTag ? "#C4A55A" : "#8A8070",
            background: selTag ? "#C4A55A0F" : "#C4A55A0A",
            border: `1px solid ${
              selTag ? "#C4A55A50" : "#C4A55A30"
            }`,
            borderRadius: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <span style={{ flex: 1, textAlign: "left" }}>
            {selTag || "Seleccionar temática estratégica..."}
          </span>
        </button>
        {tagOpen && (
          <div
            style={{
              maxHeight: "35vh",
              overflowY: "auto",
              marginTop: 6,
              border: "1px solid #C4A55A25",
              borderRadius: 10,
              background: "white",
            }}
          >
            {selTag ? (
              <div
                onClick={() => {
                  setSelTag("");
                  setTagOpen(false);
                }}
                style={{
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#CC3333",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderBottom: "1px solid #C4A55A10",
                }}
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
                style={{
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: selTag === t ? 700 : 500,
                  color: selTag === t ? "#C4A55A" : "#2A2520",
                  cursor: "pointer",
                  borderBottom: "1px solid #C4A55A08",
                  background:
                    selTag === t ? "#C4A55A0A" : "transparent",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
        {selTag ? (
          <span
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#C4A55A",
              fontWeight: 700,
            }}
          >
            {tagMatches.length} resultado
            {tagMatches.length !== 1 ? "s" : ""} para &quot;{selTag}
            &quot;
          </span>
        ) : null}
      </div>
      {selTag && tagMatches.length > 0 ? (
        <div
          style={{
            background: "white",
            borderBottom: "2px solid #C4A55A30",
            maxHeight: "30vh",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {tagMatches
            .sort((a, b) => a.name.localeCompare(b.name, "es"))
            .map((r, i) => (
              <div
                key={i}
                onClick={() => setViewItem(r)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #C4A55A08",
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: hasContact(r.name)
                      ? "#00695C"
                      : "#CC3333",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#2A2520",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.name}
                  </span>
                  <span style={{ fontSize: 10, color: "#8A8070" }}>
                    {r.sub} · {r.main}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: "#C4A55A",
                    flexShrink: 0,
                  }}
                >
                  ›
                </span>
              </div>
            ))}
        </div>
      ) : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
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
          const ch = (cHijos[m.key] || []).map((h) => ({
            ...h,
            items: [
              ...(h.items || []),
              ...((cNietos[h.key] || []).map((n) => n.name)),
            ],
            isCustom: true,
          }));
          return (
            <div
              key={m.key}
              style={{ borderBottom: "2px solid #C4A55A20" }}
            >
              <div
                onClick={() => tog("p_" + m.key)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                  padding: "15px 16px",
                  cursor: "pointer",
                  background: isO ? `${m.color}08` : "white",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "#C4A55A",
                    transform: isO ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▶
                </span>
                <div
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: m.color,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 17,
                    fontWeight: 800,
                    color: m.color,
                    fontFamily: "'Cormorant Garamond',serif",
                  }}
                >
                  {(m.name || "").replace(/\n/g, " ")}
                </span>
              </div>
              {isO
                ? [...bi, ...ch].map((s, si) => {
                    const sk = s.key;
                    const sN = (s.name || "").replace(/\n/g, " ");
                    const isS = !!exp["s_" + sk];
                    const ri = (s.items || []).map((i) =>
                      typeof i === "string"
                        ? i
                        : String((i as { name?: string }).name ?? i)
                    );
                    const ci = !("isCustom" in s && s.isCustom) &&
                      cNietos[sk]
                      ? cNietos[sk].map((n) => n.name)
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
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 8,
                            alignItems: "center",
                            padding: "12px 16px 12px 32px",
                            cursor: "pointer",
                            borderTop: "1px solid #C4A55A0A",
                            background: isS
                              ? `${s.color || m.color}08`
                              : "transparent",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "#C4A55A",
                              transform: isS
                                ? "rotate(90deg)"
                                : "none",
                              transition: "transform 0.2s",
                              display: "inline-block",
                            }}
                          >
                            ▶
                          </span>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: s.color || m.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#2A2520",
                            }}
                          >
                            {sN}
                          </span>
                          <span style={{ fontSize: 10, color: "#8A8070" }}>
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
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: 8,
                                    alignItems: "center",
                                    padding:
                                      "11px 16px 11px 52px",
                                    cursor: "pointer",
                                    borderTop:
                                      "1px solid #C4A55A06",
                                    background:
                                      selTag &&
                                      resolveTags(nm).includes(
                                        selTag
                                      )
                                        ? "#C4A55A14"
                                        : "transparent",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      background: hasContact(nm)
                                        ? "#00695C"
                                        : "#CC3333",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      flex: 1,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#2A2520",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {nm}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      color: "#C4A55A",
                                    }}
                                  >
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
