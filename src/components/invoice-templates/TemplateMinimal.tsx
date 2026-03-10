import type { InvoiceTemplateProps } from "./types";
import { formatCurrency, formatDateFR, formatDateShort, typeLabels, paymentMethodLabels } from "./types";

/**
 * Template Minimal — Clean, airy invoice with warm background tint,
 * 3-column info header, simple table, and accent-colored amount due.
 */
export function TemplateMinimal({ invoice, settings, currency }: InvoiceTemplateProps) {
  const fmt = (n?: number) => formatCurrency(n, currency);
  const typeLabel = typeLabels[invoice.type] || "FACTURE";
  const accent = settings.accentColor || "#7c5dfa";
  const hasExchange = invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0;
  const isBL = invoice.type === "bon_livraison";

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 11, color: "#333", background: "#fff", width: "100%", display: "flex", flexDirection: "column", minHeight: "297mm" }}>
      <div style={{ padding: "40px 50px 30px" }}>

        {/* ── Header: Title + Logo ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", letterSpacing: -1 }}>{typeLabel}</div>
            <div style={{ fontSize: 12, color: accent, fontWeight: 500, marginTop: 2 }}>#{invoice.number}</div>
          </div>
          {settings.businessLogo ? (
            <img src={settings.businessLogo} alt="Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 55, height: 55, background: "#1a1a1a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 26 }}>
              {(settings.businessName || "M").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* ── Separator ── */}
        <div style={{ borderBottom: "1px solid #e0d8d2", marginBottom: 20 }} />

        {/* ── Info Grid: 3 columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 20, border: "1px solid #e0d8d2", borderRadius: 6, overflow: "hidden" }}>
          {/* Dates */}
          <div style={{ padding: "18px 20px", borderRight: "1px solid #e0d8d2" }}>
            <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Émis le</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 14 }}>{formatDateFR(invoice.date)}</div>
            {invoice.dueDate && (
              <>
                <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Échéance</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{formatDateFR(invoice.dueDate)}</div>
              </>
            )}
            {isBL && invoice.invoiceNumber && (
              <>
                <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 14 }}>Réf. facture</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{invoice.invoiceNumber}</div>
              </>
            )}
          </div>

          {/* Billed to / Delivered to */}
          <div style={{ padding: "18px 20px", borderRight: "1px solid #e0d8d2" }}>
            <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{isBL ? "Livré à" : "Facturé à"}</div>
            {invoice.client ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>{invoice.client.name}</div>
                {invoice.client.address && <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{invoice.client.address}</div>}
                {invoice.client.phone && <div style={{ fontSize: 10, color: "#666" }}>{invoice.client.phone}</div>}
              </>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                {invoice.type === "vente_flash" ? "Client Comptoir" : "Client Comptant"}
              </div>
            )}
            {isBL && invoice.deliveryAddress && (
              <div style={{ fontSize: 10, color: "#666", marginTop: 8 }}>Adresse: {invoice.deliveryAddress}</div>
            )}
          </div>

          {/* From */}
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>De</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>{settings.businessName || "Mon Entreprise"}</div>
            {settings.businessAddress && <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{settings.businessAddress}</div>}
            {settings.businessPhone && <div style={{ fontSize: 10, color: "#666" }}>{settings.businessPhone}</div>}
          </div>
        </div>

        {/* ── Separator ── */}
        <div style={{ borderBottom: "1px solid #e0d8d2", marginBottom: 20 }} />

        {/* ── Exchange items ── */}
        {hasExchange && (
          <div style={{ marginBottom: 20, padding: 15, background: "#fff", border: "1px solid #e0d8d2", borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 12 }}>Produits échangés (reprise)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#888", fontSize: 10, borderBottom: "1px solid #e0d8d2" }}>Produit</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#888", fontSize: 10, borderBottom: "1px solid #e0d8d2" }}>Variante</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: "#888", fontSize: 10, borderBottom: "1px solid #e0d8d2", width: 60 }}>Qté</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#888", fontSize: 10, borderBottom: "1px solid #e0d8d2", width: 100 }}>Prix reprise</th>
                </tr>
              </thead>
              <tbody>
                {invoice.exchangeItems!.map((ei) => (
                  <tr key={ei._id}>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "#1a1a1a" }}>{ei.description}</td>
                    <td style={{ padding: "10px 10px", color: "#666", fontSize: 10 }}>{ei.variantLabel || "—"}</td>
                    <td style={{ padding: "10px 10px", textAlign: "center" }}>{ei.quantity}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>{fmt(ei.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Items Table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 25 }}>
          <thead>
            <tr>
              <th style={{ width: isBL ? "55%" : "45%", padding: "12px 10px", textAlign: "left", fontWeight: 600, color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e0d8d2" }}>Article</th>
              <th style={{ width: isBL ? "22%" : "12%", padding: "12px 10px", textAlign: "center", fontWeight: 600, color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e0d8d2" }}>Quantité</th>
              {isBL ? (
                <th style={{ width: "23%", padding: "12px 10px", textAlign: "center", fontWeight: 600, color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e0d8d2" }}>Livré</th>
              ) : (
                <>
                  <th style={{ width: "18%", padding: "12px 10px", textAlign: "right", fontWeight: 600, color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e0d8d2" }}>Prix unit.</th>
                  <th style={{ width: "25%", padding: "12px 10px", textAlign: "right", fontWeight: 600, color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e0d8d2" }}>Total ligne</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) =>
              item.type === "section" ? (
                <tr key={item._id} style={{ breakInside: "avoid" as const }}>
                  <td colSpan={isBL ? 3 : 4} style={{ padding: "14px 10px 8px", fontWeight: 700, fontSize: 11, color: "#1a1a1a", textTransform: "uppercase", borderBottom: "1px solid #e0d8d2" }}>
                    {item.description || "Section"}
                  </td>
                </tr>
              ) : (
                <tr key={item._id} style={{ breakInside: "avoid" as const }}>
                  <td style={{ padding: "14px 10px", verticalAlign: "top", borderBottom: "1px solid #f0e8e4" }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>
                      {item.productId
                        ? [item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")
                        : item.description || "Service"}
                    </div>
                    {item.variantId && (
                      <div style={{ fontSize: 10, color: "#888" }}>{item.variantId}</div>
                    )}
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center", borderBottom: "1px solid #f0e8e4", color: "#555" }}>{item.quantity}</td>
                  {isBL ? (
                    <td style={{ padding: "14px 10px", textAlign: "center", borderBottom: "1px solid #f0e8e4", fontWeight: 600, color: "#1a1a1a" }}>{item.delivered ?? 0}</td>
                  ) : (
                    <>
                      <td style={{ padding: "14px 10px", textAlign: "right", borderBottom: "1px solid #f0e8e4", color: "#555" }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "14px 10px", textAlign: "right", borderBottom: "1px solid #f0e8e4", fontWeight: 600, color: "#1a1a1a" }}>
                        {fmt(item.total)}
                        {(item.discountAmount || 0) > 0 && (
                          <div style={{ fontSize: 9, color: "#c0392b", fontWeight: 500, marginTop: 2 }}>
                            -{fmt(item.discountAmount)}{item.discountReason ? ` (${item.discountReason})` : ""}
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* ── Totals ── */}
        {!isBL && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 25 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 12, borderBottom: "1px solid #e0d8d2" }}>
                <span style={{ fontWeight: 600, color: "#555" }}>Sous-total</span>
                <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{fmt(invoice.subtotal)}</span>
              </div>
              {(invoice.discountAmount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 12, borderBottom: "1px solid #e0d8d2" }}>
                  <span style={{ fontWeight: 600, color: "#c0392b" }}>Reduction{invoice.discountReason ? ` (${invoice.discountReason})` : ""}</span>
                  <span style={{ fontWeight: 600, color: "#c0392b" }}>-{fmt(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.showTax && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 12, borderBottom: "1px solid #e0d8d2" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>TVA ({invoice.taxRate}%)</span>
                  <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{fmt(invoice.taxAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13, borderBottom: `2px solid ${accent}` }}>
                <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Total</span>
                <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{fmt(invoice.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 13, borderBottom: `2px solid ${accent}` }}>
                <span style={{ fontWeight: 700, color: accent }}>Montant dû</span>
                <span style={{ fontWeight: 700, color: accent }}>{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Warranty ── */}
        {!isBL && invoice.warranty?.enabled && (
          <div style={{ marginBottom: 15, padding: "14px 18px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>Garantie</div>
            {invoice.warranty.duration && <div style={{ fontSize: 10, color: "#555" }}>Durée: {invoice.warranty.duration}</div>}
            {invoice.warranty.description && <div style={{ fontSize: 10, color: "#888", marginTop: 4, lineHeight: 1.6 }}>{invoice.warranty.description}</div>}
          </div>
        )}

        {/* ── Notes ── */}
        {invoice.notes && (
          <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>{isBL ? "Notes" : "Termes & Conditions"}</div>
            <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          </div>
        )}

        {/* ── Signature ── */}
        {isBL ? (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25, marginTop: 80 }}>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #ccc", height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#888" }}>Signature expéditeur</div>
            </div>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #ccc", height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#888" }}>Signature destinataire</div>
            </div>
          </div>
        ) : invoice.signature ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 25 }}>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #ccc", height: 50, marginBottom: 8, position: "relative" }}>
                <img src={invoice.signature} alt="Signature" style={{ maxHeight: 45, maxWidth: 150, position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)" }} />
              </div>
              <div style={{ fontSize: 10, color: "#888" }}>Signature & Cachet</div>
            </div>
          </div>
        ) : null}

        {/* ── Thank you ── */}
        <div style={{ paddingTop: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{isBL ? "Bon de livraison" : "Merci pour votre confiance !"}</div>
          {!isBL && invoice.payment?.enabled && (
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
              <span>Paiement: {paymentMethodLabels[invoice.payment.method] || invoice.payment.method} — {invoice.status.replace("_", " ")}</span>
              <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px" }}>
                <span style={{ color: "#888" }}>Versé:</span>
                <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{fmt(invoice.payment.amount)}</span>
                {invoice.payment.amount < invoice.total && (
                  <>
                    <span style={{ color: "#888" }}>Reste à payer:</span>
                    <span style={{ fontWeight: 600, color: "#c0392b" }}>{fmt(invoice.total - invoice.payment.amount)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Footer — pushed to bottom of last page via flex parent in print CSS ── */}
      <div style={{ padding: "18px 50px", background: "#1a1a1a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, marginTop: "auto" }}>
        <span style={{ fontWeight: 600 }}>
          {settings.businessName || ""}
          {settings.businessAddress ? `, ${settings.businessAddress}` : ""}
        </span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {settings.businessPhone && <span>{settings.businessPhone}</span>}
          {settings.businessEmail && (
            <>
              <span style={{ color: "#666" }}>|</span>
              <span>{settings.businessEmail}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
