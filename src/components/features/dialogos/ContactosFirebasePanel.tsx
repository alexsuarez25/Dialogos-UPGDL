import { useState, useMemo, useCallback } from "react";
import {
  createContacto,
  updateContacto,
  deleteContacto,
} from "../../../lib/firebase/contactosRealtime";
import { cn } from "../../../lib/cn";

export type PatronContactRecord = {
  id: string;
  patron: string;
  nombre: string;
  email?: string;
  notas?: string;
};

const emptyForm = () => ({
  patron: "",
  nombre: "",
  email: "",
  notas: "",
});

export default function ContactosFirebasePanel({
  open,
  onClose,
  records,
}: {
  open: boolean;
  onClose: () => void;
  records: PatronContactRecord[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

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

  const selectRow = useCallback((r: PatronContactRecord) => {
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
        await updateContacto(editingId, {
          ...payload,
          id: editingId,
          parentKey: null,
        });
      } else {
        await createContacto(payload);
        resetForm();
      }
    } catch (e: unknown) {
      console.error(e);
      setErr(
        e instanceof Error ? e.message : "No se pudo guardar. Revisa reglas y conexión."
      );
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
    } catch (e: unknown) {
      console.error(e);
      setErr(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
      setConfirmDel(null);
    }
  }, [editingId, confirmDel, resetForm]);

  if (!open) return null;

  const fieldClass =
    "mb-1.5 box-border w-full rounded-md border border-brand-gold/30 px-2.5 py-2 text-[13px] outline-none";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 top-[72px] z-35 flex max-h-[min(82vh,720px)] w-[500px] max-w-[calc(100vw-28px)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-brand-gold/30 bg-brand-white"
      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-between border-b border-brand-gold/15 px-[22px] pb-3 pt-4">
        <div>
          <div className="font-display text-base font-black text-text-dk">
            Contactos (Firebase)
          </div>
          <div className="mt-1 text-[10px] text-text-lt">
            Reglas globales por patrón. Los contactos por nodo (varios documentos
            con el mismo vínculo) se gestionan en el mapa al abrir un micro-nodo.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/30 bg-transparent text-[13px] text-text-lt"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-3.5">
        {err && (
          <div className="mb-2.5 text-xs font-semibold text-danger">{err}</div>
        )}

        <div className="mb-3.5 rounded-[10px] border border-brand-gold/25 bg-brand-gold/8 p-3.5">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
            {editingId ? "Editar registro" : "Nuevo registro"}
          </div>
          <input
            value={form.patron}
            onChange={(e) => setForm((p) => ({ ...p, patron: e.target.value }))}
            placeholder="Patrón (ej. Secretaría de Educación)"
            className={fieldClass}
          />
          <input
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            placeholder="Persona / responsable *"
            className={fieldClass}
          />
          <input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email (opcional)"
            type="email"
            className={fieldClass}
          />
          <textarea
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            placeholder="Notas (opcional)"
            rows={2}
            className={cn(
              fieldClass,
              "mb-2.5 resize-y font-inherit"
            )}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className={cn(
                "cursor-pointer rounded-lg border-none bg-brand-green px-[18px] py-2 text-xs font-extrabold text-brand-white",
                busy && "cursor-wait opacity-70"
              )}
            >
              {editingId ? "Actualizar" : "Crear"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onNew}
              className="cursor-pointer rounded-lg border border-brand-gold/40 bg-transparent px-3.5 py-2 text-xs font-bold text-brand-gold"
            >
              Limpiar / Nuevo
            </button>
            {editingId && (
              <button
                type="button"
                disabled={busy}
                onClick={onDelete}
                className={cn(
                  "cursor-pointer rounded-lg border-none px-3.5 py-2 text-xs font-extrabold text-brand-white",
                  confirmDel === editingId ? "bg-danger" : "bg-danger/80"
                )}
              >
                {confirmDel === editingId ? "¿Confirmar eliminar?" : "Eliminar"}
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
          Registros ({sorted.length})
        </div>
        <div className="overflow-hidden rounded-[10px] border border-brand-gold/18">
          {sorted.length === 0 ? (
            <div className="p-5 text-center text-xs text-text-lt">
              No hay contactos en la base. Crea uno arriba o revisa las reglas de
              Firebase.
            </div>
          ) : (
            sorted.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => selectRow(r)}
                className={cn(
                  "w-full cursor-pointer border-b border-brand-gold/10 px-3.5 py-3 text-left last:border-b-0",
                  editingId === r.id ? "bg-brand-gold/15" : "bg-brand-white"
                )}
              >
                <div className="font-display text-[13px] font-extrabold text-text-dk">
                  {r.patron || "(sin patrón)"}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-brand-gold">
                  👤 {r.nombre || "—"}
                </div>
                {r.email ? (
                  <div className="mt-0.5 text-[10px] text-text-md">{r.email}</div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
      <div
        className="h-[3px] shrink-0"
        style={{
          background:
            "linear-gradient(90deg,var(--color-brand-green),var(--color-brand-gold))",
        }}
      />
    </div>
  );
}
