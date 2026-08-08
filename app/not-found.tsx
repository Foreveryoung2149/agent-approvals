import Link from "next/link";
import { BrandMark } from "./components/Brand";
import { Icon } from "./components/Icon";

export default function NotFound() {
  return <main id="main-content" className="route-state" tabIndex={-1}><BrandMark size={50} /><span className="signal-label">404 / Route not found</span><h1>This node isn’t connected.</h1><p>The address may have changed, or the resource no longer exists.</p><div className="hero-actions"><Link href="/" className="btn-primary">Return home <Icon name="arrow" size={16} /></Link><Link href="/docs" className="btn-secondary">Open documentation</Link></div></main>;
}
