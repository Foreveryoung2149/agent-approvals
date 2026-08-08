"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function CodeBlock({ children, label = "Example" }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="docs-code">
      <div className="docs-code-header"><span>{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label}`}><Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy"}</button></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}
