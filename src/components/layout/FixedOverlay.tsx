import type { CSSProperties, MouseEvent, ReactNode } from "react";

export function FixedOverlay({
  onBackdropClick,
  children,
  style,
  zIndex = 100,
}: {
  onBackdropClick?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  style?: CSSProperties;
  zIndex?: number;
}) {
  return (
    <div
      role="presentation"
      onClick={onBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,26,0.3)",
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
