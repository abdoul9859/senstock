const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");

const router = express.Router();

// PayDunya API base URLs
const PAYDUNYA_BASE = {
  test: "https://app.paydunya.com/sandbox-api/v1",
  live: "https://app.paydunya.com/api/v1",
};

/**
 * Get PayDunya config from ShopSettings
 */
async function getPaydunyaConfig() {
  const s = await prisma.shopSettings.findUnique({ where: { id: "singleton" } });
  if (!s) return null;
  return {
    masterKey: s.paydunyaMasterKey,
    privateKey: s.paydunyaPrivateKey,
    publicKey: s.paydunyaPublicKey,
    token: s.paydunyaToken,
    mode: s.paydunyaMode || "test",
  };
}

function isConfigured(config) {
  return config && config.masterKey && config.privateKey && config.token;
}

function getBaseUrl(mode) {
  return PAYDUNYA_BASE[mode] || PAYDUNYA_BASE.test;
}

function getHeaders(config) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-PUBLIC-KEY": config.publicKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

/**
 * POST /api/paydunya/create-invoice
 * Body: { orderId }
 * Creates a PayDunya invoice for a shop order and returns the redirect URL
 */
router.post("/create-invoice", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId requis" });

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    // Get PayDunya config
    const config = await getPaydunyaConfig();
    if (!isConfigured(config)) {
      return res.status(400).json({ error: "PayDunya non configure" });
    }

    const baseUrl = getBaseUrl(config.mode);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";

    // Build invoice payload
    const payload = {
      invoice: {
        total_amount: Math.round(order.total),
        description: `Commande ${order.number}`,
      },
      store: {
        name: "SenStock Boutique",
      },
      custom_data: {
        order_id: order.id,
        order_number: order.number,
      },
      actions: {
        callback_url: `${clientUrl}/api/paydunya/ipn`,
        return_url: `${clientUrl}/shop/commande/confirmation?order=${order.number}`,
        cancel_url: `${clientUrl}/shop/commande/annulee?order=${order.number}`,
      },
    };

    // Add items
    if (order.items.length > 0) {
      payload.invoice.items = {};
      order.items.forEach((item, idx) => {
        payload.invoice.items[`item_${idx}`] = {
          name: item.name + (item.variant ? ` (${item.variant})` : ""),
          quantity: item.quantity,
          unit_price: Math.round(item.price),
          total_price: Math.round(item.price * item.quantity),
        };
      });
    }

    // Call PayDunya API
    const response = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.response_code === "00") {
      // Save PayDunya token on order for later verification
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: "paydunya",
          paymentStatus: "en_attente",
          notes: order.notes
            ? `${order.notes}\n[PayDunya token: ${data.token}]`
            : `[PayDunya token: ${data.token}]`,
        },
      });

      return res.json({
        url: data.response_text,
        token: data.token,
      });
    }

    logger.error("PayDunya create-invoice error:", { error: JSON.stringify(data) });
    return res.status(400).json({
      error: data.response_text || "Erreur PayDunya",
    });
  } catch (err) {
    logger.error("PayDunya create-invoice error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la creation du paiement" });
  }
});

/**
 * POST /api/paydunya/ipn
 * PayDunya IPN (Instant Payment Notification) callback
 * Called by PayDunya servers when payment status changes
 */
router.post("/ipn", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Payload invalide" });

    const orderId = data.custom_data?.order_id;
    const status = data.status;
    const paydunyaToken = data.invoice?.token;

    if (!orderId) {
      logger.error("PayDunya IPN: no order_id in custom_data");
      return res.status(400).json({ error: "order_id manquant" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      logger.error(`PayDunya IPN: order ${orderId} not found`);
      return res.status(404).json({ error: "Commande introuvable" });
    }

    // Verify with PayDunya API
    const config = await getPaydunyaConfig();
    if (isConfigured(config) && paydunyaToken) {
      const baseUrl = getBaseUrl(config.mode);
      const verifyRes = await fetch(
        `${baseUrl}/checkout-invoice/confirm/${paydunyaToken}`,
        { headers: getHeaders(config) }
      );
      const verifyData = await verifyRes.json();

      if (verifyData.response_code === "00") {
        const verifiedStatus = verifyData.status;

        let paymentStatus = "en_attente";
        let orderStatus = order.status;

        if (verifiedStatus === "completed") {
          paymentStatus = "payee";
          orderStatus = "confirmee";
        } else if (verifiedStatus === "cancelled") {
          paymentStatus = "annulee";
        } else if (verifiedStatus === "failed") {
          paymentStatus = "echouee";
        }

        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus, status: orderStatus },
        });

        logger.info(
          `PayDunya IPN: order ${order.number} → payment=${paymentStatus}, status=${orderStatus}`
        );

        return res.json({ success: true });
      }
    }

    // Fallback: trust the IPN status directly (less secure)
    let paymentStatus = "en_attente";
    let orderStatus = order.status;

    if (status === "completed") {
      paymentStatus = "payee";
      orderStatus = "confirmee";
    } else if (status === "cancelled") {
      paymentStatus = "annulee";
    } else if (status === "failed") {
      paymentStatus = "echouee";
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus, status: orderStatus },
    });

    logger.info(
      `PayDunya IPN (fallback): order ${order.number} → payment=${paymentStatus}`
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("PayDunya IPN error:", { error: err.message });
    res.status(500).json({ error: "Erreur IPN" });
  }
});

/**
 * GET /api/paydunya/verify/:token
 * Manually verify a payment status
 */
router.get("/verify/:token", async (req, res) => {
  try {
    const config = await getPaydunyaConfig();
    if (!isConfigured(config)) {
      return res.status(400).json({ error: "PayDunya non configure" });
    }

    const baseUrl = getBaseUrl(config.mode);
    const response = await fetch(
      `${baseUrl}/checkout-invoice/confirm/${req.params.token}`,
      { headers: getHeaders(config) }
    );
    const data = await response.json();

    if (data.response_code === "00") {
      return res.json({
        status: data.status,
        customData: data.custom_data,
        receipt: data.receipt_url || null,
      });
    }

    res.status(400).json({ error: data.response_text || "Verification echouee" });
  } catch (err) {
    logger.error("PayDunya verify error:", { error: err.message });
    res.status(500).json({ error: "Erreur de verification" });
  }
});

module.exports = router;
