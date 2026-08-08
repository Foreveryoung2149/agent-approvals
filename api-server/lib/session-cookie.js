export const SESSION_COOKIE_NAME = "nodsend_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function readSessionCookie(req) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

export function readSessionToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return readSessionCookie(req);
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", serializeCookie(token, SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie("", 0));
}

function serializeCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure,
  ].filter(Boolean).join("; ");
}
