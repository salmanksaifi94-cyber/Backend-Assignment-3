const express = require("express");
const {
  createProduct, getProducts, getProductById, updateProduct, deleteProduct,
  adjustStock, lowStockReport, categorySummary
} = require("../controllers/productController");
const validateProduct = require("../middleware/validateProduct");

const router = express.Router();

// Reports are declared before /:id so they are not treated as product IDs.
router.get("/reports/low-stock", lowStockReport);
router.get("/reports/category-summary", categorySummary);

router.route("/")
  .post(validateProduct, createProduct)
  .get(getProducts);

router.route("/:id")
  .get(getProductById)
  .put(validateProduct, updateProduct)
  .patch(validateProduct, updateProduct)
  .delete(deleteProduct);

router.post("/:id/stock", adjustStock);

module.exports = router;