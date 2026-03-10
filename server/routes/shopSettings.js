const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

async function getSettings(tenantId) {
  return prisma.shopSettings.upsert({
    where: { tenantId },
    update: {},
    create: { id: crypto.randomUUID(), tenantId },
  });
}

// Reconstruct nested structure for frontend compat
function reconstructNested(s) {
  const result = addId(s);
  result.socialLinks = {
    facebook: s.socialFacebook || "",
    instagram: s.socialInstagram || "",
    whatsapp: s.socialWhatsapp || "",
    tiktok: s.socialTiktok || "",
    twitter: s.socialTwitter || "",
  };
  result.paymentMethods = {
    cashOnDelivery: s.pmCashOnDelivery,
    wave: s.pmWave,
    orangeMoney: s.pmOrangeMoney,
    freeMoney: s.pmFreeMoney,
    card: s.pmCard,
  };
  result.paydunya = {
    masterKey: s.paydunyaMasterKey || "",
    privateKey: s.paydunyaPrivateKey || "",
    publicKey: s.paydunyaPublicKey || "",
    token: s.paydunyaToken || "",
    mode: s.paydunyaMode || "test",
  };
  result.smtp = {
    host: s.smtpHost || "",
    port: s.smtpPort || 587,
    user: s.smtpUser || "",
    pass: s.smtpPass || "",
    from: s.smtpFrom || "",
  };
  return result;
}

// Flatten nested objects from request body into flat DB fields
function flattenBody(body) {
  const data = {};

  const directKeys = [
    "shopName", "shopDescription", "shopLogo", "shopFavicon",
    "heroEnabled", "heroImage", "heroTitle", "heroSubtitle", "heroCTAText", "heroCTALink",
    "themePreset", "primaryColor", "secondaryColor", "accentColor", "fontFamily", "borderRadius", "colorMode",
    "phone", "email", "address", "whatsapp",
    "currency", "defaultShipping", "freeShippingThreshold", "taxRate",
    "footerText", "footerColumns",
    "announcementEnabled", "announcementText", "announcementColor",
  ];

  for (const key of directKeys) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // Social links
  if (body.socialLinks) {
    const sl = body.socialLinks;
    if (sl.facebook !== undefined) data.socialFacebook = sl.facebook;
    if (sl.instagram !== undefined) data.socialInstagram = sl.instagram;
    if (sl.whatsapp !== undefined) data.socialWhatsapp = sl.whatsapp;
    if (sl.tiktok !== undefined) data.socialTiktok = sl.tiktok;
    if (sl.twitter !== undefined) data.socialTwitter = sl.twitter;
  }

  // Payment methods
  if (body.paymentMethods) {
    const pm = body.paymentMethods;
    if (pm.cashOnDelivery !== undefined) data.pmCashOnDelivery = pm.cashOnDelivery;
    if (pm.wave !== undefined) data.pmWave = pm.wave;
    if (pm.orangeMoney !== undefined) data.pmOrangeMoney = pm.orangeMoney;
    if (pm.freeMoney !== undefined) data.pmFreeMoney = pm.freeMoney;
    if (pm.card !== undefined) data.pmCard = pm.card;
  }

  // Paydunya
  if (body.paydunya) {
    const pd = body.paydunya;
    if (pd.masterKey !== undefined) data.paydunyaMasterKey = pd.masterKey;
    if (pd.privateKey !== undefined) data.paydunyaPrivateKey = pd.privateKey;
    if (pd.publicKey !== undefined) data.paydunyaPublicKey = pd.publicKey;
    if (pd.token !== undefined) data.paydunyaToken = pd.token;
    if (pd.mode !== undefined) data.paydunyaMode = pd.mode;
  }

  // SMTP
  if (body.smtp) {
    const sm = body.smtp;
    if (sm.host !== undefined) data.smtpHost = sm.host;
    if (sm.port !== undefined) data.smtpPort = sm.port;
    if (sm.user !== undefined) data.smtpUser = sm.user;
    if (sm.pass !== undefined) data.smtpPass = sm.pass;
    if (sm.from !== undefined) data.smtpFrom = sm.from;
  }

  // Also handle flat social/payment/paydunya/smtp fields directly
  const flatSocial = ["socialFacebook", "socialInstagram", "socialWhatsapp", "socialTiktok", "socialTwitter"];
  const flatPm = ["pmCashOnDelivery", "pmWave", "pmOrangeMoney", "pmFreeMoney", "pmCard"];
  const flatPaydunya = ["paydunyaMasterKey", "paydunyaPrivateKey", "paydunyaPublicKey", "paydunyaToken", "paydunyaMode"];
  const flatSmtp = ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"];
  for (const key of [...flatSocial, ...flatPm, ...flatPaydunya, ...flatSmtp]) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  return data;
}

// ── Admin routes (auth required) ──
const admin = express.Router();

admin.get("/", async (req, res) => {
  try {
    const settings = await getSettings(req.tenantId);
    res.json(reconstructNested(settings));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

admin.put("/", async (req, res) => {
  try {
    const data = flattenBody(req.body);
    const settings = await prisma.shopSettings.upsert({
      where: { tenantId: req.tenantId },
      update: data,
      create: { id: crypto.randomUUID(), tenantId: req.tenantId, ...data },
    });
    res.json(reconstructNested(settings));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public routes (no auth) ──
const pub = express.Router();

pub.get("/", async (req, res) => {
  try {
    const s = await getSettings(req.tenantId);
    res.json({
      shopName: s.shopName,
      shopDescription: s.shopDescription,
      shopLogo: s.shopLogo,
      shopFavicon: s.shopFavicon,
      hero: {
        enabled: s.heroEnabled,
        image: s.heroImage,
        title: s.heroTitle,
        subtitle: s.heroSubtitle,
        ctaText: s.heroCTAText,
        ctaLink: s.heroCTALink,
      },
      theme: {
        preset: s.themePreset,
        primaryColor: s.primaryColor,
        secondaryColor: s.secondaryColor,
        accentColor: s.accentColor,
        fontFamily: s.fontFamily,
        borderRadius: s.borderRadius,
        colorMode: s.colorMode,
      },
      contact: {
        phone: s.phone,
        email: s.email,
        address: s.address,
        whatsapp: s.whatsapp,
      },
      socialLinks: {
        facebook: s.socialFacebook || "",
        instagram: s.socialInstagram || "",
        whatsapp: s.socialWhatsapp || "",
        tiktok: s.socialTiktok || "",
        twitter: s.socialTwitter || "",
      },
      commerce: {
        currency: s.currency,
        defaultShipping: s.defaultShipping,
        freeShippingThreshold: s.freeShippingThreshold,
        paymentMethods: {
          cashOnDelivery: s.pmCashOnDelivery,
          wave: s.pmWave,
          orangeMoney: s.pmOrangeMoney,
          freeMoney: s.pmFreeMoney,
          card: s.pmCard,
        },
      },
      footer: {
        text: s.footerText,
        columns: s.footerColumns,
      },
      announcement: {
        enabled: s.announcementEnabled,
        text: s.announcementText,
        color: s.announcementColor,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { admin, public: pub };
