import React, { useState, useMemo, useCallback } from "react";
import {
  setTagMapEntry,
  deleteTagMapEntry,
  seedTagMapFromObject,
  clearTagMapEntries,
} from "../firebaseTagMapRealtime";
import { TAGS, TAG_MAP_DEFAULT } from "./tagMapDefault.js";

const emptyForm = () => ({ name: "", indicesStr: "" });

/**
 * CRUD para `tag_map/entries` en Realtime Database.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Record<string, number[]>} props.tagMap — clave = nombre de nodo (como en el mapa)
 * @param {boolean} props.usingFallback — true si RTDB está vacío y se muestra TAG_MAP_DEFAULT en UI
 * @param {object} props.palette — objeto `C` de App
 */
export default function TagMapFirebasePanel({
  open,
  onClose,
  tagMap,
  usingFallback,
  palette: C,
}) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = useMemo(() => {
    const m = tagMap && typeof tagMap === "object" ? tagMap : {};
    return Object.entries(m)
      .map(([name, indices]) => ({ name, indices: [...indices] }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [tagMap]);

  const parseIndices = useCallback((s) => {
    const parts = String(s || "")
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const out = [];
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (Number.isInteger(n) && n >= 0 && n < TAGS.length) out.push(n);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }, []);

  const selectRow = useCallback((r) => {
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
    } catch (e) {
      setErr(e?.message || String(e));
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
    } catch (e) {
      setErr(e?.message || String(e));
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
    } catch (e) {
      setErr(e?.message || String(e));
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
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleIdx = useCallback(
    (i) => {
      setForm((f) => {
        const cur = parseIndices(f.indicesStr);
        const has = cur.includes(i);
        const next = has ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b);
        return { ...f, indicesStr: next.join(", ") };
      });
    },
    [parseIndices]
  );

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 72,
        right: 22,
        zIndex: 31,
        width: 440,
        maxHeight: "86vh",
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
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: C.textDk,
              fontFamily: "'Cormorant Garamond',serif",
            }}
          >
            Etiquetas por nodo (TAG_MAP)
          </div>
          <div style={{ fontSize: 10, color: C.textLt, marginTop: 4 }}>
            Realtime DB: <code style={{ fontSize: 9 }}>tag_map/entries</code>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
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

      {usingFallback && (
        <div
          style={{
            margin: "0 16px 10px",
            padding: "10px 12px",
            fontSize: 11,
            color: C.textDk,
            background: C.gold + "18",
            borderRadius: 8,
            border: `1px solid ${C.gold}35`,
          }}
        >
          Firebase no tiene entradas todavía: el mapa muestra el respaldo local. Usa «Subir mapa
          por defecto» para persistir en la nube.
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 14px" }}>
        {err && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              fontSize: 11,
              color: C.pulseRed,
              background: C.pulseRed + "12",
              borderRadius: 8,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.gold,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 6,
            }}
          >
            Entrada
          </div>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre exacto del nodo"
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 12,
              border: `1px solid ${C.gold}28`,
              borderRadius: 8,
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          />
          <input
            value={form.indicesStr}
            onChange={(e) => setForm((f) => ({ ...f, indicesStr: e.target.value }))}
            placeholder="Índices separados por coma (ej. 0, 7, 14)"
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 12,
              border: `1px solid ${C.gold}28`,
              borderRadius: 8,
              marginBottom: 8,
              boxSizing: "border-box",
              fontFamily: "monospace",
            }}
          />
          <div
            style={{
              maxHeight: 140,
              overflowY: "auto",
              border: `1px solid ${C.gold}15`,
              borderRadius: 8,
              padding: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, color: C.textLt, marginBottom: 6 }}>
              Clic para alternar etiqueta
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TAGS.map((t, i) => {
                const on = parseIndices(form.indicesStr).includes(i);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleIdx(i)}
                    style={{
                      fontSize: 10,
                      padding: "4px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      border: on ? `1px solid ${C.green}` : `1px solid ${C.gold}25`,
                      background: on ? C.green + "22" : C.panelBg,
                      color: on ? C.green : C.textMd,
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    {i}: {t.length > 22 ? `${t.slice(0, 20)}…` : t}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
                border: "none",
                background: C.gold,
                color: C.white,
              }}
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={busy || !form.name.trim()}
              onClick={onDelete}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
                border: `1px solid ${C.pulseRed}55`,
                background: C.white,
                color: C.pulseRed,
              }}
            >
              Borrar en Firebase
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onNew}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${C.gold}30`,
                background: C.panelBg,
                color: C.textDk,
              }}
            >
              Nuevo
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.gold,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
          }}
        >
          Lista ({rows.length})
        </div>
        <div
          style={{
            border: `1px solid ${C.gold}15`,
            borderRadius: 10,
            overflow: "hidden",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: C.textLt }}>Sin filas.</div>
          ) : (
            rows.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => selectRow(r)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 11,
                  border: "none",
                  borderBottom: `1px solid ${C.gold}10`,
                  background: form.name === r.name ? C.gold + "14" : C.white,
                  cursor: "pointer",
                  color: C.textDk,
                }}
              >
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: C.textLt, fontFamily: "monospace" }}>
                  [{r.indices.join(", ")}]
                </div>
              </button>
            ))
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${C.gold}15`,
          }}
        >
          {!confirmSeed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmSeed(true)}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
                border: `1px solid ${C.green}45`,
                background: C.green + "16",
                color: C.green,
              }}
            >
              Subir mapa por defecto a Firebase (reemplaza todo)
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: C.pulseRed, fontWeight: 600 }}>
                ¿Sobrescribir todas las entradas en la nube con TAG_MAP_DEFAULT?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSeed}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: "none",
                    background: C.green,
                    color: C.white,
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  Sí, subir
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmSeed(false)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${C.gold}30`,
                    background: C.white,
                    cursor: "pointer",
                  }}
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
              style={{
                width: "100%",
                marginTop: 10,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
                border: `1px solid ${C.textLt}40`,
                background: C.panelBg,
                color: C.textLt,
              }}
            >
              Vaciar solo Firebase (la app seguirá con mapa local)
            </button>
          ) : (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: C.textMd }}>
                Se borrará <code>tag_map/entries</code>. La interfaz usará el respaldo hasta que
                subas de nuevo.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClearRemote}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: `1px solid ${C.pulseRed}`,
                    background: C.pulseRed + "12",
                    color: C.pulseRed,
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  Vaciar remoto
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmClear(false)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${C.gold}30`,
                    background: C.white,
                    cursor: "pointer",
                  }}
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
