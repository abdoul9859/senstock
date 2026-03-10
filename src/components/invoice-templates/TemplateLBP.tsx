import type { InvoiceTemplateProps } from "./types";
import { formatCurrency, formatDateFR, formatDateShort, typeLabels, paymentMethodLabels } from "./types";

/**
 * Template LBP — Professional invoice inspired by LOUCAR BUSINESS PRO.
 * Clean layout with header logo, client/payment sections, product table, footer.
 */
export function TemplateLBP({ invoice, settings, currency }: InvoiceTemplateProps) {
  const fmt = (n?: number) => formatCurrency(n, currency);
  const typeLabel = typeLabels[invoice.type] || "FACTURE";
  const accent = settings.accentColor || "#0070c0";
  const hasExchange = invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0;
  const isBL = invoice.type === "bon_livraison";

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", color: "#333", background: "#fff", width: "100%", fontSize: 11, lineHeight: 1.5, display: "flex", flexDirection: "column", minHeight: "297mm" }}>

      {/* ── Header ── */}
      <div style={{ padding: "12px 40px 20px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Logo + Company info */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {settings.businessLogo ? (
            <div style={{ width: 150, marginRight: 25, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={settings.businessLogo} alt="Logo" style={{ maxWidth: 150, maxHeight: 150, objectFit: "contain" }} />
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#2c3e50", letterSpacing: -0.5 }}>
              {settings.businessName || "Votre Entreprise"}
            </div>
            {settings.businessAddress && (
              <div style={{ fontSize: 12, color: "#7f8c8d", lineHeight: 1.5, marginTop: 4 }}>{settings.businessAddress}</div>
            )}
            <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 2 }}>
              {[settings.businessPhone, settings.businessEmail].filter(Boolean).join("  |  ")}
            </div>
            {settings.businessNinea && (
              <div style={{ fontSize: 11, color: "#7f8c8d", marginTop: 2 }}>NINEA: {settings.businessNinea}</div>
            )}
          </div>
        </div>

        {/* Invoice type + number + date */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 300, color: "#7f8c8d", letterSpacing: -1 }}>
            {typeLabel}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#2c3e50", marginTop: 4 }}>
            #{invoice.number}
          </div>
          <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 10 }}>
            Date: {formatDateShort(invoice.date)}
          </div>
          {invoice.dueDate && (
            <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 2 }}>
              Echéance: {formatDateShort(invoice.dueDate)}
            </div>
          )}
          {isBL && invoice.invoiceNumber && (
            <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 2 }}>
              Facture: {invoice.invoiceNumber}
            </div>
          )}
        </div>
      </div>

      <div>
        {/* ── Billing Info (Client + Payment/Delivery) ── */}
        <div style={{ display: "flex", padding: "20px 30px", gap: 30, borderBottom: "1px solid #ecf0f1", margin: "0 25px" }}>
          {/* Client */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#7f8c8d", letterSpacing: 1, marginBottom: 12, borderBottom: `2px solid ${accent}`, paddingBottom: 8, display: "inline-block" }}>
              {isBL ? "Livré à" : "Facturé à"}
            </div>
            <div style={{ paddingLeft: 10 }}>
              {invoice.client ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#2c3e50", marginBottom: 5 }}>{invoice.client.name}</div>
                  {invoice.client.phone && <div style={{ fontSize: 13, color: "#2c3e50", marginBottom: 3 }}>{invoice.client.phone}</div>}
                  {invoice.client.email && <div style={{ fontSize: 13, color: "#2c3e50", marginBottom: 3 }}>{invoice.client.email}</div>}
                  {invoice.client.address && <div style={{ fontSize: 13, color: "#2c3e50" }}>{invoice.client.address}</div>}
                </>
              ) : (
                <div style={{ color: "#9ca3af", fontStyle: "italic" }}>
                  {invoice.type === "vente_flash" ? "Vente flash — client comptoir" : "Client occasionnel"}
                </div>
              )}
              {isBL && invoice.deliveryAddress && (
                <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 8 }}>Adresse livraison: {invoice.deliveryAddress}</div>
              )}
            </div>
          </div>

          {/* Payment method / Delivery info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#7f8c8d", letterSpacing: 1, marginBottom: 12, borderBottom: `2px solid ${accent}`, paddingBottom: 8, display: "inline-block" }}>
              {isBL ? "Livraison" : "Méthode de paiement"}
            </div>
            {isBL ? (
              <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 6, border: "1px solid #ecf0f1" }}>
                <div style={{ fontSize: 14, color: "#2c3e50", fontWeight: 600 }}>Bon de livraison</div>
                {invoice.invoiceNumber && (
                  <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 6 }}>Réf. facture: {invoice.invoiceNumber}</div>
                )}
              </div>
            ) : invoice.payment?.enabled ? (
              <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 6, border: "1px solid #ecf0f1" }}>
                <div style={{ fontSize: 11, color: "#7f8c8d", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Paiement par:</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#2c3e50" }}>
                  {paymentMethodLabels[invoice.payment.method] || invoice.payment.method}
                </div>
                {invoice.payment.date && (
                  <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 6 }}>Le {formatDateFR(invoice.payment.date)}</div>
                )}
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 11 }}>
                  <span style={{ color: "#7f8c8d" }}>Versé:</span>
                  <span style={{ fontWeight: 600, color: "#2c3e50" }}>{fmt(invoice.payment.amount)}</span>
                  {invoice.payment.amount < invoice.total && (
                    <>
                      <span style={{ color: "#7f8c8d" }}>Reste à payer:</span>
                      <span style={{ fontWeight: 600, color: "#c0392b" }}>{fmt(invoice.total - invoice.payment.amount)}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 6, border: "1px solid #ecf0f1" }}>
                <div style={{ fontSize: 14, color: "#7f8c8d" }}>En attente</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Exchange items ── */}
        {hasExchange && (
          <div style={{ margin: "20px 40px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: accent, marginBottom: 10, borderBottom: `2px solid ${accent}`, paddingBottom: 5, display: "inline-block" }}>
              Produits échangés (reçus du client)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#e6f2ff" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: accent, fontSize: 11, borderBottom: `2px solid ${accent}` }}>Produit</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: accent, fontSize: 11, borderBottom: `2px solid ${accent}` }}>Variante</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, color: accent, fontSize: 11, borderBottom: `2px solid ${accent}` }}>Prix</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: accent, fontSize: 11, borderBottom: `2px solid ${accent}` }}>Qté</th>
                </tr>
              </thead>
              <tbody>
                {invoice.exchangeItems!.map((ei) => (
                  <tr key={ei._id} style={{ borderBottom: "1px solid #e0f2fe" }}>
                    <td style={{ padding: "9px 14px" }}>{ei.description}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "'Courier New', monospace", fontSize: 10, color: "#6b7280" }}>{ei.variantLabel || "—"}</td>
                    <td style={{ padding: "9px 14px", textAlign: "right" }}>{fmt(ei.price)}</td>
                    <td style={{ padding: "9px 14px", textAlign: "center" }}>{ei.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Products Table ── */}
        <table style={{ width: "calc(100% - 80px)", borderCollapse: "collapse", margin: "20px 40px 0", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8f9fa", fontWeight: 600, color: "#333", textTransform: "uppercase" as const }}>
              <th style={{ padding: "15px 20px", textAlign: "left", border: "1px solid #ddd", borderBottom: "2px solid #333", width: isBL ? "50%" : "40%" }}>ARTICLE</th>
              <th style={{ padding: "15px 20px", textAlign: "center", border: "1px solid #ddd", borderBottom: "2px solid #333", borderLeft: "none", width: isBL ? "25%" : "20%" }}>QUANTITÉ</th>
              {isBL ? (
                <th style={{ padding: "15px 20px", textAlign: "center", border: "1px solid #ddd", borderBottom: "2px solid #333", borderLeft: "none", width: "25%" }}>LIVRÉ</th>
              ) : (
                <>
                  <th style={{ padding: "15px 20px", textAlign: "right", border: "1px solid #ddd", borderBottom: "2px solid #333", borderLeft: "none", width: "20%" }}>PRIX</th>
                  <th style={{ padding: "15px 20px", textAlign: "right", border: "1px solid #ddd", borderBottom: "2px solid #333", borderLeft: "none", width: "20%" }}>TOTAL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) =>
              item.type === "section" ? (
                <tr key={item._id} style={{ breakInside: "avoid" as const }}>
                  <td colSpan={isBL ? 3 : 4} style={{ padding: "12px 20px", borderBottom: "1px solid #e5e5e5", background: "#f3f4f6", fontWeight: 700, fontSize: 11, color: "#2c3e50", borderLeft: `3px solid ${accent}` }}>
                    {item.description || "Section"}
                  </td>
                </tr>
              ) : (
                <tr key={item._id} style={{ breakInside: "avoid" as const }}>
                  <td style={{ padding: "15px 20px", verticalAlign: "top", borderBottom: "1px solid #e5e5e5", fontWeight: 500, fontSize: 13, color: "#2c3e50" }}>
                    <div>
                      {item.productId
                        ? [item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")
                        : item.description || "Service"}
                    </div>
                    {item.variantId && (
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: accent, fontWeight: 600, marginTop: 3 }}>
                        IMEI: {item.variantId}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "15px 20px", textAlign: "center", verticalAlign: "top", borderBottom: "1px solid #e5e5e5", fontSize: 13, fontWeight: 500, color: "#7f8c8d" }}>{item.quantity}</td>
                  {isBL ? (
                    <td style={{ padding: "15px 20px", textAlign: "center", verticalAlign: "top", borderBottom: "1px solid #e5e5e5", fontSize: 13, fontWeight: 700, color: "#2c3e50" }}>{item.delivered ?? 0}</td>
                  ) : (
                    <>
                      <td style={{ padding: "15px 20px", textAlign: "right", verticalAlign: "top", borderBottom: "1px solid #e5e5e5", fontSize: 13, fontWeight: 600, color: "#2c3e50" }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "15px 20px", textAlign: "right", verticalAlign: "top", borderBottom: "1px solid #e5e5e5", fontSize: 13, fontWeight: 700, color: "#2c3e50" }}>
                        {fmt(item.total)}
                        {(item.discountAmount || 0) > 0 && (
                          <div style={{ fontSize: 10, color: "#c0392b", fontWeight: 500, marginTop: 2 }}>
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

        {/* ── Signature + Totals ── */}
        {isBL ? (
          <div style={{ display: "flex", justifyContent: "space-between", margin: "80px 40px 0" }}>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #999", height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: "#666" }}>Signature expéditeur</div>
            </div>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #999", height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: "#666" }}>Signature destinataire</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "15px 40px 0" }}>
            {/* Signature */}
            <div>
              {invoice.signature && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Signature</div>
                  <img src={invoice.signature} alt="Signature" style={{ maxHeight: 100, maxWidth: 200, objectFit: "contain" }} />
                </div>
              )}
            </div>

            {/* Totals */}
            <div style={{ textAlign: "right", fontSize: 12 }}>
              {invoice.showTax && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ marginRight: 15, fontWeight: 500, color: "#555", minWidth: 80, textAlign: "right" }}>Sous-total:</span>
                    <span style={{ minWidth: 120, textAlign: "right", fontWeight: 600, color: accent }}>{fmt(invoice.subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ marginRight: 15, fontWeight: 500, color: "#555", minWidth: 80, textAlign: "right" }}>TVA ({invoice.taxRate}%):</span>
                    <span style={{ minWidth: 120, textAlign: "right", fontWeight: 600, color: accent }}>{fmt(invoice.taxAmount)}</span>
                  </div>
                </>
              )}
              {(invoice.discountAmount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ marginRight: 15, fontWeight: 500, color: "#c0392b", minWidth: 80, textAlign: "right" }}>Reduction{invoice.discountReason ? ` (${invoice.discountReason})` : ""}:</span>
                  <span style={{ minWidth: 120, textAlign: "right", fontWeight: 600, color: "#c0392b" }}>-{fmt(invoice.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
                <span style={{ marginRight: 15, fontWeight: 700, color: "#333", minWidth: 80, textAlign: "right", fontSize: 14 }}>Total:</span>
                <span style={{ minWidth: 120, textAlign: "right", fontWeight: 700, color: accent, fontSize: 15 }}>{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Warranty ── */}
        {!isBL && invoice.warranty?.enabled && (
          <div style={{ margin: "15px 40px 0", padding: "12px 18px", background: "#eff6ff", borderRadius: 6, borderLeft: `4px solid #3b82f6` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#3b82f6", marginBottom: 4 }}>Garantie</div>
            {invoice.warranty.duration && <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Durée : {invoice.warranty.duration}</div>}
            {invoice.warranty.description && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{invoice.warranty.description}</div>}
          </div>
        )}

        {/* ── Notes ── */}
        {invoice.notes && (
          <div style={{ margin: "12px 40px 0", padding: "12px 18px", background: "#f9fafb", borderRadius: 6, border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 11, color: "#4b5563", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{invoice.notes}</div>
          </div>
        )}

      </div>

      {/* ── Footer — pushed to bottom of last page via flex parent in print CSS ── */}
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
