import type { InvoiceTemplateProps } from "./types";
import { formatCurrency, formatDateFR, typeLabels, paymentMethodLabels } from "./types";

/**
 * Template Classique — Gold accent, professional design from the original GapsApp.
 * Clean layout with gold borders, grouped items, warranty support.
 */
export function TemplateClassique({ invoice, settings, currency }: InvoiceTemplateProps) {
  const fmt = (n?: number) => formatCurrency(n, currency);
  const typeLabel = typeLabels[invoice.type] || "FACTURE";
  const accent = "#D4AF37"; // Gold accent — signature of this template
  const hasExchange = invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0;
  const remaining = Math.max(0, (invoice.total || 0) - (invoice.payment?.amount || 0));
  const hasWarranty = invoice.warranty?.enabled;

  // Group items by section
  const groups: { title: string | null; items: typeof invoice.items; subtotal: number }[] = [];
  let currentGroup: typeof groups[0] | null = null;
  for (const item of invoice.items) {
    if (item.type === "section") {
      currentGroup = { title: item.description, items: [], subtotal: 0 };
      groups.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = { title: null, items: [], subtotal: 0 };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
      currentGroup.subtotal += item.total || 0;
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#000", background: "#fff", width: "100%", fontSize: 9, lineHeight: 1.5, display: "flex", flexDirection: "column", minHeight: "297mm" }}>

      {/* ── Gold top border ── */}
      <div style={{ height: 4, background: accent }} />

      {/* ── Header ── */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {settings.businessLogo && (
            <img src={settings.businessLogo} alt="Logo" style={{ maxWidth: 80, maxHeight: 80, objectFit: "contain" }} />
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
              {settings.businessName || "Votre Entreprise"}
            </div>
            {settings.businessPhone && <div style={{ fontSize: 8, color: "#666" }}>{settings.businessPhone}</div>}
            {settings.businessEmail && <div style={{ fontSize: 8, color: "#666" }}>{settings.businessEmail}</div>}
            {settings.businessAddress && <div style={{ fontSize: 8, color: "#666" }}>{settings.businessAddress}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#333", letterSpacing: 2 }}>{typeLabel}</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>#{invoice.number}</div>
          <div style={{ fontSize: 8, color: "#666", marginTop: 4 }}>
            Date: {formatDateFR(invoice.date)}
          </div>
          {invoice.dueDate && (
            <div style={{ fontSize: 8, color: "#666" }}>
              Échéance: {formatDateFR(invoice.dueDate)}
            </div>
          )}
        </div>
      </div>

      {/* ── Client & Payment info ── */}
      <div style={{ padding: "0 40px 16px", display: "flex", gap: 24 }}>
        <div style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e5e5", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 7, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Facturé à</div>
          {invoice.client ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 11 }}>{invoice.client.name}</div>
              {invoice.client.phone && <div style={{ fontSize: 8, color: "#666" }}>{invoice.client.phone}</div>}
              {invoice.client.email && <div style={{ fontSize: 8, color: "#666" }}>{invoice.client.email}</div>}
              {invoice.client.address && <div style={{ fontSize: 8, color: "#666" }}>{invoice.client.address}</div>}
            </>
          ) : (
            <div style={{ color: "#999", fontSize: 9 }}>Client comptoir</div>
          )}
        </div>
        {invoice.payment?.enabled && (
          <div style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e5e5", borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 7, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Paiement</div>
            <div style={{ fontSize: 9 }}>
              <strong>Mode:</strong> {paymentMethodLabels[invoice.payment.method] || invoice.payment.method}
            </div>
            <div style={{ fontSize: 9 }}>
              <strong>Payé:</strong> {fmt(invoice.payment.amount)}
            </div>
            {remaining > 0 && (
              <div style={{ fontSize: 9, color: "#dc2626" }}>
                <strong>Reste:</strong> {fmt(remaining)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Items table ── */}
      <div style={{ padding: "0 40px", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr style={{ background: "#1a1a1a", color: "#fff" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 8 }}>ARTICLE</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, fontSize: 8, width: 60 }}>QTÉ</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 8, width: 90 }}>PRIX UNIT.</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 8, width: 90 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <>
                {group.title && (
                  <tr key={`section-${gi}`}>
                    <td colSpan={4} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 10, background: "#f3f4f6", borderBottom: `2px solid ${accent}` }}>
                      {group.title}
                    </td>
                  </tr>
                )}
                {group.items.map((item, ii) => (
                  <tr key={`item-${gi}-${ii}`} style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "7px 10px" }}>{item.description}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(item.total)}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>

        {/* Exchange items */}
        {hasExchange && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, color: accent }}>Produits repris en échange</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
              <thead>
                <tr style={{ background: "#fef3c7" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 8 }}>DESCRIPTION</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 8, width: 90 }}>VALEUR</th>
                </tr>
              </thead>
              <tbody>
                {invoice.exchangeItems?.map((ex, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "6px 10px" }}>{ex.description}{ex.variantLabel ? ` (${ex.variantLabel})` : ""}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(ex.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Totals ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 9 }}>
              <span>Sous-total</span>
              <span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.showTax && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 9, color: "#666" }}>
                <span>TVA ({invoice.taxRate}%)</span>
                <span>{fmt(invoice.taxAmount)}</span>
              </div>
            )}
            {(invoice.discountAmount || 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 9, color: "#dc2626" }}>
                <span>Remise</span>
                <span>-{fmt(invoice.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, fontWeight: 700, borderTop: `2px solid ${accent}`, marginTop: 4 }}>
              <span>Total</span>
              <span style={{ color: accent }}>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Warranty ── */}
      {hasWarranty && (
        <div style={{ margin: "16px 40px", padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 4 }}>
            Garantie — {invoice.warranty?.duration}
          </div>
          {invoice.warranty?.description && (
            <div style={{ fontSize: 8, color: "#166534" }}>{invoice.warranty.description}</div>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ margin: "8px 40px", padding: 10, background: "#f9fafb", border: "1px solid #e5e5e5", borderRadius: 4 }}>
          <div style={{ fontSize: 7, fontWeight: 600, color: "#999", marginBottom: 4 }}>NOTES</div>
          <div style={{ fontSize: 8, color: "#666", whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
        </div>
      )}

      {/* ── Signature ── */}
      {invoice.signature && (
        <div style={{ margin: "8px 40px", textAlign: "right" }}>
          <div style={{ fontSize: 7, color: "#999", marginBottom: 4 }}>Signature client</div>
          <img src={invoice.signature} alt="Signature" style={{ maxHeight: 60 }} />
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ marginTop: "auto", borderTop: `2px solid ${accent}`, padding: "10px 40px", display: "flex", justifyContent: "space-between", fontSize: 7, color: "#999" }}>
        <span>{settings.businessName}</span>
        <span>{settings.businessPhone} | {settings.businessEmail}</span>
        <span>{settings.businessAddress}</span>
      </div>
    </div>
  );
}
