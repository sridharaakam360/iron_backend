# IronPress Server - Backend API

Complete backend API for IronPress Laundry Billing System built with Node.js, Express, TypeScript, Prisma, and MySQL.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Bill Management**: Create, read, update, delete bills with automatic bill number generation
- **Customer Management**: Complete customer CRUD operations with bill history
- **Category Management**: Manage laundry item categories and pricing
- **Notifications**: SMS (Twilio) and Email notifications for bill updates
- **PDF Generation**: Generate professional PDF invoices
- **Security**: Helmet, CORS, rate limiting, input validation
- **Database**: MySQL with Prisma ORM for type-safe database access
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: RESTful API with consistent response format

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **ORM**: Prisma 7
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **Notifications**: Twilio (SMS), Nodemailer (Email)
- **PDF**: PDFKit
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+ (or XAMPP/WAMP/MAMP)
- Git

## Installation

### 1. Clone and Install Dependencies

```bash
cd server
npm install
```

### 2. Setup Database

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

Quick setup:
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE ironpress_db;
EXIT;
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update:
# - DATABASE_URL (MySQL connection string)
# - JWT_SECRET (random secure string)
# - SMTP credentials (for email)
# - Twilio credentials (for SMS)
```

### 4. Initialize Database

```bash
# Generate Prisma Client, push schema, and seed data
npm run db:setup

# Or run individually:
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server will run on http://localhost:5000

## Available Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to database
npm run prisma:migrate   # Create migration
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run prisma:seed      # Seed database with sample data
npm run db:setup         # Complete database setup (generate + push + seed)
```

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh-token` | Refresh access token | No |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/auth/logout` | Logout user | Yes |

### Bills

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/bills` | Create new bill | Yes |
| GET | `/bills` | Get all bills (with filters) | Yes |
| GET | `/bills/stats` | Get dashboard statistics | Yes |
| GET | `/bills/:id` | Get bill by ID | Yes |
| PUT | `/bills/:id` | Update bill | Yes |
| DELETE | `/bills/:id` | Delete bill | Yes |
| GET | `/bills/:id/pdf` | Download bill as PDF | Yes |

### Customers

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/customers` | Create customer | Yes |
| GET | `/customers` | Get all customers | Yes |
| GET | `/customers/:id` | Get customer by ID | Yes |
| PUT | `/customers/:id` | Update customer | Yes |
| DELETE | `/customers/:id` | Delete customer | Yes |

### Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/categories` | Create category | Yes |
| GET | `/categories` | Get all categories | Yes |
| GET | `/categories/:id` | Get category by ID | Yes |
| PUT | `/categories/:id` | Update category | Yes |
| DELETE | `/categories/:id` | Delete category | Yes |

### Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications/bills/:billId/send` | Send bill notification | Yes |
| GET | `/notifications/history` | Get notification history | Yes |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Check server health | No |

## Request/Response Examples

### Login

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@ironpress.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@ironpress.com",
      "name": "Admin User",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Create Bill

**Request:**
```bash
POST /api/v1/bills
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerEmail": "john@example.com",
  "items": [
    {
      "categoryId": "category-uuid",
      "quantity": 3
    },
    {
      "categoryId": "category-uuid-2",
      "quantity": 2
    }
  ],
  "notes": "Express service"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bill created successfully",
  "data": {
    "id": "bill-uuid",
    "billNumber": "BILL-20241226-001",
    "customer": {
      "name": "John Doe",
      "phone": "9876543210"
    },
    "items": [...],
    "totalAmount": "85.00",
    "status": "PENDING",
    "createdAt": "2024-12-26T10:00:00.000Z"
  }
}
```

### Get Dashboard Stats

**Request:**
```bash
GET /api/v1/bills/stats
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBills": 150,
    "pendingBills": 25,
    "completedBills": 125,
    "todayRevenue": 2500,
    "weeklyRevenue": 15000,
    "monthlyRevenue": 50000,
    "recentBills": [...]
  }
}
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

Access tokens expire in 24 hours. Use the refresh token endpoint to get a new access token.

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Environment Variables

See `.env.example` for all required environment variables.

### Required Variables

```env
DATABASE_URL="mysql://user:password@localhost:3306/ironpress_db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
```

### Optional Variables

```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## Database Schema

- **users** - User accounts (admin/employee)
- **customers** - Customer information
- **categories** - Item categories and pricing
- **bills** - Bill records
- **bill_items** - Bill line items
- **notifications** - Notification history
- **settings** - App settings (key-value)
- **audit_logs** - Audit trail

## Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: Access + Refresh tokens
- **CORS**: Configured for allowed origins
- **Helmet**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: express-validator
- **SQL Injection Prevention**: Prisma ORM

## Production Deployment

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
NODE_ENV=production npm start
```

### Using Docker

See [Docker Configuration](#docker-configuration) section below.

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure HTTPS (reverse proxy like Nginx)
4. Set up database backups
5. Configure monitoring and logging
6. Use environment-specific .env files

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Prisma client setup
│   │   └── env.ts       # Environment variables
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── prisma/          # Prisma seed
│   ├── generated/       # Generated Prisma Client
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## Support

For issues and questions:
1. Check the documentation
2. Review error logs
3. Verify environment configuration
4. Check database connection

## Default Credentials

After running `npm run prisma:seed`:

- **Email**: admin@ironpress.com
- **Password**: Admin@123

**⚠️ Change these credentials in production!**

## License

ISC
#   i r o n _ b a c k e n d  
 