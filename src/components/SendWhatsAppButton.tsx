import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SendWhatsAppButtonProps {
  type: "invoice" | "quote" | "delivery-note" | "debt-reminder";
  id: string;
  clientPhone?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "default" | "sm" | "icon";
}

const TYPE_ENDPOINTS: Record<string, string> = {
  invoice: "send-invoice",
  quote: "send-quote",
  "delivery-note": "send-delivery-note",
  "debt-reminder": "send-debt-reminder",
};

const TYPE_LABELS: Record<string, string> = {
  invoice: "Envoyer la facture",
  quote: "Envoyer le devis",
  "delivery-note": "Notifier la livraison",
  "debt-reminder": "Envoyer une relance",
};

export function SendWhatsAppButton({
  type,
  id,
  clientPhone,
  label,
  variant = "outline",
  size = "default",
}: SendWhatsAppButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSend() {
    if (!clientPhone) {
      toast({
        title: "Numero manquant",
        description: "Le client n'a pas de numero de telephone.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = TYPE_ENDPOINTS[type];
      const res = await fetch(`/api/whatsapp/${endpoint}/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      toast({
        title: "Envoye !",
        description: data.message || "Message WhatsApp envoye avec succes.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur WhatsApp",
        description: err.message || "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = label || TYPE_LABELS[type] || "WhatsApp";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSend}
      disabled={loading}
      className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {size !== "icon" && buttonLabel}
    </Button>
  );
}
