import { BrandMark } from "./components/Brand";

export default function Loading() {
  return <main id="main-content" className="route-state" role="status" aria-live="polite" tabIndex={-1}><BrandMark size={50} /><span className="route-spinner" /><h1>Loading Nodsend</h1><p>Preparing the decision control plane…</p></main>;
}
