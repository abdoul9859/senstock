import { Platform } from "react-native";

const TOKEN_KEY = "senstock_token";

// ── Platform-aware API base ──
function getApiBase(): string {
  // Web → always use same hostname as the page (works on local network & production)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    // Production domain → use production API
    if (host === "app.senstock.app") return "https://api.senstock.app";
    // Local/network → use same host with API port
    return `http://${host}:5000`;
  }
  if (!__DEV__) return "https://api.senstock.app";
  // Dev: try direct LAN first (faster, no tunnel instability)
  return "http://192.168.1.9:5000";
}

const API_BASE = getApiBase();
console.log("[API] Base URL:", API_BASE, "Platform:", Platform.OS);

// ── Token helpers (web-safe: fallback to localStorage) ──

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(TOKEN_KEY);
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // silent
  }
}

export async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // silent
  }
}

// ── Global logout callback (set by AuthContext) ──

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

// ── Centralised fetch wrapper ──

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getToken();

  const url = `${API_BASE}${path}`;
  console.log("[API] Fetching:", url);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string>),
      },
    });

    console.log("[API] Response:", res.status, path);

    // Don't trigger logout on auth routes — let the caller handle the error
    if (res.status === 401 && _onUnauthorized && !path.startsWith("/api/auth/")) {
      _onUnauthorized();
    }

    return res;
  } catch (err) {
    console.error("[API] Fetch error:", url, err);
    throw err;
  }
}

export { API_BASE };
