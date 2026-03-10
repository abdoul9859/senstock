import { Platform } from "react-native";

const TOKEN_KEY = "mbayestock_token";

// ── Platform-aware API base ──
function getApiBase(): string {
  // Web → always use same hostname as the page (works on local network & production)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    // Production domain → use production API
    if (host === "app.stockflow.app") return "https://api.stockflow.app";
    // Local/network → use same host with API port
    return `http://${host}:5000`;
  }
  if (!__DEV__) return "https://api.stockflow.app";
  // Android emulator → host via 10.0.2.2
  if (Platform.OS === "android") return "http://10.0.2.2:5000";
  // iOS simulator → localhost works
  return "http://localhost:5000";
}

const API_BASE = getApiBase();

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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401 && _onUnauthorized) {
    _onUnauthorized();
  }

  return res;
}

export { API_BASE };
