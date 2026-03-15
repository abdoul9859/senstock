import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { apiFetch, getToken } from "../config/api";

export interface DraftSession {
  id: string;
  type: string;
  data: Record<string, unknown>;
  device: string;
  deviceName: string;
  userId: string;
  updatedAt: string;
}

interface UseDraftSyncOptions {
  type: string;
  enabled?: boolean;
  debounceMs?: number;
  /** Called automatically when the other device's draft is updated (for live sync) */
  onRemoteUpdate?: (data: Record<string, unknown>) => void;
}

export function useDraftSync({ type, enabled = true, debounceMs = 3000, onRemoteUpdate }: UseDraftSyncOptions) {
  const [otherDrafts, setOtherDrafts] = useState<DraftSession[]>([]);
  const [myDraft, setMyDraft] = useState<DraftSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string>("");
  const lastOtherUpdatedAt = useRef<string>("");
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userIdRef.current = payload.id || "";
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Poll for drafts every 5s
  useEffect(() => {
    if (!enabled) return;

    async function checkDrafts() {
      try {
        const res = await apiFetch(`/api/drafts/${type}`);
        if (res.ok) {
          const drafts: DraftSession[] = await res.json();
          const myDevice = "mobile";
          const mine = drafts.find((d) => d.userId === userIdRef.current && d.device === myDevice);
          const others = drafts.filter((d) => !(d.userId === userIdRef.current && d.device === myDevice));
          setMyDraft(mine || null);
          setOtherDrafts(others);

          // Auto-sync: if the other device's draft has been updated, call onRemoteUpdate
          if (others.length > 0 && onRemoteUpdateRef.current) {
            const newest = others[0];
            if (newest.updatedAt !== lastOtherUpdatedAt.current && lastOtherUpdatedAt.current !== "") {
              onRemoteUpdateRef.current(newest.data as Record<string, unknown>);
            }
            lastOtherUpdatedAt.current = newest.updatedAt;
          }
        }
      } catch { /* silent */ }
    }

    checkDrafts();
    const interval = setInterval(checkDrafts, 1000);
    return () => clearInterval(interval);
  }, [type, enabled]);

  // Save full form state (debounced)
  const saveDraft = useCallback(
    (data: Record<string, unknown>) => {
      if (!enabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await apiFetch(`/api/drafts/${type}`, {
            method: "PUT",
            body: JSON.stringify({
              data,
              device: "mobile",
              deviceName: Platform.OS === "ios" ? "iPhone" : "Android",
            }),
          });
        } catch { /* silent */ }
      }, debounceMs);
    },
    [type, enabled, debounceMs]
  );

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      await apiFetch(`/api/drafts/${type}`, { method: "DELETE" });
    } catch { /* silent */ }
    setMyDraft(null);
  }, [type]);

  // Load other device's draft data (for initial "Reprendre")
  const loadOtherDraft = useCallback((): Record<string, unknown> | null => {
    if (otherDrafts.length === 0) return null;
    lastOtherUpdatedAt.current = otherDrafts[0].updatedAt;
    return otherDrafts[0].data as Record<string, unknown>;
  }, [otherDrafts]);

  return { otherDrafts, myDraft, saveDraft, clearDraft, loadOtherDraft };
}
