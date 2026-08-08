import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "Blog — Nodsend",
  description: "Updates and thoughts on AI alignment and human-in-the-loop systems.",
};

export default function BlogPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 32px", flex: 1, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div className="eyebrow" style={{ marginBottom: "20px" }}>Blog</div>
          <h1 className="heading-display" style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "var(--gray-12)", margin: "0 0 12px" }}>
            Latest updates
          </h1>
          <p style={{ color: "var(--gray-9)", fontSize: "17px", margin: 0 }}>
            Thoughts on AI alignment, agency, and human-in-the-loop systems.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="feature-card">
            <div style={{ fontSize: "13px", color: "var(--accent-dim)", fontWeight: 600, marginBottom: "8px" }}>August 8, 2026</div>
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 12px" }}>Introducing Nodsend</h3>
            <p style={{ fontSize: "14px", color: "var(--gray-9)", margin: 0, lineHeight: 1.65 }}>
              As AI agents become more capable, the need for human oversight grows. Today, we're launching Nodsend to make it trivial for developers to add human-in-the-loop approvals to any AI agent workflow with a single API call.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
