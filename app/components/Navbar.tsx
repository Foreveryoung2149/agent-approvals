"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionToken } from "../lib/api";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getSessionToken());
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--background)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
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

        {/* Center nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Link href="/docs" className="nav-link">
            Docs
          </Link>
          <Link href="/pricing" className="nav-link">
            Pricing
          </Link>
          <Link href="/faq" className="nav-link">
            FAQ
          </Link>
          <Link href="/blog" className="nav-link">
            Blog
          </Link>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
