const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  // Support token from Authorization header or query param (for print/download links)
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
};
