const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.nodsend.com"
    : "http://localhost:3002");

// Automatically strip any trailing slashes to prevent // in paths
const API_URL = RAW_API_URL.replace(/\/$/, "");

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return response;
}

export { API_URL };
