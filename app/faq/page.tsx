import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "FAQ — Nodsend",
  description: "Frequently asked questions about Nodsend.",
};

export default function FAQPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 32px", flex: 1, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div className="eyebrow" style={{ marginBottom: "20px" }}>FAQ</div>
          <h1 className="heading-display" style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "var(--gray-12)", margin: "0 0 12px" }}>
            Frequently asked questions
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="feature-card">
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 12px" }}>What is Nodsend?</h3>
            <p style={{ fontSize: "14px", color: "var(--gray-9)", margin: 0, lineHeight: 1.65 }}>
              Nodsend is an API that lets AI agents pause and wait for a human to approve an action before proceeding. It handles email delivery, secure webhooks, and auto-expiry.
            </p>
          </div>
          <div className="feature-card">
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 12px" }}>How does it work?</h3>
            <p style={{ fontSize: "14px", color: "var(--gray-9)", margin: 0, lineHeight: 1.65 }}>
              Your agent hits our API with a summary of the action it wants to take. We email the human in the loop. The human clicks "Approve" or "Reject". We send a signed webhook back to your server so your agent can continue.
            </p>
          </div>
          <div className="feature-card">
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 12px" }}>Is it secure?</h3>
            <p style={{ fontSize: "14px", color: "var(--gray-9)", margin: 0, lineHeight: 1.65 }}>
              Yes. All webhooks are signed using HMAC-SHA256, and links are single-use with cryptographic signatures to prevent tampering.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
