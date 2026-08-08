"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "./components/Brand";
import { Icon } from "./components/Icon";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main id="main-content" className="route-state" tabIndex={-1}><BrandMark size={50} /><span className="signal-label">Unexpected interruption</span><h1>That circuit didn’t complete.</h1><p>The error was contained. Retry the request, or return to the Nodsend home page.</p><div className="hero-actions"><button type="button" className="btn-primary" onClick={reset}>Try again <Icon name="activity" size={16} /></button><Link href="/" className="btn-secondary">Go home</Link></div>{error.digest && <code>Reference: {error.digest}</code>}</main>;
}
