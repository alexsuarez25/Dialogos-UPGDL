import React, { useState, useMemo, useCallback } from "react";
import {
  createContacto,
  updateContacto,
  deleteContacto,
} from "../firebaseContactosRealtime";

const emptyForm = () => ({
  patron: "",
  nombre: "",
  email: "",
  notas: "",
});

/**
 * CRUD UI for Realtime Database `contactos` (patrón → nombre contacto, igual que el mapa estático).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{id: string, patron: string, nombre: string, email?: string, notas?: string}>} props.records
 * @param {object} props.palette — mismo objeto `C` que App (colores UP).
 */
export default function ContactosFirebasePanel({ open, onClose, records, palette: C }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const sorted = useMemo(
    () =>
      [...(records || [])].sort((a, b) =>
        String(a.patron || "").localeCompare(String(b.patron || ""), "es")
      ),
    [records]
  );

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setErr(null);
    setConfirmDel(null);
  }, []);

  const selectRow = useCallback((r) => {
    if (!r) return;
    setEditingId(r.id);
    setForm({
      patron: r.patron || "",
      nombre: r.nombre || "",
      email: r.email || "",
      notas: r.notas || "",
    });
    setErr(null);
    setConfirmDel(null);
  }, []);

  const onNew = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const onSave = useCallback(async () => {
    const patron = form.patron.trim();
    const nombre = form.nombre.trim();
    if (!patron || !nombre) {
      setErr("Patrón y persona de contacto son obligatorios.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        patron,
        nombre,
        email: form.email.trim() || "",
        notas: form.notas.trim() || "",
        source: "patron-rule",
      };
      if (editingId) {
        await updateContacto(editingId, { ...payload, id: editingId, parentKey: null });
      } else {
        await createContacto(payload);
        resetForm();
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo guardar. Revisa reglas y conexión.");
    } finally {
      setBusy(false);
    }
  }, [editingId, form, resetForm]);

  const onDelete = useCallback(async () => {
    if (!editingId || confirmDel !== editingId) {
      setConfirmDel(editingId);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await deleteContacto(editingId);
      resetForm();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo eliminar.");
    } finally {
      setBusy(false);
      setConfirmDel(null);
    }
  }, [editingId, confirmDel, resetForm]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 35,
        width: 500,
        maxWidth: "calc(100vw - 28px)",
        maxHeight: "min(82vh, 720px)",
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
            Contactos (Firebase)
          </div>
          <div style={{ fontSize: 10, color: C.textLt, marginTop: 4 }}>
            Reglas globales por patrón. Los contactos por nodo (varios documentos con el mismo vínculo) se gestionan en el mapa al abrir un micro-nodo.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onClose();
          }}
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
        {err && (
          <div
            style={{
              fontSize: 12,
              color: C.pulseRed,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            background: C.gold + "08",
            border: `1px solid ${C.gold}22`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.gold,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: 8,
            }}
          >
            {editingId ? "Editar registro" : "Nuevo registro"}
          </div>
          <input
            value={form.patron}
            onChange={(e) => setForm((p) => ({ ...p, patron: e.target.value }))}
            placeholder="Patrón (ej. Secretaría de Educación)"
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
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            placeholder="Persona / responsable *"
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
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email (opcional)"
            type="email"
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
          <textarea
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            placeholder="Notas (opcional)"
            rows={2}
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 13,
              border: `1px solid ${C.gold}30`,
              borderRadius: 6,
              outline: "none",
              marginBottom: 10,
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              style={{
                padding: "8px 18px",
                fontSize: 12,
                fontWeight: 800,
                color: C.white,
                background: C.green,
                border: "none",
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {editingId ? "Actualizar" : "Crear"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onNew}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: C.gold,
                background: "transparent",
                border: `1px solid ${C.gold}40`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Limpiar / Nuevo
            </button>
            {editingId && (
              <button
                type="button"
                disabled={busy}
                onClick={onDelete}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  color: C.white,
                  background:
                    confirmDel === editingId ? C.pulseRed : C.pulseRed + "cc",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {confirmDel === editingId ? "¿Confirmar eliminar?" : "Eliminar"}
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.gold,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            marginBottom: 8,
          }}
        >
          Registros ({sorted.length})
        </div>
        <div
          style={{
            border: `1px solid ${C.gold}18`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {sorted.length === 0 ? (
            <div
              style={{
                padding: 20,
                fontSize: 12,
                color: C.textLt,
                textAlign: "center",
              }}
            >
              No hay contactos en la base. Crea uno arriba o revisa las reglas de
              Firebase.
            </div>
          ) : (
            sorted.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRow(r)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "none",
                  borderBottom: `1px solid ${C.gold}10`,
                  background:
                    editingId === r.id ? C.gold + "14" : C.white,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: C.textDk,
                    fontFamily: "'Cormorant Garamond',serif",
                  }}
                >
                  {r.patron || "(sin patrón)"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.gold,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  👤 {r.nombre || "—"}
                </div>
                {r.email ? (
                  <div style={{ fontSize: 10, color: C.textMd, marginTop: 2 }}>
                    {r.email}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg,${C.green},${C.gold})`,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
