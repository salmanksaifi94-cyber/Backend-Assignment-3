const mongoose = require("mongoose");
const Product = require("../models/Product");

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

const getProducts = asyncHandler(async (req, res) => {
  const {
    category, search, minPrice, maxPrice, minStock, maxStock,
    sort = "-createdAt", page = "1", limit = "10"
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 ||
      !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
    return res.status(400).json({
      success: false,
      message: "page must be >= 1; limit must be between 1 and 100"
    });
  }

  const filter = {};
  if (category) filter.category = { $regex: escapeRegex(category), $options: "i" };
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { sku: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } }
    ];
  }

  const price = {};
  if (minPrice !== undefined) price.$gte = validNonNegativeNumber(minPrice, "minPrice");
  if (maxPrice !== undefined) price.$lte = validNonNegativeNumber(maxPrice, "maxPrice");
  if (Object.keys(price).length) filter.price = price;

  const stock = {};
  if (minStock !== undefined) stock.$gte = validNonNegativeNumber(minStock, "minStock", true);
  if (maxStock !== undefined) stock.$lte = validNonNegativeNumber(maxStock, "maxStock", true);
  if (Object.keys(stock).length) filter.stock = stock;

  const sortObject = {};
  for (const part of sort.split(",")) {
    const key = part.startsWith("-") ? part.slice(1) : part;
    if (!["name", "price", "stock", "category", "createdAt", "updatedAt"].includes(key)) {
      return res.status(400).json({ success: false, message: `Unsupported sort field: ${key}` });
    }
    sortObject[key] = part.startsWith("-") ? -1 : 1;
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortObject).skip((pageNumber - 1) * limitNumber).limit(limitNumber),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    results: products.length,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber)
    },
    data: products
  });
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validNonNegativeNumber(value, field, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    const error = new Error(`${field} must be a valid non-negative ${integer ? "integer" : "number"}`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: "query"
  });
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, message: "Product deleted successfully", data: product });
});

// POST /:id/stock with { "operation": "restock" | "sale", "quantity": 5 }
const adjustStock = asyncHandler(async (req, res) => {
  const { operation, quantity } = req.body || {};
  if (!["restock", "sale"].includes(operation)) {
    return res.status(400).json({ success: false, message: 'operation must be "restock" or "sale"' });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: "quantity must be a positive whole number" });
  }

  let product;
  if (operation === "restock") {
    product = await Product.findByIdAndUpdate(
      req.params.id, { $inc: { stock: quantity } }, { new: true, runValidators: true }
    );
  } else {
   
    product = await Product.findOneAndUpdate(
      { _id: req.params.id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true, runValidators: true }
    );
    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
      }
      return res.status(409).json({ success: false, message: "Insufficient stock for this sale" });
    }
  }

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ success: true, message: operation === "restock" ? "Stock restocked" : "Sale recorded", data: product });
});

const lowStockReport = asyncHandler(async (req, res) => {
  const threshold = req.query.threshold === undefined
    ? Number(process.env.LOW_STOCK_THRESHOLD) || 10
    : validNonNegativeNumber(req.query.threshold, "threshold", true);

  const filter = req.query.threshold === undefined
    ? { $expr: { $lte: ["$stock", "$lowStockThreshold"] } }
    : { stock: { $lte: threshold } };

  const products = await Product.find(filter).sort({ stock: 1, name: 1 });
  res.json({ success: true, threshold, count: products.length, data: products });
});

const categorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        productCount: { $sum: 1 },
        totalUnitsInStock: { $sum: "$stock" },
        totalInventoryValue: { $sum: { $multiply: ["$price", "$stock"] } },
        averagePrice: { $avg: "$price" }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        productCount: 1,
        totalUnitsInStock: 1,
        totalInventoryValue: { $round: ["$totalInventoryValue", 2] },
        averagePrice: { $round: ["$averagePrice", 2] }
      }
    }
  ]);
  res.json({ success: true, count: summary.length, data: summary });
});

module.exports = {
  createProduct, getProducts, getProductById, updateProduct, deleteProduct,
  adjustStock, lowStockReport, categorySummary
};