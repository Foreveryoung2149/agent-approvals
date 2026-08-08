const REQUIRED_PRODUCTION_VALUES = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "AUTH_CODE_PEPPER",
  "TOTP_ENCRYPTION_KEY",
  "CORS_ORIGIN",
  "APP_URL",
  "RESEND_API_KEY",
  "FROM_EMAIL",
];

export function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_VALUES.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (process.env.API_AUTH_DISABLED === "true") {
    throw new Error("API_AUTH_DISABLED cannot be enabled in production.");
  }

  if ((process.env.SESSION_SECRET || "").length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  if ((process.env.AUTH_CODE_PEPPER || "").length < 32) {
    throw new Error("AUTH_CODE_PEPPER must contain at least 32 characters.");
  }

  const totpKey = process.env.TOTP_ENCRYPTION_KEY || "";
  const decodedTotpKey = /^[a-f0-9]{64}$/i.test(totpKey)
    ? Buffer.from(totpKey, "hex")
    : Buffer.from(totpKey, "base64url");
  if (decodedTotpKey.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY must encode exactly 32 random bytes.");
  }

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10.");
  }

  if ((process.env.CORS_ORIGIN || "").split(",").some((origin) => origin.trim() === "*")) {
    throw new Error("Wildcard CORS origins are not allowed in production.");
  }

  for (const name of ["APP_URL", "CORS_ORIGIN"]) {
    for (const rawValue of (process.env[name] || "").split(",")) {
      const url = new URL(rawValue.trim());
      if (url.protocol !== "https:") {
        throw new Error(`${name} must use HTTPS in production.`);
      }
    }
  }
}
