import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Wifi, WifiOff, QrCode, RefreshCw, LogOut,
  Check, AlertCircle, Loader2, ArrowLeft, Send, FileText,
  Receipt, Bell, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

interface WaStatus {
  enabled: boolean;
  connected: boolean;
  state?: string;
  phoneNumber?: string;
  profileName?: string;
  error?: string;
}

interface WaMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  documentType: string;
  documentNumber: string;
  status: string;
  createdAt: string;
  message: string;
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  invoice: { label: "Facture", icon: FileText, color: "text-blue-500" },
  quote: { label: "Devis", icon: Receipt, color: "text-emerald-500" },
  delivery_note: { label: "Livraison", icon: Send, color: "text-purple-500" },
  debt_reminder: { label: "Rappel dette", icon: Bell, color: "text-amber-500" },
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-500/15 text-blue-600",
  delivered: "bg-emerald-500/15 text-emerald-600",
  read: "bg-green-500/15 text-green-600",
  failed: "bg-red-500/15 text-red-600",
};

export default function WhatsAppSettingsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<WaStatus>({ enabled: false, connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ──
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        // If connected and we were showing QR, clear it
        if (data.connected && qrCode) {
          setQrCode(null);
          setConnecting(false);
          toast.success("WhatsApp connecte !");
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [qrCode]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch("/api/whatsapp/messages?limit=20", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : data.messages || []);
      }
    } catch { /* silent */ }
    finally { setMessagesLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
  }, [fetchStatus, fetchMessages]);

  // ── Poll QR code + status when connecting ──
  useEffect(() => {
    if (connecting && !status.connected) {
      pollRef.current = setInterval(async () => {
        try {
          const qrRes = await fetch("/api/whatsapp/qr", { headers: getHeaders() });
          if (qrRes.ok) {
            const data = await qrRes.json();
            if (data.qr) setQrCode(data.qr);
            if (data.status === "connected") {
              setStatus((s) => ({ ...s, connected: true }));
              setConnecting(false);
              setQrCode(null);
              toast.success("WhatsApp connecte !");
            }
          }
        } catch { /* silent */ }
        fetchStatus();
      }, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [connecting, status.connected, fetchStatus]);

  // ── Connect ──
  async function handleConnect() {
    setConnecting(true);
    setQrCode(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST", headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de connexion");
        setConnecting(false);
      }
      // QR will arrive via polling /api/whatsapp/qr
    } catch {
      toast.error("Impossible de contacter le serveur");
      setConnecting(false);
    }
  }

  // ── Disconnect ──
  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        setStatus((s) => ({ ...s, connected: false }));
        setQrCode(null);
        toast.success("WhatsApp deconnecte");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur de deconnexion");
      }
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setDisconnecting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Connectez votre WhatsApp pour envoyer factures, devis et rappels
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Connection Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {status.connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              Statut de connexion
            </CardTitle>
            <CardDescription>
              {status.connected
                ? "WhatsApp est connecte et pret a envoyer"
                : "Scannez le QR code pour connecter WhatsApp"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status.connected ? (
              /* Connected state */
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600">Connecte</p>
                    {status.profileName && (
                      <p className="text-sm text-muted-foreground">{status.profileName}</p>
                    )}
                    {status.phoneNumber && (
                      <p className="text-xs text-muted-foreground">{status.phoneNumber}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchStatus}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-1" />
                    )}
                    Deconnecter
                  </Button>
                </div>
              </div>
            ) : (
              /* Disconnected state */
              <div className="space-y-4">
                {qrCode ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div className="rounded-xl border-2 border-dashed border-green-500/30 bg-white p-4">
                        <img
                          src={typeof qrCode === "string" && qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                          alt="QR Code WhatsApp"
                          className="h-64 w-64"
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">Scannez ce QR code avec WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        Ouvrez WhatsApp → Menu → Appareils connectes → Connecter un appareil
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      En attente de connexion...
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleConnect}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Regenerer le QR code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
                      <QrCode className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        WhatsApp n'est pas connecte
                      </p>
                      <Button onClick={handleConnect} disabled={connecting}>
                        {connecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4 mr-1" />
                        )}
                        Connecter WhatsApp
                      </Button>
                    </div>
                  </div>
                )}

                {status.error && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {status.error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Usage Info Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Fonctionnalites
            </CardTitle>
            <CardDescription>
              Ce que vous pouvez faire avec WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", title: "Envoyer des factures", desc: "PDF de la facture + resume au client" },
              { icon: Receipt, color: "text-emerald-500", bg: "bg-emerald-500/10", title: "Envoyer des devis", desc: "PDF du devis + details au client" },
              { icon: Bell, color: "text-amber-500", bg: "bg-amber-500/10", title: "Rappels de dette", desc: "Notification de paiement en attente" },
              { icon: Send, color: "text-purple-500", bg: "bg-purple-500/10", title: "Notifications de livraison", desc: "Confirmation de livraison au client" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-md border border-border p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${f.bg}`}>
                  <f.icon className={`h-4 w-4 ${f.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Utilisez le bouton <span className="font-medium text-green-600">WhatsApp</span> depuis les pages de detail des factures, devis et creances.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Message History ── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Historique des envois
              </CardTitle>
              <CardDescription>Derniers messages envoyes via WhatsApp</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMessages} disabled={messagesLoading}>
              {messagesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">Aucun message envoye</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const docInfo = DOC_TYPE_LABELS[msg.documentType] || { label: msg.documentType, icon: FileText, color: "text-muted-foreground" };
                const DocIcon = docInfo.icon;
                return (
                  <div key={msg.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                    <DocIcon className={`h-4 w-4 shrink-0 ${docInfo.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{msg.recipientName || msg.recipientPhone}</span>
                        {msg.documentNumber && (
                          <span className="text-xs text-muted-foreground">#{msg.documentNumber}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{docInfo.label} · {formatDate(msg.createdAt)}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[msg.status] || ""}`}>
                      {msg.status === "sent" ? "Envoye" : msg.status === "delivered" ? "Recu" : msg.status === "read" ? "Lu" : msg.status === "failed" ? "Echec" : msg.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
