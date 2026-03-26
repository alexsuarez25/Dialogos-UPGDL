import { useState, useMemo, useCallback } from "react";
import {
  setTagMapEntry,
  deleteTagMapEntry,
  seedTagMapFromObject,
  clearTagMapEntries,
} from "../../../lib/firebase/tagMapRealtime";
import { TAGS, TAG_MAP_DEFAULT } from "../../../tagMapDefault.js";
import { cn } from "../../../lib/cn";

const emptyForm = () => ({ name: "", indicesStr: "" });

export default function TagMapFirebasePanel({
  open,
  onClose,
  tagMap,
  usingFallback,
}: {
  open: boolean;
  onClose: () => void;
  tagMap: Record<string, number[]>;
  usingFallback: boolean;
}) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = useMemo(() => {
    const m = tagMap && typeof tagMap === "object" ? tagMap : {};
    return Object.entries(m)
      .map(([name, indices]) => ({ name, indices: [...indices] }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [tagMap]);

  const parseIndices = useCallback((s: string) => {
    const parts = String(s || "")
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const out: number[] = [];
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (Number.isInteger(n) && n >= 0 && n < TAGS.length) out.push(n);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }, []);

  const selectRow = useCallback((r: { name: string; indices: number[] }) => {
    if (!r) return;
    setForm({
      name: r.name,
      indicesStr: r.indices.join(", "),
    });
    setErr(null);
  }, []);

  const onNew = useCallback(() => {
    setForm(emptyForm());
    setErr(null);
  }, []);

  const onSave = useCallback(async () => {
    const name = form.name.trim();
    if (!name) {
      setErr("Nombre del nodo obligatorio (igual que en el mapa).");
      return;
    }
    const indices = parseIndices(form.indicesStr);
    setBusy(true);
    setErr(null);
    try {
      await setTagMapEntry(name, indices);
      setForm(emptyForm());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [form, parseIndices]);

  const onDelete = useCallback(async () => {
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteTagMapEntry(name);
      setForm(emptyForm());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [form.name]);

  const onSeed = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await seedTagMapFromObject(TAG_MAP_DEFAULT);
      setConfirmSeed(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onClearRemote = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await clearTagMapEntries();
      setConfirmClear(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleIdx = useCallback(
    (i: number) => {
      setForm((f) => {
        const cur = parseIndices(f.indicesStr);
        const has = cur.includes(i);
        const next = has
          ? cur.filter((x) => x !== i)
          : [...cur, i].sort((a, b) => a - b);
        return { ...f, indicesStr: next.join(", ") };
      });
    },
    [parseIndices]
  );

  if (!open) return null;

  const inputClass =
    "mb-2 box-border w-full rounded-lg border border-brand-gold/30 px-2.5 py-2 text-xs";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-[22px] top-[72px] z-31 flex max-h-[86vh] w-[440px] flex-col overflow-hidden rounded-2xl border border-brand-gold/30 bg-brand-white"
      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-between border-b border-brand-gold/15 px-[22px] pb-3 pt-4">
        <div>
          <div className="font-display text-base font-black text-text-dk">
            Etiquetas por nodo (TAG_MAP)
          </div>
          <div className="mt-1 text-[10px] text-text-lt">
            Realtime DB:{" "}
            <code className="text-[9px]">tag_map/entries</code>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/30 bg-transparent text-[13px] text-text-lt"
        >
          ✕
        </button>
      </div>

      {usingFallback && (
        <div className="mx-4 mb-2.5 rounded-lg border border-brand-gold/35 bg-brand-gold/20 px-3 py-2.5 text-[11px] text-text-dk">
          Firebase no tiene entradas todavía: el mapa muestra el respaldo local.
          Usa «Subir mapa por defecto» para persistir en la nube.
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-[22px] pb-3.5">
        {err && (
          <div className="mb-2.5 rounded-lg bg-danger/15 px-2.5 py-2 text-[11px] text-danger">
            {err}
          </div>
        )}

        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
            Entrada
          </div>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre exacto del nodo"
            className={cn(inputClass, "border-brand-gold/30")}
          />
          <input
            value={form.indicesStr}
            onChange={(e) =>
              setForm((f) => ({ ...f, indicesStr: e.target.value }))
            }
            placeholder="Índices separados por coma (ej. 0, 7, 14)"
            className={cn(inputClass, "font-mono")}
          />
          <div className="mb-2.5 max-h-[140px] overflow-y-auto rounded-lg border border-brand-gold/15 p-2">
            <div className="mb-1.5 text-[10px] text-text-lt">
              Clic para alternar etiqueta
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t, i) => {
                const on = parseIndices(form.indicesStr).includes(i);
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleIdx(i)}
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1 text-[10px]",
                      on
                        ? "border border-brand-green bg-brand-green/20 font-bold text-brand-green"
                        : "border border-brand-gold/25 bg-surface-panel font-medium text-text-md"
                    )}
                  >
                    {i}: {t.length > 22 ? `${t.slice(0, 20)}…` : t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className={cn(
                "cursor-pointer rounded-lg border-none bg-brand-gold px-4 py-2 text-xs font-bold text-brand-white",
                busy && "cursor-wait"
              )}
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={busy || !form.name.trim()}
              onClick={onDelete}
              className={cn(
                "cursor-pointer rounded-lg border border-danger/60 bg-brand-white px-4 py-2 text-xs font-bold text-danger",
                busy && "cursor-wait"
              )}
            >
              Borrar en Firebase
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onNew}
              className="cursor-pointer rounded-lg border border-brand-gold/30 bg-surface-panel px-3.5 py-2 text-xs font-semibold text-text-dk"
            >
              Nuevo
            </button>
          </div>
        </div>

        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
          Lista ({rows.length})
        </div>
        <div className="max-h-[200px] overflow-y-auto overflow-x-hidden rounded-[10px] border border-brand-gold/15">
          {rows.length === 0 ? (
            <div className="p-4 text-xs text-text-lt">Sin filas.</div>
          ) : (
            rows.map((r) => (
              <button
                type="button"
                key={r.name}
                onClick={() => selectRow(r)}
                className={cn(
                  "block w-full cursor-pointer border-b border-brand-gold/10 px-3 py-2 text-left text-[11px] text-text-dk last:border-b-0",
                  form.name === r.name ? "bg-brand-gold/15" : "bg-brand-white"
                )}
              >
                <div className="font-bold">{r.name}</div>
                <div className="font-mono text-[10px] text-text-lt">
                  [{r.indices.join(", ")}]
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-brand-gold/15 pt-3.5">
          {!confirmSeed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmSeed(true)}
              className={cn(
                "w-full cursor-pointer rounded-lg border border-brand-green/45 bg-brand-green/15 px-3.5 py-2.5 text-xs font-bold text-brand-green",
                busy && "cursor-wait"
              )}
            >
              Subir mapa por defecto a Firebase (reemplaza todo)
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-danger">
                ¿Sobrescribir todas las entradas en la nube con TAG_MAP_DEFAULT?
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSeed}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg border-none bg-brand-green px-3 py-2 text-xs font-bold text-brand-white",
                    busy && "cursor-wait"
                  )}
                >
                  Sí, subir
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmSeed(false)}
                  className="flex-1 cursor-pointer rounded-lg border border-brand-gold/30 bg-brand-white px-3 py-2 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!confirmClear ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmClear(true)}
              className={cn(
                "mt-2.5 w-full cursor-pointer rounded-lg border border-text-lt/40 bg-surface-panel px-3.5 py-2 text-[11px] font-semibold text-text-lt",
                busy && "cursor-wait"
              )}
            >
              Vaciar solo Firebase (la app seguirá con mapa local)
            </button>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              <div className="text-[11px] text-text-md">
                Se borrará <code>tag_map/entries</code>. La interfaz usará el
                respaldo hasta que subas de nuevo.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClearRemote}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg border border-danger bg-danger/15 px-3 py-2 text-xs font-bold text-danger",
                    busy && "cursor-wait"
                  )}
                >
                  Vaciar remoto
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 cursor-pointer rounded-lg border border-brand-gold/30 bg-brand-white px-3 py-2 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
