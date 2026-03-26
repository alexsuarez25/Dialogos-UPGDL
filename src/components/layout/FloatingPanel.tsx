import type { CSSProperties, MouseEvent, ReactNode } from "react";

export function FloatingPanel({
  onPanelMouseDown,
  children,
  style,
}: {
  onPanelMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      onMouseDown={onPanelMouseDown}
      onClick={(e) => e.stopPropagation()}
      style={style}
    >
      {children}
    </div>
  );
}
