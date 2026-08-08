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

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }

    throw new Error(
      "Nodsend's API is temporarily unavailable. Please try again in a moment.",
      { cause },
    );
  }
}

export { API_URL };
