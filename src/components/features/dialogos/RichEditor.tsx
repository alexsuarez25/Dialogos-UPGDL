import { useEffect, useRef } from "react";
import { cn } from "../../../lib/cn";

export function RichEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
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
  const toolBtn =
    "flex h-[26px] w-7 cursor-pointer items-center justify-center rounded-[5px] border border-brand-gold/30 bg-brand-white text-[13px] text-text-dk";

  return (
    <div className={cn(className)}>
      <div className="mb-1.5 flex flex-row gap-0.5 border-b border-brand-gold/20 pb-1.5">
        <button
          type="button"
          onClick={() => exec("bold")}
          className={cn(toolBtn, "font-black")}
          title="Negritas"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className={cn(toolBtn, "italic")}
          title="Itálicas"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className={cn(toolBtn, "underline")}
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
        className="max-h-[140px] min-h-[70px] overflow-y-auto rounded-lg border border-brand-gold/30 bg-brand-gold/6 px-3 py-2.5 font-sans text-[13px] leading-relaxed text-text-dk outline-none"
      />
    </div>
  );
}
