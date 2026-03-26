import { useState } from "react";
import { TAGS } from "../../../tagMapDefault.js";
import type { MapItem, NoteRow } from "../../../types/nodes";
import type { LocalContactRow } from "../../../lib/contactHelpers";
import type { Palette } from "../../../types/palette";
import { RichEditor } from "./RichEditor";

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
  onDeleteNode,
  itemTags,
  onAddTag,
  onRmTag,
  mainContactHidden,
  onHideMainContact,
  onRestoreMainContact,
  palette,
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
  onAddContact: (c: { name: string; cargo?: string; email?: string }) => void;
  onEditContact: (
    idx: number,
    c: { name: string; cargo?: string; email?: string }
  ) => void;
  onDelContact: (idx: number) => void;
  onDeleteNode?: (() => void) | null;
  itemTags?: string[];
  onAddTag?: (nodeName: string, tag: string) => void;
  onRmTag?: (nodeName: string, tag: string) => void;
  mainContactHidden?: boolean;
  onHideMainContact?: (name: string) => void;
  onRestoreMainContact?: (name: string) => void;
  palette: Palette;
}) {
  const C = palette;
  const g = C.gold;
  const [confirmDel, setConfirmDel] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showAddC, setShowAddC] = useState(false);
  const [cForm, setCForm] = useState({ name: "", cargo: "", email: "" });
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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,26,0.3)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(540px,94vw)",
          maxHeight: "88vh",
          background: C.white,
          border: `1px solid ${g}30`,
          borderRadius: 16,
          boxShadow: "0 10px 50px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "pU 0.3s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 0,
            padding: "22px 24px 14px",
            flexShrink: 0,
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: C.textDk,
                lineHeight: 1.4,
                fontFamily: "'Cormorant Garamond',serif",
              }}
            >
              {item.name}
            </span>
            {item.contact && !mainContactHidden && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 0,
                  marginTop: 8,
                  background: `${g}10`,
                  border: `1px solid ${g}20`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: g,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Contacto principal:{" "}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.textDk,
                      fontFamily: "'Cormorant Garamond',serif",
                    }}
                  >
                    {item.contact}
                  </span>
                </div>
                {onHideMainContact && (
<button type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onHideMainContact(item.name);
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.pulseRed}25`,
                      color: C.pulseRed,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {item.contact && mainContactHidden && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 0,
                  marginTop: 8,
                  background: `${g}06`,
                  border: `1px solid ${g}15`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: C.textLt,
                    fontStyle: "italic",
                  }}
                >
                  Contacto principal eliminado
                </span>
                {onRestoreMainContact && (
<button type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreMainContact(item.name);
                    }}
                    style={{
                      background: `${g}12`,
                      border: `1px solid ${g}25`,
                      color: g,
                      borderRadius: 6,
                      padding: "2px 10px",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Restaurar
                  </button>
                )}
              </div>
            )}
            {!item.contact &&
              (!userContacts || userContacts.length === 0) && (
                <div
                  style={{
                    marginTop: 8,
                    background: `${C.pulseRed}08`,
                    border: `1px solid ${C.pulseRed}18`,
                    borderRadius: 8,
                    padding: "8px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.pulseRed,
                    }}
                  >
                    ⚠ Pendiente de vinculación
                  </span>
                </div>
              )}
          </div>
<button type="button" 
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${g}30`,
              color: C.textLt,
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 15,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
          <div
            style={{
              borderTop: `1px solid ${g}15`,
              paddingTop: 14,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 0,
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: g,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Contactos{" "}
                {userContacts && userContacts.length > 0
                  ? `(${userContacts.length})`
                  : ""}
              </span>
<button type="button" 
                onClick={() => {
                  setShowAddC(true);
                  setCForm({ name: "", cargo: "", email: "" });
                  setEditCIdx(null);
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: g,
                  background: `${g}12`,
                  border: `1px solid ${g}25`,
                  borderRadius: 6,
                  padding: "3px 12px",
                  cursor: "pointer",
                }}
              >
                + Agregar
              </button>
            </div>
            {showAddC && (
              <div
                style={{
                  background: `${g}06`,
                  border: `1px solid ${g}20`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <input
                  value={cForm.name}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nombre *"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    fontSize: 12,
                    border: `1px solid ${g}30`,
                    borderRadius: 6,
                    outline: "none",
                    marginBottom: 6,
                    boxSizing: "border-box",
                    fontFamily: "'Source Sans 3',sans-serif",
                  }}
                />
                <input
                  value={cForm.cargo}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, cargo: e.target.value }))
                  }
                  placeholder="Cargo (opcional)"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    fontSize: 12,
                    border: `1px solid ${g}30`,
                    borderRadius: 6,
                    outline: "none",
                    marginBottom: 6,
                    boxSizing: "border-box",
                    fontFamily: "'Source Sans 3',sans-serif",
                  }}
                />
                <input
                  value={cForm.email}
                  onChange={(e) =>
                    setCForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="Correo electrónico"
                  type="email"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    fontSize: 12,
                    border: `1px solid ${
                      cForm.email && !emailOk(cForm.email)
                        ? C.pulseRed
                        : g
                    }30`,
                    borderRadius: 6,
                    outline: "none",
                    marginBottom: 8,
                    boxSizing: "border-box",
                    fontFamily: "'Source Sans 3',sans-serif",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
<button type="button" 
                    onClick={() => {
                      if (!cForm.name.trim()) return;
                      if (cForm.email && !emailOk(cForm.email)) return;
                      if (editCIdx !== null) {
                        onEditContact(editCIdx, { ...cForm });
                        setEditCIdx(null);
                      } else {
                        onAddContact({ ...cForm });
                      }
                      setCForm({ name: "", cargo: "", email: "" });
                      setShowAddC(false);
                    }}
                    style={{
                      padding: "6px 16px",
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.white,
                      background: g,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      opacity: cForm.name.trim() ? 1 : 0.5,
                    }}
                  >
                    {editCIdx !== null ? "Guardar cambios" : "Agregar contacto"}
                  </button>
<button type="button" 
                    onClick={() => {
                      setShowAddC(false);
                      setEditCIdx(null);
                    }}
                    style={{
                      padding: "6px 16px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.textLt,
                      background: "transparent",
                      border: `1px solid ${g}30`,
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {(userContacts || []).map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "8px 0",
                  borderBottom: `1px solid ${g}08`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.green,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.textDk,
                    }}
                  >
                    {c.name}
                  </span>
                  {c.cargo && (
                    <span style={{ fontSize: 11, color: C.textMd }}>
                      {c.cargo}
                    </span>
                  )}
                  {c.email && (
                    <span style={{ fontSize: 11, color: C.blue }}>
                      {c.email}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 3,
                    flexShrink: 0,
                  }}
                >
<button type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCForm({
                        name: c.name,
                        cargo: c.cargo || "",
                        email: c.email || "",
                      });
                      setEditCIdx(i);
                      setShowAddC(true);
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${g}30`,
                      color: g,
                      borderRadius: 5,
                      padding: "2px 8px",
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>
<button type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelContact(i);
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.pulseRed}25`,
                      color: C.pulseRed,
                      borderRadius: 5,
                      padding: "2px 8px",
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 4,
              flexWrap: "wrap",
              marginBottom: 14,
              alignItems: "center",
            }}
          >
            {(itemTags || []).map((tg, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: g,
                  background: `${g}12`,
                  border: `1px solid ${g}25`,
                  borderRadius: 12,
                  padding: "2px 8px 2px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {tg}
<button type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRmTag) onRmTag(item.name, tg);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.pulseRed,
                    fontSize: 11,
                    cursor: "pointer",
                    padding: 0,
                  }}
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
              style={{
                fontSize: 9,
                padding: "2px 4px",
                border: `1px solid ${g}25`,
                borderRadius: 6,
                color: g,
                background: C.white,
                cursor: "pointer",
              }}
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
          <div style={{ borderTop: `1px solid ${g}15`, paddingTop: 14 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: g,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 8,
              }}
            >
              Nueva nota
            </span>
            <RichEditor
              key={noteHistory?.length || 0}
              value=""
              onChange={setNoteText}
              placeholder="Escribir nota..."
              palette={palette}
            />
