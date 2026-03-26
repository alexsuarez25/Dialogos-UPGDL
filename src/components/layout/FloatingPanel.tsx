import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function FloatingPanel({
  onPanelMouseDown,
  children,
  style,
  className,
}: {
  onPanelMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      onMouseDown={onPanelMouseDown}
      onClick={(e) => e.stopPropagation()}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
