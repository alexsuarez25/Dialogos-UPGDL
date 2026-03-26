import type { DescSection } from "../../../types/nodes";
import type { Palette } from "../../../types/palette";

type CentralDescribe = {
  title?: string;
  objetivos?: { h: string; t: string }[];
  sections?: DescSection[];
  escuelas?: string[];
};

export function CentralPanel({
  data,
  accent,
  onClose,
  isCentral,
  resolveTags,
  palette,
}: {
  data: CentralDescribe | null;
  accent?: string;
  onClose: () => void;
  isCentral: boolean;
  resolveTags: (title: string) => string[];
  palette: Palette;
}) {
  const C = palette;
  const gold = C.gold;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 420,
        height: "100%",
        zIndex: 30,
        background: C.panelBg,
        borderLeft: `2px solid ${gold}40`,
        boxShadow: "-6px 0 36px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        animation: "slI 0.45s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 0,
          padding: "22px 24px 16px",
          borderBottom: `1px solid ${gold}25`,
          flexShrink: 0,
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, paddingRight: 12 }}>
          <span
            style={{
              fontSize: 10,
              color: gold,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: 6,
            }}
          >
            {isCentral ? "Universidad Panamericana" : "Proyecto"}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: C.textDk,
              lineHeight: 1.3,
              fontFamily: "'Cormorant Garamond',serif",
              display: "block",
            }}
          >
            {data?.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${gold}40`,
            color: C.textLt,
            borderRadius: 8,
            width: 32,
            height: 32,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 28px" }}>
        {isCentral ? (
          <>
            {(data?.objetivos || []).map((o, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: C.blue,
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  {o.h}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: C.textMd,
                    lineHeight: 1.7,
                    display: "block",
                  }}
                >
                  {o.t}
                </span>
              </div>
            ))}
          </>
        ) : (
          <>
            {(data?.sections || []).map((s, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  {s.h}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: C.textMd,
                    lineHeight: 1.8,
                    display: "block",
                  }}
                >
                  {s.t}
                </span>
              </div>
            ))}
            {(data?.escuelas?.length || 0) > 0 && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 18,
                  borderTop: `1px solid ${gold}20`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: gold,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    marginBottom: 10,
                    display: "block",
                  }}
                >
                  Escuelas y Facultades
                </span>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    listStyleType: "disc",
                  }}
                >
                  {(data?.escuelas || []).map((e, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 15,
                        color: C.textMd,
                        lineHeight: 2.1,
                        fontWeight: 600,
                      }}
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data?.title && resolveTags(data.title).length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 14,
                  borderTop: `1px solid ${gold}20`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: gold,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Temáticas estratégicas
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {resolveTags(data.title).map((tg, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: gold,
                        background: `${gold}12`,
                        border: `1px solid ${gold}22`,
                        borderRadius: 12,
                        padding: "3px 12px",
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg,${accent || gold},${gold})`,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
