import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--gray-3)",
        padding: "48px 0",
        marginTop: "auto",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "grid",
              width: "22px",
              height: "22px",
              placeItems: "center",
              borderRadius: "5px",
              background: "var(--accent)",
              color: "#050505",
              fontSize: "11px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            N
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: "14px",
              color: "var(--gray-9)",
            }}
          >
            Nodsend
          </span>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link
            href="/docs"
            style={{ color: "var(--gray-8)", fontSize: "13px" }}
          >
            Docs
          </Link>
          <Link
            href="/pricing"
            style={{ color: "var(--gray-8)", fontSize: "13px" }}
          >
            Pricing
          </Link>
          <span style={{ color: "var(--gray-6)", fontSize: "13px" }}>
            © {new Date().getFullYear()} Nodsend
          </span>
        </div>
      </div>
    </footer>
  );
}
