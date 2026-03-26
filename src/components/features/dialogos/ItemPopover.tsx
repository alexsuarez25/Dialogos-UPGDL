import { useState } from "react";
import { TAGS } from "../../../tagMapDefault.js";
import type { MapItem, NoteRow } from "../../../types/nodes";
import type { LocalContactRow } from "../../../lib/contactHelpers";
import { RichEditor } from "./RichEditor";
import { cn } from "../../../lib/cn";

export function ItemPopover({
  item,
  onClose,
  noteText,
  setNoteText,
  onSave,
  noteHistory,
  onDelete,
  onEdit,
  userContacts,
  onAddContact,
  onEditContact,
  onDelContact,
  onSetPrimaryContact,
  onDeleteNode,
  itemTags,
  onAddTag,
  onRmTag,
  mainContactHidden,
  onHideMainContact,
  onRestoreMainContact,
  /** Live label from `displayPrimaryContactLabel` (Firebase + local + static CT). */
  resolvedMainContact,
}: {
  item: MapItem;
  onClose: () => void;
  noteText: string;
  setNoteText: (t: string) => void;
  onSave: () => void;
  noteHistory: NoteRow[];
  onDelete: (idx: number) => void;
  onEdit: (idx: number, txt: string) => void;
  userContacts?: LocalContactRow[];
  onAddContact: (c: {
    name: string;
    cargo?: string;
    email?: string;
    isPrimary?: boolean;
  }) => void;
  onEditContact: (
    idx: number,
    c: { name: string; cargo?: string; email?: string; isPrimary?: boolean }
  ) => void;
  onDelContact: (idx: number) => void;
  onSetPrimaryContact?: (idx: number) => void;
  onDeleteNode?: (() => void) | null;
  itemTags?: string[];
  onAddTag?: (nodeName: string, tag: string) => void;
  onRmTag?: (nodeName: string, tag: string) => void;
  mainContactHidden?: boolean;
  onHideMainContact?: (name: string) => void;
  onRestoreMainContact?: (name: string) => void;
  resolvedMainContact?: string | null;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showAddC, setShowAddC] = useState(false);
  const [cForm, setCForm] = useState({
    name: "",
    cargo: "",
    email: "",
    isPrimary: true,
  });
  const [editCIdx, setEditCIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const startEdit = (i: number, text: string) => {
    setEditIdx(i);
    setEditText(text);
  };
  const confirmEdit = (i: number) => {
    onEdit(i, editText);
    setEditIdx(null);
    setEditText("");
  };
  const cancelEdit = () => {
    setEditIdx(null);
    setEditText("");
  };
  const emailOk = (em: string) =>
    !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

  const inputBase =
    "mb-1.5 box-border w-full rounded-md border border-brand-gold/30 px-2.5 py-1.5 font-sans text-xs outline-none";

  const principalLine = (
    resolvedMainContact ??
    item.contact ??
    ""
  ).trim();
  const hasPrincipalLine = principalLine.length > 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-100 flex items-center justify-center bg-brand-black/30"
    >
      <div
        className="flex max-h-[88vh] w-[min(540px,94vw)] flex-col overflow-hidden rounded-2xl border border-brand-gold/30 bg-brand-white animate-[pU_0.3s_ease-out]"
        style={{ boxShadow: "0 10px 50px rgba(0,0,0,0.12)" }}
      >
        <div className="flex shrink-0 flex-row items-start justify-between gap-0 px-6 pb-3.5 pt-[22px]">
          <div className="min-w-0 flex-1">
            <span className="block font-display text-xl font-black leading-snug text-text-dk">
              {item.name}
            </span>
            {hasPrincipalLine && !mainContactHidden && (
              <div className="mt-2 flex flex-row items-center justify-between gap-0 rounded-lg border border-brand-gold/20 bg-brand-gold/10 px-3.5 py-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand-gold">
                    Contacto principal:{" "}
                  </span>
                  <span className="font-display text-[13px] font-bold text-text-dk">
                    {principalLine}
                  </span>
                </div>
                {onHideMainContact && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHideMainContact(item.name);
                    }}
                    className="shrink-0 cursor-pointer rounded-md border border-danger/25 px-2 py-0.5 text-[10px] font-bold text-danger bg-transparent"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {hasPrincipalLine && mainContactHidden && (
              <div className="mt-2 flex flex-row items-center justify-between gap-0 rounded-lg border border-brand-gold/15 bg-brand-gold/6 px-3.5 py-2">
                <span className="text-[11px] italic text-text-lt">
                  Contacto principal eliminado
                </span>
                {onRestoreMainContact && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreMainContact(item.name);
                    }}
                    className="shrink-0 cursor-pointer rounded-md border border-brand-gold/25 bg-brand-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-brand-gold"
                  >
                    Restaurar
                  </button>
                )}
              </div>
            )}
            {!hasPrincipalLine &&
              (!userContacts || userContacts.length === 0) && (
                <div className="mt-2 rounded-lg border border-danger/20 bg-danger/8 px-3.5 py-2">
                  <span className="text-[11px] font-bold text-danger">
                    ⚠ Pendiente de vinculación
                  </span>
                </div>
              )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/30 bg-transparent text-[15px] text-text-lt"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="mb-2.5 border-t border-brand-gold/15 pt-3.5">
            <div className="mb-2.5 flex flex-row items-center justify-between gap-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
                Contactos{" "}
                {userContacts && userContacts.length > 0
                  ? `(${userContacts.length})`
                  : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddC(true);
                  setCForm({
                    name: "",
                    cargo: "",
                    email: "",
                    isPrimary: !(userContacts || []).some((x) => x.isPrimary),
                  });
                  setEditCIdx(null);
                }}
                className="cursor-pointer rounded-md border border-brand-gold/25 bg-brand-gold/15 px-3 py-0.5 text-[10px] font-extrabold text-brand-gold"
              >
                + Agregar
              </button>
            </div>
            {showAddC && (
              <div className="mb-2.5 rounded-[10px] border border-brand-gold/20 bg-brand-gold/6 px-3.5 py-3">
                <input
                  value={cForm.name}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nombre *"
                  className={inputBase}
                />
                <input
                  value={cForm.cargo}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, cargo: e.target.value }))
                  }
                  placeholder="Cargo (opcional)"
                  className={inputBase}
                />
                <input
                  value={cForm.email}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="Correo electrónico"
                  type="email"
                  className={cn(
                    inputBase,
                    "mb-2",
                    cForm.email && !emailOk(cForm.email)
                      ? "border-danger/40"
                      : ""
                  )}
                />
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-text-dk">
                  <input
                    type="checkbox"
                    checked={cForm.isPrimary}
                    onChange={(e) =>
                      setCForm((p) => ({ ...p, isPrimary: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 accent-brand-gold"
                  />
                  Contacto principal (solo uno por nodo)
                </label>
                <div className="flex flex-row gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!cForm.name.trim()) return;
                      if (cForm.email && !emailOk(cForm.email)) return;
                      if (editCIdx !== null) {
                        onEditContact(editCIdx, { ...cForm });
                        setEditCIdx(null);
                      } else {
                        onAddContact({ ...cForm });
                      }
                      setCForm({
                        name: "",
                        cargo: "",
                        email: "",
                        isPrimary: true,
                      });
                      setShowAddC(false);
                    }}
                    className={cn(
                      "cursor-pointer rounded-md border-none px-4 py-1.5 text-[11px] font-extrabold text-brand-white",
                      "bg-brand-gold",
                      !cForm.name.trim() && "opacity-50"
                    )}
                  >
                    {editCIdx !== null ? "Guardar cambios" : "Agregar contacto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddC(false);
                      setEditCIdx(null);
                    }}
                    className="cursor-pointer rounded-md border border-brand-gold/30 bg-transparent px-4 py-1.5 text-[11px] font-bold text-text-lt"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {(userContacts || []).map((c, i) => (
              <div
                key={i}
                className="flex flex-row items-start gap-2.5 border-b border-brand-gold/8 py-2"
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-bold text-text-dk">
                    {c.name}
                  </span>
                  {c.isPrimary && (
                    <span className="ml-1.5 rounded-md border border-brand-gold/35 bg-brand-gold/15 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-brand-gold">
                      Principal
                    </span>
                  )}
                  {c.cargo && (
                    <span className="ml-0 block text-[11px] text-text-md">
                      {c.cargo}
                    </span>
                  )}
                  {c.email && (
                    <span className="ml-0 block text-[11px] text-brand-blue">
                      {c.email}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-row flex-wrap justify-end gap-0.5">
                  {!c.isPrimary && onSetPrimaryContact && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetPrimaryContact(i);
                      }}
                      className="cursor-pointer rounded-[5px] border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[9px] font-bold text-brand-gold"
                    >
                      Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCForm({
                        name: c.name,
                        cargo: c.cargo || "",
                        email: c.email || "",
                        isPrimary: !!c.isPrimary,
                      });
                      setEditCIdx(i);
                      setShowAddC(true);
                    }}
                    className="cursor-pointer rounded-[5px] border border-brand-gold/30 bg-transparent px-2 py-0.5 text-[9px] font-bold text-brand-gold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelContact(i);
                    }}
                    className="cursor-pointer rounded-[5px] border border-danger/25 bg-transparent px-2 py-0.5 text-[9px] font-bold text-danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-3.5 flex flex-row flex-wrap items-center gap-1">
            {(itemTags || []).map((tg, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 rounded-xl border border-brand-gold/25 bg-brand-gold/15 py-0.5 pl-2.5 pr-0.5 text-[10px] font-bold text-brand-gold"
              >
                {tg}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRmTag) onRmTag(item.name, tg);
                  }}
                  className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-danger"
                >
                  ×
                </button>
              </span>
            ))}
            <select
              onChange={(e) => {
                const v = e.target.value;
                if (v && onAddTag) {
                  onAddTag(item.name, v);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="cursor-pointer rounded-md border border-brand-gold/25 bg-brand-white px-1 py-0.5 text-[9px] text-brand-gold"
            >
              <option value="">+</option>
              {TAGS.slice()
                .sort((a, b) => a.localeCompare(b, "es"))
                .filter((t) => !(itemTags || []).includes(t))
                .map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>
          <div className="border-t border-brand-gold/15 pt-3.5">
            <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
              Nueva nota
            </span>
            <RichEditor
              key={noteHistory?.length || 0}
              value=""
              onChange={setNoteText}
              placeholder="Escribir nota..."
            />
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "mt-2 cursor-pointer rounded-lg border-none bg-brand-gold px-[22px] py-2 text-xs font-extrabold text-brand-white",
                !noteText.replace(/<[^>]*>/g, "").trim() && "opacity-50"
              )}
            >
              Guardar nota
            </button>
          </div>
          {noteHistory && noteHistory.length > 0 && (
            <div className="mt-[18px] border-t border-brand-gold/15 pt-3.5">
              <span className="mb-2.5 block text-[11px] font-extrabold uppercase tracking-wide text-brand-gold">
                Notas guardadas ({noteHistory.length})
              </span>
              {noteHistory.map((note, i) => (
                <div
                  key={i}
                  className="mb-2 rounded-[10px] border border-brand-gold/15 bg-brand-gold/6 px-3.5 py-3"
                >
                  <div className="mb-1.5 flex flex-row items-center justify-between gap-0">
                    <div>
                      <span className="text-[10px] font-semibold text-text-lt">
                        {note.date || "Sin fecha"}
                      </span>
                      {note.edited && (
                        <span className="ml-2 text-[9px] font-semibold text-brand-gold">
                          editado {note.edited}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-row gap-1">
                      {editIdx !== i && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(i, String(note.text ?? ""));
                          }}
                          className="cursor-pointer rounded-md border border-brand-gold/30 bg-transparent px-2.5 py-0.5 text-[10px] font-bold text-brand-gold"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(i);
                        }}
                        className="cursor-pointer rounded-md border border-danger/25 bg-transparent px-2.5 py-0.5 text-[10px] font-bold text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {editIdx === i ? (
                    <div>
                      <RichEditor
                        key={editIdx}
                        value={editText}
                        onChange={setEditText}
                      />
                      <div className="mt-1.5 flex flex-row gap-1.5">
                        <button
                          type="button"
                          onClick={() => confirmEdit(i)}
                          className="cursor-pointer rounded-md border-none bg-brand-gold px-4 py-1.5 text-[11px] font-extrabold text-brand-white"
                        >
                          Guardar cambios
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="cursor-pointer rounded-md border border-brand-gold/30 bg-transparent px-4 py-1.5 text-[11px] font-bold text-text-lt"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="font-sans text-[13px] leading-relaxed text-text-dk"
                      dangerouslySetInnerHTML={{
                        __html: String(note.text ?? ""),
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {onDeleteNode && (
            <div className="mt-3.5 border-t border-danger/15 pt-3.5">
              {!confirmDel ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDel(true);
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-danger/20 bg-danger/8 p-2.5 text-xs font-bold text-danger"
                >
                  ❌ Eliminar este nodo
                </button>
              ) : (
                <div className="rounded-[10px] border border-danger/20 bg-danger/8 px-3.5 py-3">
                  <span className="mb-2 block text-xs font-bold text-danger">
                    ¿Eliminar &quot;{item.name}&quot;?
                  </span>
                  <span className="mb-2.5 block text-[11px] text-text-lt">
                    Se eliminará el nodo, sus contactos y notas. Esta acción no
                    se puede deshacer.
                  </span>
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode();
                      }}
                      className="cursor-pointer rounded-lg border-none bg-danger px-5 py-2 text-xs font-extrabold text-brand-white"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDel(false);
                      }}
                      className="cursor-pointer rounded-lg border border-brand-gold/30 bg-transparent px-5 py-2 text-xs font-bold text-text-lt"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