<button type="button" 
              onClick={onSave}
              style={{
                marginTop: 8,
                padding: "8px 22px",
                fontSize: 12,
                fontWeight: 800,
                color: C.white,
                background: g,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                opacity: noteText.replace(/<[^>]*>/g, "").trim() ? 1 : 0.5,
              }}
            >
              Guardar nota
            </button>
          </div>
          {noteHistory && noteHistory.length > 0 && (
            <div
              style={{
                marginTop: 18,
                borderTop: `1px solid ${g}15`,
                paddingTop: 14,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: g,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: 10,
                }}
              >
                Notas guardadas ({noteHistory.length})
              </span>
              {noteHistory.map((note, i) => (
                <div
                  key={i}
                  style={{
                    background: `${g}06`,
                    border: `1px solid ${g}15`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: 0,
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          color: C.textLt,
                          fontWeight: 600,
                        }}
                      >
                        {note.date || "Sin fecha"}
                      </span>
                      {note.edited && (
                        <span
                          style={{
                            fontSize: 9,
                            color: g,
                            fontWeight: 600,
                            marginLeft: 8,
                          }}
                        >
                          editado {note.edited}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
                      {editIdx !== i && (
<button type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(
                              i,
                              String(note.text ?? "")
                            );
                          }}
                          style={{
                            background: "transparent",
                            border: `1px solid ${g}30`,
                            color: g,
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                      )}
<button type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(i);
                        }}
                        style={{
                          background: "transparent",
                          border: `1px solid ${C.pulseRed}25`,
                          color: C.pulseRed,
                          borderRadius: 6,
                          padding: "2px 10px",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
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
                        palette={palette}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
<button type="button" 
                          onClick={() => confirmEdit(i)}
                          style={{
                            padding: "5px 16px",
                            fontSize: 11,
                            fontWeight: 800,
                            color: C.white,
                            background: g,
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          Guardar cambios
                        </button>
<button type="button" 
                          onClick={cancelEdit}
                          style={{
                            padding: "5px 16px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.textLt,
                            background: "transparent",
                            border: `1px solid ${g}30`,
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: C.textDk,
                        lineHeight: 1.6,
                        fontFamily: "'Source Sans 3',sans-serif",
                      }}
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
            <div
              style={{
                borderTop: `1px solid ${C.pulseRed}15`,
                padding: "14px 0 0",
                marginTop: 14,
              }}
            >
              {!confirmDel ? (
<button type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDel(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.pulseRed,
                    background: `${C.pulseRed}08`,
                    border: `1px solid ${C.pulseRed}20`,
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  ❌ Eliminar este nodo
                </button>
              ) : (
                <div
                  style={{
                    background: `${C.pulseRed}08`,
                    border: `1px solid ${C.pulseRed}20`,
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.pulseRed,
                      marginBottom: 8,
                    }}
                  >
                    ¿Eliminar &quot;{item.name}&quot;?
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.textLt,
                      marginBottom: 10,
                    }}
                  >
                    Se eliminará el nodo, sus contactos y notas. Esta acción no
                    se puede deshacer.
                  </span>
                  <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
<button type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode();
                      }}
                      style={{
                        padding: "8px 20px",
                        fontSize: 12,
                        fontWeight: 800,
                        color: C.white,
                        background: C.pulseRed,
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Sí, eliminar
                    </button>
<button type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDel(false);
                      }}
                      style={{
                        padding: "8px 20px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.textLt,
                        background: "transparent",
                        border: `1px solid ${g}30`,
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
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
