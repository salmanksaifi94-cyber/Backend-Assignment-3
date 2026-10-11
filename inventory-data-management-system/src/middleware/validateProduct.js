const allowedFields = ["name", "sku", "description", "category", "price", "stock", "lowStockThreshold"];

function validateProduct(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
  }

  const unknownFields = Object.keys(req.body).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) {
    return res.status(400).json({
      success: false,
      message: `Unknown field(s): ${unknownFields.join(", ")}`
    });
  }
  next();
}

module.exports = validateProduct;