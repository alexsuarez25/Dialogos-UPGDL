import { useEffect, useState } from "react";
import type { MapTreeCatalogSlice } from "../../../lib/mapLayoutFromCatalog";
import type { Palette } from "../../../types/palette";
import {
  customNietosForChildKey,
  type CustomNietosState,
} from "../../../lib/firebase/mapCustomNodesRealtime";
import { loadDefaultMapCatalogIntoDatabase } from "../../../lib/firebase/mapCatalogRealtime";
import { seedTagMapFromObject } from "../../../lib/firebase/tagMapRealtime";
import { TAG_MAP_DEFAULT } from "../../../tagMapDefault.js";

type NodesAdminPanelProps = {
  open: boolean;
  onClose: () => void;
  palette: Palette;
  treeCatalog: MapTreeCatalogSlice;
  cNietos: CustomNietosState;
  deletedNodes: string[];
  addNieto: (childKey: string, nd: { name: string; contact?: string }) => void;
  delNieto: (childKey: string, nodeName: string) => void;
  gc: (name: string) => string | null;
  hasContact: (name: string) => boolean;
};

export function NodesAdminPanel({
  open,
  onClose,
  palette: C,
  treeCatalog,
  cNietos,
  deletedNodes,
  addNieto,
  delNieto,
  gc,
  hasContact,
}: NodesAdminPanelProps) {
  const { MAIN, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS } = treeCatalog;
  const [adminPadre, setAdminPadre] = useState("");
  const [adminChildKey, setAdminChildKey] = useState("");
  const [adminForm, setAdminForm] = useState({ name: "", contact: "" });
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAdminPadre("");
      setAdminChildKey("");
      setAdminForm({ name: "", contact: "" });
      setDelConfirm(null);
      setMigrateMsg(null);
    }
  }, [open]);

  if (!open) return null;

  const subsOptions =
    adminPadre === "cinov"
      ? CINOV_SUBS
      : adminPadre === "aliados"
        ? ALIADOS_SUBS
        : adminPadre === "investigacion"
          ? INVEST_SUBS
          : PROJECTS.map((p) => ({ key: p.key, name: p.short }));

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        width: 480,
        maxHeight: "82vh",
        background: C.white,
        border: `1px solid ${C.gold}30`,
        borderRadius: 16,
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 22px 12px",
          borderBottom: `1px solid ${C.gold}15`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: C.textDk,
            fontFamily: "'Cormorant Garamond',serif",
          }}
        >
          Micro-nodos (bajo categoría existente)
        </span>
        <button
          type="button"
          onClick={() => onClose()}
          style={{
            background: "transparent",
            border: `1px solid ${C.gold}30`,
            borderRadius: 8,
            width: 28,
            height: 28,
            fontSize: 13,
            cursor: "pointer",
            color: C.textLt,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.gold,
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: 8,
          }}
        >
          1. Rama principal
        </div>
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}
        >
          {MAIN.map((m) => (
            <button
              type="button"
              key={m.key}
              onClick={() => {
                setAdminPadre(m.key);
                setAdminChildKey("");
              }}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                cursor: "pointer",
                border:
                  adminPadre === m.key
                    ? `2px solid ${m.color}`
                    : `1px solid ${C.gold}30`,
                background: adminPadre === m.key ? m.color : C.white,
                color: adminPadre === m.key ? C.white : m.color,
              }}
            >
              {m.name.split("\n")[0]}
            </button>
          ))}
        </div>

        {adminPadre && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.gold,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 6,
              }}
            >
              2. Categoría (hijo existente)
            </div>
            <select
              value={adminChildKey}
              onChange={(e) => setAdminChildKey(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: 12,
                border: `1px solid ${C.gold}30`,
                borderRadius: 6,
                outline: "none",
              }}
            >
              <option value="">Seleccionar subcategoría o proyecto…</option>
              {subsOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {(s.name || (s as { short?: string }).short || "")
                    .split("\n")[0]}
                </option>
              ))}
            </select>
          </div>
        )}

        {adminPadre && adminChildKey && (
          <div
            style={{
              background: C.gold + "06",
              border: `1px solid ${C.gold}20`,
              borderRadius: 10,
              padding: "14px",
              marginBottom: 14,
            }}
          >
            <input
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nombre del micro-nodo *"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                border: `1px solid ${C.gold}30`,
                borderRadius: 6,
                outline: "none",
                marginBottom: 6,
                boxSizing: "border-box",
              }}
            />
            <input
              value={adminForm.contact}
              onChange={(e) =>
                setAdminForm((p) => ({ ...p, contact: e.target.value }))
              }
              placeholder="Contacto (opcional)"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                border: `1px solid ${C.gold}30`,
                borderRadius: 6,
                outline: "none",
                marginBottom: 8,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!adminForm.name.trim() || !adminChildKey) return;
                  addNieto(adminChildKey, {
                    name: adminForm.name,
                    contact: adminForm.contact,
                  });
                  setAdminForm({ name: "", contact: "" });
                } catch (e) {
                  console.error(e);
                }
              }}
              style={{
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 800,
                color: C.white,
                background: C.gold,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                opacity: adminForm.name.trim() ? 1 : 0.4,
              }}
            >
              + Añadir micro-nodo
            </button>
          </div>
        )}

        {adminPadre &&
          (() => {
            try {
              const padre = MAIN.find((m) => m.key === adminPadre);
              if (!padre) return null;
              const builtIn =
                adminPadre === "proyectos"
                  ? PROJECTS.map((p) => ({
                      key: p.key,
                      name: p.short,
                      color: p.color,
                      items: p.tematicas || [],
                    }))
                  : (
                      adminPadre === "cinov"
                        ? CINOV_SUBS
                        : adminPadre === "aliados"
                          ? ALIADOS_SUBS
                          : INVEST_SUBS
                    ).map((s) => ({ ...s }));
              return (
                <div
                  style={{
                    borderTop: `1px solid ${C.gold}15`,
                    paddingTop: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: padre.color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: padre.color,
                      }}
                    >
                      {padre.name.split("\n")[0]}
                    </span>
                  </div>
                  {builtIn.map((h, hi) => {
                    const hItems = (h.items || []).map((it) =>
                      typeof it === "string" ? it : it
                    );
                    const cItems = customNietosForChildKey(
                      cNietos,
                      h.key
                    ).map((n) => n.name);
                    const allN = [
                      ...hItems
                        .filter((n) => !deletedNodes.includes(n))
                        .map((n) => ({
                          name: n,
                          bi: true as const,
                          ct: gc(n),
                        })),
                      ...cItems
                        .filter((n) => !deletedNodes.includes(n))
                        .map((n) => ({
                          name: n,
                          bi: false as const,
                          ct:
                            customNietosForChildKey(
                              cNietos,
                              h.key
                            ).find((cn) => cn.name === n)?.contact ||
                            gc(n) ||
                            null,
                        })),
                    ];
                    return (
                      <div key={hi} style={{ marginLeft: 14, marginBottom: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 0",
                            borderBottom: `1px solid ${C.gold}08`,
                          }}
                        >
                          <div
                            style={{
                              width: 2,
                              height: 16,
                              background: padre.color + "40",
                            }}
                          />
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: h.color || padre.color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: C.textDk,
                              flex: 1,
                            }}
                          >
                            {(h.name || "").split("\n")[0]}
                          </span>
                          {"listMode" in h && h.listMode && (
                            <span style={{ fontSize: 8, color: C.textLt }}>
                              📋
                            </span>
                          )}
                        </div>
                        {!h.listMode &&
                          allN.slice(0, 10).map((n, ni) => (
                            <div
                              key={ni}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "2px 0",
                                marginLeft: 22,
                              }}
                            >
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background:
                                    n.ct || hasContact(n.name)
                                      ? C.green
                                      : C.pulseRed,
                                  border: n.bi
                                    ? "none"
                                    : "1.5px dashed " + C.gold,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 10,
                                  color: C.textMd,
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {n.name}
                              </span>
                              {!n.bi &&
                                (delConfirm === `n_${h.key}_${n.name}` ? (
                                  <span style={{ display: "flex", gap: 2 }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        delNieto(h.key, n.name);
                                        setDelConfirm(null);
                                      }}
                                      style={{
                                        background: C.pulseRed,
                                        border: "none",
                                        color: C.white,
                                        borderRadius: 3,
                                        padding: "1px 6px",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Sí
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDelConfirm(null);
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: `1px solid ${C.gold}15`,
                                        color: C.textLt,
                                        borderRadius: 3,
                                        padding: "1px 6px",
                                        fontSize: 8,
                                        cursor: "pointer",
                                      }}
                                    >
                                      No
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDelConfirm(`n_${h.key}_${n.name}`);
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: `1px solid ${C.pulseRed}15`,
                                      color: C.pulseRed,
                                      borderRadius: 3,
                                      padding: "1px 5px",
                                      fontSize: 8,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ×
                                  </button>
                                ))}
                            </div>
                          ))}
                        {!h.listMode && allN.length > 10 && (
                          <div
                            style={{
                              fontSize: 9,
                              color: C.textLt,
                              marginLeft: 22,
                              fontStyle: "italic",
                            }}
                          >
                            +{allN.length - 10} más
                          </div>
                        )}
                        {h.listMode && (
                          <div
                            style={{
                              fontSize: 9,
                              color: C.textLt,
                              marginLeft: 22,
                            }}
                          >
                            📋 {hItems.length + cItems.length} elementos
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      fontSize: 9,
                      color: C.textLt,
                      marginTop: 8,
                    }}
                  >
                    {builtIn.length} categorías · borde punteado = micro-nodo
                    añadido
                  </div>
                </div>
              );
            } catch (e) {
              console.error(e);
              return null;
            }
          })()}

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${C.gold}15`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.gold,
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 6,
            }}
          >
            Base de datos · migración
          </div>
          <p
            style={{
              fontSize: 10,
              color: C.textLt,
              margin: "0 0 10px",
              lineHeight: 1.45,
            }}
          >
            Si cambiaste de proyecto Firebase o la ruta{" "}
            <span style={{ fontWeight: 700 }}>map_catalog</span> está vacía o
            desfasada, puedes volcar el árbol integrado desde el código
            (main, proyectos, subcategorías).
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <button
              type="button"
              disabled={migrateBusy}
              onClick={async () => {
                setMigrateMsg(null);
                setMigrateBusy(true);
                try {
                  await loadDefaultMapCatalogIntoDatabase("mergeBuiltIn");
                  setMigrateMsg(
                    "Listo: árbol integrado actualizado. Los micro-nodos en custom_nietos se conservaron."
                  );
                } catch (e) {
                  console.error(e);
                  setMigrateMsg(
                    `Error: ${e instanceof Error ? e.message : String(e)}`
                  );
                } finally {
                  setMigrateBusy(false);
                }
              }}
              style={{
                padding: "10px 14px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                cursor: migrateBusy ? "wait" : "pointer",
                border: `1px solid ${C.gold}40`,
                background: C.gold + "12",
                color: C.goldDk,
                textAlign: "left",
              }}
            >
              Actualizar árbol integrado (conserva micro-nodos personalizados)
            </button>
            <button
              type="button"
              disabled={migrateBusy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Se reemplazará todo map_catalog: árbol por defecto del código y se vaciará custom_nietos (micro-nodos). map_app_state no se modifica. ¿Continuar?"
                  )
                )
                  return;
                setMigrateMsg(null);
                setMigrateBusy(true);
                try {
                  await loadDefaultMapCatalogIntoDatabase("replaceAll");
                  setMigrateMsg(
                    "Listo: map_catalog reiniciado al catálogo por defecto (sin micro-nodos)."
                  );
                } catch (e) {
                  console.error(e);
                  setMigrateMsg(
                    `Error: ${e instanceof Error ? e.message : String(e)}`
                  );
                } finally {
                  setMigrateBusy(false);
                }
              }}
              style={{
                padding: "10px 14px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                cursor: migrateBusy ? "wait" : "pointer",
                border: `1px solid ${C.pulseRed}35`,
                background: C.pulseRed + "10",
                color: C.pulseRed,
                textAlign: "left",
              }}
            >
              Inicializar catálogo completo (borra micro-nodos en RTDB)
            </button>
            <button
              type="button"
              disabled={migrateBusy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Se sobrescribirá tag_map/entries con el mapa de etiquetas por defecto del repositorio. ¿Continuar?"
                  )
                )
                  return;
                setMigrateMsg(null);
                setMigrateBusy(true);
                try {
                  await seedTagMapFromObject(TAG_MAP_DEFAULT);
                  setMigrateMsg(
                    "Listo: tag_map sembrado con TAG_MAP_DEFAULT."
                  );
                } catch (e) {
                  console.error(e);
                  setMigrateMsg(
                    `Error: ${e instanceof Error ? e.message : String(e)}`
                  );
                } finally {
                  setMigrateBusy(false);
                }
              }}
              style={{
                padding: "10px 14px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                cursor: migrateBusy ? "wait" : "pointer",
                border: `1px solid ${C.gold}30`,
                background: C.white,
                color: C.textDk,
                textAlign: "left",
              }}
            >
              Sembrar etiquetas por defecto (tag_map)
            </button>
          </div>
          {migrateMsg && (
            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                fontWeight: 600,
                color: migrateMsg.startsWith("Error")
                  ? C.pulseRed
                  : C.green,
                lineHeight: 1.4,
              }}
            >
              {migrateMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
