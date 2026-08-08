import Link from "next/link";

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="34" height="34" rx="9" fill="currentColor" fillOpacity=".08" stroke="currentColor" />
      <path d="M10 11h7v5h-3v4h3v5h-7V11Zm16 0h-7v5h3v4h-3v5h7V11Z" fill="currentColor" />
      <circle cx="18" cy="18" r="2" fill="var(--background)" />
    </svg>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="brand" aria-label="Nodsend home">
      <BrandMark size={compact ? 30 : 36} />
      <span>Nodsend</span>
    </Link>
  );
}
