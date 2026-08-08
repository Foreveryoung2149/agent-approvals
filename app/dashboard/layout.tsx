"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getSessionToken, clearSessionToken } from "../lib/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/approvals", label: "Approvals", icon: "◉" },
  { href: "/dashboard/api-keys", label: "API Keys", icon: "⌘" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "↯" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getSessionToken()) {
      router.push("/login");
      return;
    }
    apiFetch("/v1/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
        else {
          clearSessionToken();
          router.push("/login");
        }
      })
      .catch(() => {
        clearSessionToken();
        router.push("/login");
      });
  }, [router]);

  function logout() {
    clearSessionToken();
    router.push("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Mobile header */}
      <div
        className="lg:hidden"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--gray-3)",
          background: "rgba(5, 5, 5, 0.95)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "grid",
              width: "24px",
              height: "24px",
              placeItems: "center",
              borderRadius: "6px",
              background: "var(--accent)",
              color: "#050505",
              fontSize: "12px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            N
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "15px", color: "var(--gray-12)" }}>
            Nodsend
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: "none",
            border: "none",
            color: "var(--gray-11)",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      </div>

      {/* Sidebar (desktop) */}
      <aside
        className="hidden lg:flex"
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          width: "256px",
          flexDirection: "column",
          borderRight: "1px solid var(--gray-3)",
          background: "rgba(8, 8, 8, 0.95)",
          padding: "24px 16px",
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "36px",
            paddingLeft: "4px",
          }}
        >
          <span
            style={{
              display: "grid",
              width: "28px",
              height: "28px",
              placeItems: "center",
              borderRadius: "7px",
              background: "var(--accent)",
              color: "#050505",
              fontSize: "14px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            N
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "17px",
              color: "var(--gray-12)",
              letterSpacing: "-0.02em",
            }}
          >
            Nodsend
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: "grid", gap: "4px", flex: 1 }}>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
          <Link href="/docs" className="nav-link" style={{ marginTop: "8px" }}>
            <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>📖</span>
            Docs
          </Link>
        </nav>

        {/* User */}
        <div
          style={{
            borderTop: "1px solid var(--gray-3)",
            paddingTop: "16px",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--gray-12)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || user?.email || "..."}
              </div>
              {user?.name && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-8)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </div>
              )}
            </div>
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "none",
                color: "var(--gray-8)",
                fontSize: "13px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "6px",
                transition: "color 150ms",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-8)")}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64" style={{ minHeight: "100vh" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 28px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
