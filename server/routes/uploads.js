const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const logger = require("../lib/logger");

const router = express.Router();

// Use memory storage so we can process with sharp before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB raw input
  fileFilter(_req, file, cb) {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/uploads — upload a single image (optimized with sharp)
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Fichier invalide ou manquant" });
  }

  try {
    const sharp = require("sharp");
    const filename = crypto.randomBytes(16).toString("hex") + ".webp";
    const outputPath = path.join(uploadsDir, filename);

    // Optimize: resize to max 1200px wide, convert to webp, quality 80
    await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    logger.info("Image uploaded and optimized", {
      original: req.file.originalname,
      originalSize: req.file.size,
      optimizedSize: stats.size,
      filename,
    });

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    // Fallback: save raw file if sharp fails
    logger.warn("Sharp optimization failed, saving raw", { error: err.message });
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = crypto.randomBytes(16).toString("hex") + ext;
    const outputPath = path.join(uploadsDir, filename);
    fs.writeFileSync(outputPath, req.file.buffer);
    res.json({ url: `/uploads/${filename}` });
  }
});

module.exports = router;
