function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors).map((item) => item.message).join(", ");
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid product ID or field value";
  } else if (error.code === 11000) {
    statusCode = 409;
    message = `A product with this ${Object.keys(error.keyValue || {})[0] || "unique field"} already exists`;
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
  });
}

module.exports = { notFound, errorHandler };