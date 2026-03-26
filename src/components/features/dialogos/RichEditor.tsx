import { useEffect, useRef } from "react";
import type { Palette } from "../../../types/palette";

export function RichEditor({
  value,
  onChange,
  placeholder,
  palette,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  palette: Palette;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    ref.current?.focus();
  };
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML && value) {
      ref.current.innerHTML = value;
    }
  }, [value]);
  const C = palette;
  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          marginBottom: 6,
          borderBottom: `1px solid ${C.gold}20`,
          paddingBottom: 6,
        }}
      >
        <button
          type="button"
          onClick={() => exec("bold")}
          style={{
            width: 28,
            height: 26,
            border: `1px solid ${C.gold}30`,
            borderRadius: 5,
            background: C.white,
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 13,
            color: C.textDk,
          }}
          title="Negritas"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          style={{
            width: 28,
            height: 26,
            border: `1px solid ${C.gold}30`,
            borderRadius: 5,
            background: C.white,
            cursor: "pointer",
            fontStyle: "italic",
            fontSize: 13,
            color: C.textDk,
          }}
          title="Itálicas"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          style={{
            width: 28,
            height: 26,
            border: `1px solid ${C.gold}30`,
            borderRadius: 5,
            background: C.white,
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: 13,
            color: C.textDk,
          }}
          title="Subrayado"
        >
          U
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder || ""}
        style={{
          minHeight: 70,
          padding: "10px 12px",
          fontSize: 13,
          border: `1px solid ${C.gold}30`,
          borderRadius: 8,
          outline: "none",
          color: C.textDk,
          background: `${C.gold}06`,
          lineHeight: 1.6,
          fontFamily: "'Source Sans 3',sans-serif",
          overflowY: "auto",
          maxHeight: 140,
        }}
      />
    </div>
  );
}
