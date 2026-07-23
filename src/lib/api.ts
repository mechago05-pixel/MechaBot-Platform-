const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "client" | "mechanic";
  user_metadata: { full_name: string; phone: string | null };
};

type ApiEnvelope<T> = { data: T; error?: never } | { data?: never; error: { message: string } };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || "error" in payload) throw new Error(payload.error?.message || "Request failed");
  return payload.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  upload: <T>(path: string, data: FormData) => request<T>(path, { method: "POST", body: data }),
};
