const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("careprior_staff_access_token");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("careprior_staff_role");
}

export function getFullName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("careprior_staff_full_name");
}

export function setSession(accessToken: string, refreshToken: string, role: string, userId: string, fullName: string) {
  window.localStorage.setItem("careprior_staff_access_token", accessToken);
  window.localStorage.setItem("careprior_staff_refresh_token", refreshToken);
  window.localStorage.setItem("careprior_staff_role", role);
  window.localStorage.setItem("careprior_staff_user_id", userId);
  window.localStorage.setItem("careprior_staff_full_name", fullName);
}

export function clearSession() {
  ["careprior_staff_access_token", "careprior_staff_refresh_token", "careprior_staff_role", "careprior_staff_user_id", "careprior_staff_full_name"].forEach(
    (key) => window.localStorage.removeItem(key)
  );
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return apiFetch<{
    access_token: string;
    refresh_token: string;
    role: string;
    user_id: string;
    full_name: string;
  }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
