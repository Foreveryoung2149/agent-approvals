const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.nodsend.com"
    : "http://localhost:3002");

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("nod_session") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return response;
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nod_session");
}

export function setSessionToken(token: string) {
  localStorage.setItem("nod_session", token);
}

export function clearSessionToken() {
  localStorage.removeItem("nod_session");
}

export { API_URL };