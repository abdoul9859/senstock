import type { InvoiceTemplateProps } from "./types";
import { formatCurrency, formatDateFR, formatDateShort, typeLabels, paymentMethodLabels } from "./types";

/**
 * Template TECHZONE — Bold, modern invoice with Poppins font, top accent bar,
 * prominent total display, bordered items table, and clean footer.
 */
export function TemplateTECHZONE({ invoice, settings, currency }: InvoiceTemplateProps) {
  const fmt = (n?: number) => formatCurrency(n, currency);
  const typeLabel = typeLabels[invoice.type] || "FACTURE";
  const primary = settings.accentColor || "#1f3f8b";
  const primaryDark = "#0e2a66";
  const hasExchange = invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0;
  const isBL = invoice.type === "bon_livraison";

  return (
    <div style={{ fontFamily: "'Poppins', 'Segoe UI', Arial, sans-serif", fontSize: 10, color: "#333", background: "#fff", width: "100%", display: "flex", flexDirection: "column", minHeight: "297mm" }}>

      {/* ── Top Bar ── */}
      <div style={{ borderBottom: `4px solid ${primary}`, height: 25, width: "100%" }} />

      <div style={{ padding: "25px 35px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {settings.businessLogo ? (
              <img src={settings.businessLogo} alt="Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }} />
            ) : (
              <>
                <div style={{ width: 50, height: 50, background: `linear-gradient(135deg, ${primary}, ${primaryDark})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 24 }}>
                  {(settings.businessName || "T").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: primaryDark, letterSpacing: 1, textTransform: "uppercase" }}>
                    {settings.businessName || "Mon Entreprise"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Invoice title */}
          <div style={{ fontSize: 42, fontWeight: 800, color: primary, letterSpacing: 2, textTransform: "uppercase" }}>
            {typeLabel}
          </div>
        </div>

        {/* ── Client Section + Total/Meta ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25, paddingBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
          {/* Client info */}
          <div>
            <div style={{ color: primary, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{isBL ? "Livré à:" : "Facturé à:"}</div>
            {invoice.client ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: primaryDark, marginBottom: 5 }}>{invoice.client.name}</div>
                {invoice.client.phone && <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Tél: {invoice.client.phone}</div>}
                {invoice.client.email && <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Email: {invoice.client.email}</div>}
                {invoice.client.address && <div style={{ fontSize: 11, color: "#666" }}>{invoice.client.address}</div>}
              </>
            ) : (
              <div style={{ fontSize: 22, fontWeight: 700, color: primaryDark }}>
                {invoice.type === "vente_flash" ? "Client Comptoir" : "Client Comptant"}
              </div>
            )}
            {isBL && invoice.deliveryAddress && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 8 }}>Adresse livraison: {invoice.deliveryAddress}</div>
            )}
          </div>

          {/* Total + meta */}
          <div style={{ textAlign: "right" }}>
            {!isBL && (
              <>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>Total à payer</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: primary, marginBottom: 10 }}>{fmt(invoice.total)}</div>
              </>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, fontSize: 10 }}>
                <span style={{ color: "#666" }}>N° {isBL ? "BL" : invoice.type === "devis" ? "Devis" : "Facture"}:</span>
                <span style={{ color: primaryDark, fontWeight: 500, minWidth: 100, textAlign: "left" }}>{invoice.number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, fontSize: 10 }}>
                <span style={{ color: "#666" }}>Date:</span>
                <span style={{ color: primaryDark, fontWeight: 500, minWidth: 100, textAlign: "left" }}>{formatDateShort(invoice.date)}</span>
              </div>
              {invoice.dueDate && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, fontSize: 10 }}>
                  <span style={{ color: "#666" }}>Échéance:</span>
                  <span style={{ color: primaryDark, fontWeight: 500, minWidth: 100, textAlign: "left" }}>{formatDateShort(invoice.dueDate)}</span>
                </div>
              )}
              {isBL && invoice.invoiceNumber && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, fontSize: 10 }}>
                  <span style={{ color: "#666" }}>Réf. facture:</span>
                  <span style={{ color: primaryDark, fontWeight: 500, minWidth: 100, textAlign: "left" }}>{invoice.invoiceNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Exchange items ── */}
        {hasExchange && (
          <div style={{ marginBottom: 25, padding: 15, background: "#f0f8ff", borderLeft: `4px solid ${primary}`, borderRadius: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: primary, marginBottom: 12 }}>
              Produits échangés (reprise)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ background: "#e6f2ff", borderBottom: `2px solid ${primary}` }}>
                  <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>Produit</th>
                  <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>Variante</th>
                  <th style={{ padding: 8, textAlign: "center", fontWeight: 600, width: 80 }}>Quantité</th>
                  <th style={{ padding: 8, textAlign: "right", fontWeight: 600, width: 100 }}>Prix reprise</th>
                </tr>
              </thead>
              <tbody>
                {invoice.exchangeItems!.map((ei) => (
                  <tr key={ei._id} style={{ borderBottom: "1px solid #d0e7ff" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{ei.description}</td>
                    <td style={{ padding: 8, fontFamily: "monospace", fontSize: 10, color: "#666" }}>{ei.variantLabel || "—"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{ei.quantity}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmt(ei.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Items Table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ width: isBL ? "55%" : "50%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 15px", textAlign: "left", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}`, position: "relative", paddingLeft: 25 }}>
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: primary }} />
                Article
              </th>
              {isBL ? (
                <>
                  <th style={{ width: "22%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "12px 15px", textAlign: "center", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}` }}>Quantité</th>
                  <th style={{ width: "23%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "12px 15px", textAlign: "center", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}`, position: "relative", paddingRight: 25 }}>
                    Livré
                    <span style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, background: primary }} />
                  </th>
                </>
              ) : (
                <>
                  <th style={{ width: "15%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "12px 15px", textAlign: "center", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}` }}>Prix</th>
                  <th style={{ width: "15%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "12px 15px", textAlign: "center", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}` }}>Qté</th>
                  <th style={{ width: "20%", color: primaryDark, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "12px 15px", textAlign: "center", borderTop: `2px solid ${primary}`, borderBottom: `2px solid ${primary}`, position: "relative", paddingRight: 25 }}>
                    Total
                    <span style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, background: primary }} />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) =>
              item.type === "section" ? (
                <tr key={item._id} style={{ breakInside: "avoid" as const }}>
                  <td colSpan={isBL ? 3 : 4} style={{ background: "#f5f5f5", fontWeight: 700, textTransform: "uppercase", fontSize: 10, color: primaryDark, padding: "10px 25px" }}>
                    {item.description || "Section"}
                  </td>
                </tr>
              ) : (
                <tr key={item._id} style={{ borderBottom: "1px solid #e0e0e0", background: i % 2 === 0 ? "#fff" : "#f5f5f5", breakInside: "avoid" as const }}>
                  <td style={{ padding: "14px 15px", fontSize: 11, verticalAlign: "top", paddingLeft: 25 }}>
                    <div style={{ fontWeight: 600, color: primaryDark, marginBottom: 2 }}>
                      {item.productId
                        ? [item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")
                        : item.description || "Service"}
                    </div>
                    {item.variantId && (
                      <div style={{ fontSize: 10, color: "#666" }}>IMEI / Numéro de série: {item.variantId}</div>
                    )}
                  </td>
                  {isBL ? (
                    <>
                      <td style={{ padding: "14px 15px", textAlign: "center", fontSize: 11 }}>{item.quantity}</td>
                      <td style={{ padding: "14px 15px", textAlign: "center", fontSize: 11, fontWeight: 600, color: primaryDark }}>{item.delivered ?? 0}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "14px 15px", textAlign: "center", fontSize: 11 }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "14px 15px", textAlign: "center", fontSize: 11 }}>{item.quantity}</td>
                      <td style={{ padding: "14px 15px", textAlign: "center", fontSize: 11, fontWeight: 600, color: primaryDark }}>
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

        {/* ── Bottom Section: Payment + Totals / Dual Signatures ── */}
        {isBL ? (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 80, marginBottom: 20 }}>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: `1px solid ${primaryDark}`, height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#666" }}>Signature expéditeur</div>
            </div>
            <div style={{ width: 200, textAlign: "center" }}>
              <div style={{ borderBottom: `1px solid ${primaryDark}`, height: 50, marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#666" }}>Signature destinataire</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 20 }}>
              {/* Payment method */}
              <div>
                <div style={{ color: primary, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Mode de Paiement</div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 15px", fontSize: 11 }}>
                  <span style={{ color: "#666" }}>Méthode:</span>
                  <span style={{ color: primaryDark, fontWeight: 500 }}>
                    {invoice.payment?.enabled
                      ? paymentMethodLabels[invoice.payment.method] || invoice.payment.method
                      : "Espèces"}
                  </span>
                  <span style={{ color: "#666" }}>État:</span>
                  <span style={{ color: primaryDark, fontWeight: 500, textTransform: "capitalize" }}>{invoice.status.replace("_", " ")}</span>
                  {invoice.payment?.enabled && (
                    <>
                      <span style={{ color: "#666" }}>Versé:</span>
                      <span style={{ color: primaryDark, fontWeight: 500 }}>{fmt(invoice.payment.amount)}</span>
                      {invoice.payment.amount < invoice.total && (
                        <>
                          <span style={{ color: "#666" }}>Reste:</span>
                          <span style={{ color: "#c0392b", fontWeight: 600 }}>{fmt(invoice.total - invoice.payment.amount)}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ width: "100%", maxWidth: 280 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 11, borderBottom: "1px solid #e0e0e0" }}>
                    <span style={{ color: "#666" }}>Sous-total:</span>
                    <span style={{ fontWeight: 600, color: primaryDark }}>{fmt(invoice.subtotal)}</span>
                  </div>
                  {(invoice.discountAmount || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 11, borderBottom: "1px solid #e0e0e0" }}>
                      <span style={{ color: "#c0392b" }}>Reduction{invoice.discountReason ? ` (${invoice.discountReason})` : ""}:</span>
                      <span style={{ fontWeight: 600, color: "#c0392b" }}>-{fmt(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {invoice.showTax && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 11, borderBottom: "1px solid #e0e0e0" }}>
                      <span style={{ color: "#666" }}>TVA ({invoice.taxRate}%):</span>
                      <span style={{ fontWeight: 600, color: primaryDark }}>{fmt(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 15px", marginTop: 10, border: `2px solid ${primary}`, color: primary }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Total:</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Warranty ── */}
            {invoice.warranty?.enabled && (
              <div style={{ marginBottom: 15, padding: "12px 18px", background: "#f0f0f0", borderLeft: `4px solid ${primary}`, borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: primaryDark, marginBottom: 6 }}>Garantie</div>
                {invoice.warranty.duration && <div style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>Durée: {invoice.warranty.duration}</div>}
                {invoice.warranty.description && <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.6 }}>{invoice.warranty.description}</div>}
              </div>
            )}

            {/* ── Signature ── */}
            {invoice.signature && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 25 }}>
                <div style={{ width: 200, textAlign: "center" }}>
                  <div style={{ borderBottom: `1px solid ${primaryDark}`, height: 50, marginBottom: 8, position: "relative" }}>
                    <img src={invoice.signature} alt="Signature" style={{ maxHeight: 45, maxWidth: 150, position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#666" }}>Signature & Cachet</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Notes ── */}
        {invoice.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: primaryDark, marginBottom: 8 }}>{isBL ? "Notes:" : "Termes & Conditions:"}</div>
            <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
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
