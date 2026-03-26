import { useEffect, useState } from "react";
import type { MapTreeCatalogSlice } from "../../../lib/mapLayoutFromCatalog";
import {
  customNietosForChildKey,
  type CustomNietosState,
} from "../../../lib/firebase/mapCustomNodesRealtime";
import { loadDefaultMapCatalogIntoDatabase } from "../../../lib/firebase/mapCatalogRealtime";
import { seedTagMapFromObject } from "../../../lib/firebase/tagMapRealtime";
import { TAG_MAP_DEFAULT } from "../../../tagMapDefault.js";
import { cn } from "../../../lib/cn";

/** TODO(profile): enable when the signed-in user may run DB migration tools. */
const MIGRATION_UI_ENABLED = false;

type NodesAdminPanelProps = {
  open: boolean;
  onClose: () => void;
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

  const fieldClass =
    "mb-1.5 box-border w-full rounded-md border border-brand-gold/30 px-2.5 py-2 text-[13px] outline-none";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 top-3.5 z-30 flex max-h-[82vh] w-[480px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-brand-gold/30 bg-brand-white"
      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-between border-b border-brand-gold/15 px-[22px] pb-3 pt-4">
        <span className="font-display text-base font-black text-text-dk">
          Micro-nodos (bajo categoría existente)
        </span>
        <button
          type="button"
          onClick={() => onClose()}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/30 bg-transparent text-[13px] text-text-lt"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-[22px] py-3.5">
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
          1. Rama principal
        </div>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {MAIN.map((m) => (
            <button
              type="button"
              key={m.key}
              onClick={() => {
                setAdminPadre(m.key);
                setAdminChildKey("");
              }}
              className={cn(
                "cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold",
                adminPadre === m.key ? "border-2 text-brand-white" : "border border-brand-gold/30 bg-brand-white"
              )}
              style={
                adminPadre === m.key
                  ? {
                      borderColor: m.color,
                      background: m.color,
                      color: "#fff",
                    }
                  : { color: m.color }
              }
            >
              {m.name.split("\n")[0]}
            </button>
          ))}
        </div>

        {adminPadre && (
          <div className="mb-3">
            <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
              2. Categoría (hijo existente)
            </div>
            <select
              value={adminChildKey}
              onChange={(e) => setAdminChildKey(e.target.value)}
              className="w-full rounded-md border border-brand-gold/30 p-2 text-xs outline-none"
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
          <div className="mb-3.5 rounded-[10px] border border-brand-gold/20 bg-brand-gold/6 p-3.5">
            <input
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nombre del micro-nodo *"
              className={fieldClass}
            />
            <input
              value={adminForm.contact}
              onChange={(e) =>
                setAdminForm((p) => ({ ...p, contact: e.target.value }))
              }
              placeholder="Contacto (opcional)"
              className={cn(fieldClass, "mb-2")}
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
              className={cn(
                "cursor-pointer rounded-lg border-none bg-brand-gold px-5 py-2 text-xs font-extrabold text-brand-white",
                !adminForm.name.trim() && "opacity-40"
              )}
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
                <div className="border-t border-brand-gold/15 pt-3.5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <div
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ background: padre.color }}
                    />
                    <span
                      className="text-sm font-black"
                      style={{ color: padre.color }}
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
                      <div key={hi} className="mb-2 ml-3.5">
                        <div className="flex items-center gap-1.5 border-b border-brand-gold/8 py-1">
                          <div
                            className="h-4 w-0.5"
                            style={{ background: `${padre.color}66` }}
                          />
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: h.color || padre.color,
                            }}
                          />
                          <span className="flex-1 text-xs font-bold text-text-dk">
                            {(h.name || "").split("\n")[0]}
                          </span>
                          {"listMode" in h && h.listMode && (
                            <span className="text-[8px] text-text-lt">📋</span>
                          )}
                        </div>
                        {!h.listMode &&
                          allN.slice(0, 10).map((n, ni) => (
                            <div
                              key={ni}
                              className="ml-5 flex items-center gap-1 py-0.5"
                            >
                              <div
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{
                                  background:
                                    n.ct || hasContact(n.name)
                                      ? "var(--color-brand-green)"
                                      : "var(--color-danger)",
                                  border: n.bi
                                    ? "none"
                                    : "1.5px dashed var(--color-brand-gold)",
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[10px] text-text-md">
                                {n.name}
                              </span>
                              {!n.bi &&
                                (delConfirm === `n_${h.key}_${n.name}` ? (
                                  <span className="flex gap-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        delNieto(h.key, n.name);
                                        setDelConfirm(null);
                                      }}
                                      className="cursor-pointer rounded-sm border-none bg-danger px-1.5 py-px text-[8px] font-bold text-brand-white"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDelConfirm(null);
                                      }}
                                      className="cursor-pointer rounded-sm border border-brand-gold/15 bg-transparent px-1.5 py-px text-[8px] text-text-lt"
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
                                    className="cursor-pointer rounded-sm border border-danger/15 bg-transparent px-1 py-px text-[8px] font-bold text-danger"
                                  >
                                    ×
                                  </button>
                                ))}
                            </div>
                          ))}
                        {!h.listMode && allN.length > 10 && (
                          <div className="ml-5 text-[9px] italic text-text-lt">
                            +{allN.length - 10} más
                          </div>
                        )}
                        {h.listMode && (
                          <div className="ml-5 text-[9px] text-text-lt">
                            📋 {hItems.length + cItems.length} elementos
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-2 text-[9px] text-text-lt">
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

        {MIGRATION_UI_ENABLED && (
          <div className="mt-5 border-t border-brand-gold/15 pt-4">
            <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
              Base de datos · migración
            </div>
            <p className="mb-2.5 text-[10px] leading-snug text-text-lt">
              Si cambiaste de proyecto Firebase o la ruta{" "}
              <span className="font-bold">map_catalog</span> está vacía o
              desfasada, puedes volcar el árbol integrado desde el código
              (main, proyectos, subcategorías).
            </p>
            <div className="flex flex-col gap-2">
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
                className={cn(
                  "rounded-[10px] border border-brand-gold/40 bg-brand-gold/15 py-2.5 pl-3.5 pr-3.5 text-left text-[11px] font-bold text-brand-gold-dk",
                  migrateBusy && "cursor-wait"
                )}
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
                className={cn(
                  "rounded-[10px] border border-danger/35 bg-danger/10 py-2.5 pl-3.5 pr-3.5 text-left text-[11px] font-bold text-danger",
                  migrateBusy && "cursor-wait"
                )}
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
                className={cn(
                  "rounded-[10px] border border-brand-gold/30 bg-brand-white py-2.5 pl-3.5 pr-3.5 text-left text-[11px] font-bold text-text-dk",
                  migrateBusy && "cursor-wait"
                )}
              >
                Sembrar etiquetas por defecto (tag_map)
              </button>
            </div>
            {migrateMsg && (
              <div
                className={cn(
                  "mt-2.5 text-[10px] font-semibold leading-snug",
                  migrateMsg.startsWith("Error")
                    ? "text-danger"
                    : "text-brand-green"
                )}
              >
                {migrateMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
