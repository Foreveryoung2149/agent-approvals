import { ImageResponse } from "next/og";

export const alt = "Nodsend — human approval infrastructure for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        color: "#f3f3ec",
        background: "#080a08",
        backgroundImage:
          "linear-gradient(rgba(218,255,96,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(218,255,96,.07) 1px, transparent 1px), radial-gradient(circle at 78% 25%, rgba(218,255,96,.13), transparent 34%)",
        backgroundSize: "48px 48px, 48px 48px, 100% 100%",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <rect x="2" y="2" width="60" height="60" rx="16" fill="#101210" stroke="#ddff68" strokeWidth="2" />
          <path d="M17 18h13v9h-6v10h6v9H17V18Zm30 0H34v9h6v10h-6v9h13V18Z" fill="#ddff68" />
          <circle cx="32" cy="32" r="4" fill="#101210" stroke="#ddff68" strokeWidth="2" />
        </svg>
        <div style={{ fontSize: 34, fontWeight: 750, letterSpacing: "-1px" }}>Nodsend</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <div
          style={{
            color: "#ddff66",
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "4px",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Human control for autonomous systems
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 74, lineHeight: 1.02, fontWeight: 760, letterSpacing: "-3px" }}>
          <div>Agents move fast.</div>
          <div>Decisions stay accountable.</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", color: "#a8aaa0", fontSize: 21 }}>
        <div>One approval API · Signed outcomes · Complete decision history</div>
        <div style={{ color: "#ddff66" }}>nodsend.com</div>
      </div>
    </div>,
    size,
  );
}
