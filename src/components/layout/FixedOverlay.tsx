import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function FixedOverlay({
  onBackdropClick,
  children,
  style,
  className,
  zIndex = 100,
}: {
  onBackdropClick?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  zIndex?: number;
}) {
  return (
    <div
      role="presentation"
      onClick={onBackdropClick}
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-brand-black/30",
        className
      )}
      style={{ zIndex, ...style }}
    >
      {children}
    </div>
  );
}
