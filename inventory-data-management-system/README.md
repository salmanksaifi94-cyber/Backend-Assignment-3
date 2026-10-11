# Inventory and Data Management System — Assignment 3

A RESTful backend for managing a store or warehouse product catalogue, built with **Node.js, Express.js, MongoDB, Mongoose and dotenv**.

## 1. Requirements

- Node.js (LTS recommended)
- MongoDB running locally, or a MongoDB Atlas connection URI
- npm

## 2. Setup and run

1. Extract the ZIP folder and open it in VS Code.
2. Open a terminal in this folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your environment file by copying `.env.example` to `.env`. Update `MONGODB_URI` if your MongoDB URI is different.

   macOS/Linux:
   ```bash
   cp .env.example .env
   ```

   Windows Command Prompt:
   ```bat
   copy .env.example .env
   ```

5. Make sure MongoDB is running, then start the server:

   ```bash
   npm start
   ```

6. Visit `http://localhost:3000/health`. The database status should be `connected`.

> Never upload your real `.env` file or database password to GitHub. `.env` is ignored by Git.

## 3. Product fields and validation

| Field | Type | Rules |
|---|---|---|
| `name` | String | Required, 2–100 characters |
| `sku` | String | Required, unique, uppercase |
| `description` | String | Optional, max 500 characters |
| `category` | String | Required, at least 2 characters |
| `price` | Number | Required, non-negative |
| `stock` | Number | Whole number, non-negative |
| `lowStockThreshold` | Number | Whole number, non-negative; defaults to `LOW_STOCK_THRESHOLD` or 10 |

Mongoose timestamps automatically add `createdAt` and `updatedAt`.

## 4. API endpoints

Base URL: `http://localhost:3000/api/products`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/products` | Create a product |
| `GET` | `/api/products` | List, filter, sort and paginate products |
| `GET` | `/api/products/:id` | Get one product |
| `PUT` | `/api/products/:id` | Replace/update supplied product fields |
| `PATCH` | `/api/products/:id` | Update supplied product fields |
| `DELETE` | `/api/products/:id` | Delete a product |
| `POST` | `/api/products/:id/stock` | Restock or record a sale |
| `GET` | `/api/products/reports/low-stock` | Low-stock report |
| `GET` | `/api/products/reports/category-summary` | Category-wise aggregation summary |

### Create a product

Send a `POST` request to `/api/products` with header `Content-Type: application/json` and body:

```json
{
  "name": "Wireless Mouse",
  "sku": "WM-1001",
  "description": "Wireless optical mouse",
  "category": "Electronics",
  "price": 599,
  "stock": 25,
  "lowStockThreshold": 5
}
```

Save the returned `_id` to use in the single-product, update, delete and stock routes.

### Filtering, sorting and pagination

Example:

```text
GET /api/products?category=Electronics&minPrice=100&maxPrice=1000&minStock=1&search=mouse&sort=-price&page=1&limit=5
```

Supported query parameters:

- `category`: case-insensitive category match
- `search`: search product name, SKU or description
- `minPrice`, `maxPrice`: price range
- `minStock`, `maxStock`: stock range
- `sort`: comma-separated fields; prefix with `-` for descending, e.g. `sort=-price,name`
- `page`: page number, starts at 1
- `limit`: results per page, 1–100 (default 10)

Allowed sort fields: `name`, `price`, `stock`, `category`, `createdAt`, `updatedAt`.

### Update product

Send a `PATCH` request to `/api/products/PRODUCT_ID`:

```json
{
  "price": 649,
  "description": "Updated wireless mouse"
}
```

### Restock and sale

Send a `POST` request to `/api/products/PRODUCT_ID/stock`.

Restock body:
```json
{ "operation": "restock", "quantity": 10 }
```

Sale body:
```json
{ "operation": "sale", "quantity": 3 }
```

Quantity must be a positive whole number. A sale is performed atomically only if enough stock exists, so stock cannot become negative. An insufficient-stock sale returns HTTP `409`.

### Low-stock report

```text
GET /api/products/reports/low-stock
GET /api/products/reports/low-stock?threshold=5
```

The report uses each product's `lowStockThreshold`; the optional `threshold` query parameter is provided as a configurable report threshold/default. Products are returned in ascending stock order.

### Category-wise inventory summary

```text
GET /api/products/reports/category-summary
```

Uses a MongoDB aggregation pipeline to calculate per category:
- Number of products
- Total units in stock
- Total inventory value (`price × stock`)
- Average product price

## 5. Quick testing order

Use Postman, Thunder Client, or `curl`:

1. Start MongoDB and run `npm start`.
2. Create two or more products using `POST /api/products`.
3. List products using `GET /api/products`.
4. Try filtering and pagination.
5. Copy a product `_id`, then test `GET`, `PATCH`, and `DELETE` by ID.
6. Test stock restock and sale operations.
7. Check both report endpoints.

Example curl request:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","sku":"WM-1001","category":"Electronics","price":599,"stock":25,"lowStockThreshold":5}'
```

## 6. Project structure

```text
inventory-data-management-system/
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── models/
    │   └── Product.js
    ├── controllers/
    │   └── productController.js
    ├── routes/
    │   └── productRoutes.js
    └── middleware/
        ├── errorMiddleware.js
        └── validateProduct.js
```

## 7. Concepts demonstrated

- Mongoose schema design and field validation
- MongoDB connection using dotenv configuration
- RESTful CRUD operations
- Query-string filtering, sorting and pagination
- MongoDB aggregation (`$group`, `$sum`, `$avg`, `$multiply`, `$project`)
- Safe stock increment/decrement
- Input validation and centralized error handling
- HTTP status codes for success and errors

**Note:** This is the backend assignment; it intentionally does not include an admin panel or frontend.
