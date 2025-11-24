# Pharmacy POS Backend API

Express.js REST API backend for the Pharmacy Point of Sale System.

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm v9+
- MySQL 8.0+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# nano .env

# Create database (if not exists)
npm run db:create

# Sync database tables
npm run db:sync

# Seed initial data (optional)
npm run db:seed

# Start development server
npm run dev
```

Server will run on: `http://localhost:3000`

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

All endpoints except `/api/auth/login` and `/api/auth/first-run` require JWT authentication.

Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/first-run` - Check first run

#### Products

- `GET /api/products` - Get all products (supports pagination & filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search?q=query` - Search products

#### Stock

- `GET /api/stock/product/:id` - Get stock by product
- `GET /api/stock/batch/:id` - Get batch details
- `POST /api/stock/deduct` - Deduct stock
- `GET /api/stock/expiring?days=30` - Get expiring stock

#### Stock Receipts

- `GET /api/stock-receipts/generate-number` - Generate receipt number
- `POST /api/stock-receipts` - Create stock receipt
- `GET /api/stock-receipts` - Get all stock receipts
- `GET /api/stock-receipts/:id` - Get stock receipt by ID
- `PUT /api/stock-receipts/:id` - Update stock receipt
- `DELETE /api/stock-receipts/:id` - Cancel stock receipt
- `GET /api/stock-receipts/supplier/:id` - Get receipts by supplier

#### Suppliers

- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/suppliers/active` - Get active suppliers
- `GET /api/suppliers/:id/products` - Get supplier products

#### Sales

- `POST /api/sales` - Create new sale
- `GET /api/sales` - Get sales history
- `GET /api/sales/:id` - Get sale by ID
- `GET /api/sales/today` - Get today's sales
- `PUT /api/sales/:id` - Update sale

#### Dashboard

- `GET /api/dashboard/summary` - Get dashboard summary

#### Reports

- `GET /api/reports/daily-sales` - Daily sales report
- `GET /api/reports/stock-level` - Stock level report
- `GET /api/reports/expiring?days=30` - Expiring products report
- `GET /api/reports/top-selling` - Top selling products

#### Meta Data

- `GET /api/meta/product-types` - Get product types
- `GET /api/meta/categories` - Get categories

## 🔒 Security

- JWT token-based authentication
- Password hashing with bcrypt
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator

## 🗄️ Database

Uses MySQL with Sequelize ORM:

- Database: `pharmacy_pos`
- Models: User, Product, Category, ProductType, Supplier, StockEntry, StockReceipt, Sale, SaleItem

## 📦 Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/index.js --name pharmacy-api

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Using Docker

```bash
# Build image
docker build -t pharmacy-pos-backend .

# Run container
docker run -p 3000:3000 --env-file .env pharmacy-pos-backend
```

### Environment Variables

Make sure to set these in production:

- `NODE_ENV=production`
- `JWT_SECRET=<secure-random-string>`
- `DB_HOST=<production-db-host>`
- `CORS_ORIGIN=<production-frontend-url>`

## 🛠️ Development

```bash
# Run in development mode (auto-restart)
npm run dev

# Run in production mode
npm start

# Database operations
npm run db:sync    # Sync tables
npm run db:seed    # Seed data
npm run db:create  # Create database
```

## 📝 License

MIT
