const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    minlength: [2, "Product name must be at least 2 characters"],
    maxlength: [100, "Product name cannot exceed 100 characters"]
  },
  sku: {
    type: String,
    required: [true, "SKU is required"],
    trim: true,
    uppercase: true,
    unique: true,
    minlength: [3, "SKU must be at least 3 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
    default: ""
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    minlength: [2, "Category must be at least 2 characters"]
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  stock: {
    type: Number,
    required: [true, "Stock is required"],
    min: [0, "Stock cannot be negative"],
    validate: {
      validator: Number.isInteger,
      message: "Stock must be a whole number"
    },
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    min: [0, "Low-stock threshold cannot be negative"],
    validate: {
      validator: Number.isInteger,
      message: "Low-stock threshold must be a whole number"
    },
    default: Number(process.env.LOW_STOCK_THRESHOLD) || 10
  }
}, { timestamps: true });

productSchema.index({ name: "text", description: "text", category: "text" });

module.exports = mongoose.model("Product", productSchema);