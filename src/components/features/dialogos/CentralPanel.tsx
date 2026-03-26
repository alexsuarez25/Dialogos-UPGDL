import type { DescSection } from "../../../types/nodes";
import { cn } from "../../../lib/cn";

type CentralDescribe = {
  title?: string;
  objetivos?: { h: string; t: string }[];
  sections?: DescSection[];
  escuelas?: string[];
};

export function CentralPanel({
  data,
  accent,
  onClose,
  isCentral,
  resolveTags,
  className,
}: {
  data: CentralDescribe | null;
  accent?: string;
  onClose: () => void;
  isCentral: boolean;
  resolveTags: (title: string) => string[];
  className?: string;
}) {
  const footerAccent = accent ?? undefined;
  return (
    <div
      className={cn(
        "absolute right-0 top-0 z-30 flex h-full w-[420px] animate-[slI_0.45s_cubic-bezier(0.22,1,0.36,1)] flex-col border-l-2 border-l-brand-gold/40 bg-surface-panel",
        className
      )}
      style={{ boxShadow: "-6px 0 36px rgba(0,0,0,0.08)" }}
    >
      <div className="flex shrink-0 flex-row items-start justify-between gap-0 border-b border-b-brand-gold/25 px-6 pb-4 pt-[22px]">
        <div className="flex-1 pr-3">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-brand-gold">
            {isCentral ? "Universidad Panamericana" : "Proyecto"}
          </span>
          <span className="block font-display text-[22px] font-black leading-snug text-text-dk">
            {data?.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/40 bg-transparent text-[15px] text-text-lt"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-7 pt-[18px]">
        {isCentral ? (
          <>
            {(data?.objetivos || []).map((o, i) => (
              <div key={i} className="mb-4">
                <span className="mb-1 block text-xs font-extrabold text-brand-blue">
                  {o.h}
                </span>
                <span className="block text-sm leading-relaxed text-text-md">
                  {o.t}
                </span>
              </div>
            ))}
          </>
        ) : (
          <>
            {(data?.sections || []).map((s, i) => (
              <div key={i} className="mb-5">
                <span
                  className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-brand-gold"
                  style={accent ? { color: accent } : undefined}
                >
                  {s.h}
                </span>
                <span className="block text-base leading-loose text-text-md">
                  {s.t}
                </span>
              </div>
            ))}
            {(data?.escuelas?.length || 0) > 0 && (
              <div className="mt-2 border-t border-brand-gold/20 pt-[18px]">
                <span className="mb-2.5 block text-xs font-extrabold uppercase tracking-wide text-brand-gold">
                  Escuelas y Facultades
                </span>
                <ul className="ml-5 list-disc">
                  {(data?.escuelas || []).map((e, i) => (
                    <li
                      key={i}
                      className="text-[15px] font-semibold leading-[2.1] text-text-md"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data?.title && resolveTags(data.title).length > 0 && (
              <div className="mt-3 border-t border-brand-gold/20 pt-3.5">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-brand-gold">
                  Temáticas estratégicas
                </span>
                <div className="flex flex-row flex-wrap gap-1.5">
                  {resolveTags(data.title).map((tg, i) => (
                    <span
                      key={i}
                      className="rounded-xl border border-brand-gold/25 bg-brand-gold/15 px-3 py-0.5 text-[10px] font-bold text-brand-gold"
                    >
                      {tg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div
        className="h-[3px] shrink-0"
        style={{
          background: `linear-gradient(90deg,${footerAccent || "var(--color-brand-gold)"},var(--color-brand-gold))`,
        }}
      />
    </div>
  );
}
