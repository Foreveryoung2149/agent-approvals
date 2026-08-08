"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { apiFetch } from "../lib/api";

const links = [
  { href: "/docs", label: "Documentation" },
  { href: "/#integrations", label: "Integrations" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/v1/auth/me", { signal: controller.signal })
      .then((response) => setIsLoggedIn(response.ok))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsLoggedIn(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <div className="container site-nav-inner">
        <Brand />
        <div className="site-nav-links">
          {links.map((link) => <Link key={link.href} href={link.href} className="nav-link">{link.label}</Link>)}
        </div>
        <div className="site-nav-actions">
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary btn-compact">Open console <Icon name="arrow" size={14} /></Link>
          ) : (
            <>
              <Link href="/login" className="nav-link">Sign in</Link>
              <Link href="/signup" className="btn-primary btn-compact">Start free <Icon name="arrow" size={14} /></Link>
            </>
          )}
          <button className="site-mobile-trigger" type="button" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>
      {open && (
        <div className="site-mobile-menu">
          {links.map((link) => <Link key={link.href} href={link.href} className="nav-link" onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link href={isLoggedIn ? "/dashboard" : "/login"} className="nav-link" onClick={() => setOpen(false)}>{isLoggedIn ? "Open console" : "Sign in"}</Link>
          {!isLoggedIn && <Link href="/signup" className="btn-primary">Start free</Link>}
        </div>
      )}
    </nav>
  );
}
