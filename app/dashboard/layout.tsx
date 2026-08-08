"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import { LoadingState } from "../components/DashboardUI";
import { Icon, type IconName } from "../components/Icon";
import type { DashboardUser } from "../components/dashboard/types";
import { apiFetch } from "../lib/api";

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Command center", icon: "dashboard" },
  { href: "/dashboard/approvals", label: "Approvals", icon: "approval" },
  { href: "/dashboard/api-keys", label: "API keys", icon: "key" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "webhook" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function pathLabel(pathname: string) {
  return navItems.find((item) => item.href === pathname)?.label || "Workspace";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [authState, setAuthState] = useState<"checking" | "ready">("checking");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/v1/auth/me", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        const data = (await response.json()) as { user?: DashboardUser };
        if (!data.user) throw new Error("Session expired");
        setUser(data.user);
        setAuthState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        router.replace("/login");
      });

    return () => controller.abort();
  }, [router]);

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncNavigationMode = () => {
      setCompactNavigation(mediaQuery.matches);
      if (!mediaQuery.matches) setMobileMenuOpen(false);
    };
    syncNavigationMode();
    mediaQuery.addEventListener("change", syncNavigationMode);
    return () => mediaQuery.removeEventListener("change", syncNavigationMode);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const initials = useMemo(() => {
    const source = user?.name?.trim() || user?.email || "N";
    return source.slice(0, 2).toUpperCase();
  }, [user]);

  async function logout() {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  if (authState === "checking") return <LoadingState label="Securing workspace" />;

  return (
    <div className="dashboard-shell">
      <header className="dash-mobile-header">
        <Brand compact />
        <button
          type="button"
          className="dash-menu-button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close workspace navigation" : "Open workspace navigation"}
          aria-expanded={mobileMenuOpen}
          aria-controls="workspace-navigation"
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size={20} />
        </button>
      </header>

      <button
        type="button"
        className="dash-mobile-backdrop"
        data-open={mobileMenuOpen}
        aria-label="Close workspace navigation"
        aria-hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        id="workspace-navigation"
        className="dash-sidebar"
        data-open={mobileMenuOpen}
        aria-label="Workspace navigation"
        aria-hidden={compactNavigation && !mobileMenuOpen ? true : undefined}
        inert={compactNavigation && !mobileMenuOpen ? true : undefined}
      >
        <div className="dash-sidebar-brand"><Brand /></div>
        <nav className="dash-nav">
          <span className="dash-nav-section">Control plane</span>
          {navItems.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="dash-nav-link" data-active={active} aria-current={active ? "page" : undefined}>
                <span><Icon name={item.icon} size={17} /></span>
                {item.label}
              </Link>
            );
          })}
          <span className="dash-nav-section">Build</span>
          <Link href="/docs" className="dash-nav-link">
            <span><Icon name="book" size={17} /></span>
            Documentation
          </Link>
        </nav>

        <div className="dash-account">
          <div className="dash-account-row">
            <span className="dash-avatar" aria-hidden="true">{initials}</span>
            <div>
              <strong>{user?.name || user?.email}</strong>
              {user?.name && <small>{user.email}</small>}
            </div>
          </div>
          <button type="button" className="dash-signout" onClick={() => void logout()}>Sign out</button>
        </div>
      </aside>

      <main className="dash-main" id="main-content" tabIndex={-1}>
        <div className="dash-topbar">
          <span className="dash-topbar-title">{pathLabel(pathname)}</span>
          <span className="dash-health">Systems operational</span>
        </div>
        <div className="dash-content">{children}</div>
      </main>
    </div>
  );
}
