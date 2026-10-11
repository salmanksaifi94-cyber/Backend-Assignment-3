require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const productRoutes = require("./src/routes/productRoutes");
const { notFound, errorHandler } = require("./src/middleware/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Inventory and Data Management System API",
    endpoints: "/api/products",
    health: "/health"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api/products", productRoutes);

app.use(notFound);
app.use(errorHandler);

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env and configure it.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });