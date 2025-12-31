# Database Setup Guide

## Prerequisites

1. **MySQL Server** - Install MySQL 8.0 or higher
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP/MAMP which includes MySQL

## Quick Setup

### Option 1: Using MySQL Command Line

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE ironpress_db;

# Create user (optional, for security)
CREATE USER 'ironpress_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ironpress_db.* TO 'ironpress_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### Option 2: Using XAMPP/WAMP

1. Start MySQL service from XAMPP/WAMP control panel
2. Open phpMyAdmin (usually at http://localhost/phpmyadmin)
3. Click "New" to create a new database
4. Name it: `ironpress_db`
5. Click "Create"

## Configure Environment

1. Copy `.env.example` to `.env`
2. Update the DATABASE_URL in `.env`:

```env
# For root user (default)
DATABASE_URL="mysql://root:your_mysql_password@localhost:3306/ironpress_db"

# For custom user
DATABASE_URL="mysql://ironpress_user:your_password@localhost:3306/ironpress_db"
```

## Initialize Database

Run these commands in the server directory:

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push

# Seed database with initial data
npm run prisma:seed

# OR run all at once
npm run db:setup
```

## Verify Setup

```bash
# Open Prisma Studio to view data
npm run prisma:studio

# This will open http://localhost:5555 with a GUI to view your database
```

## Default Login Credentials

After seeding, you can login with:
- **Email:** admin@ironpress.com
- **Password:** Admin@123

## Troubleshooting

### Error: Access denied for user 'root'@'localhost'

- Your MySQL root password is incorrect
- Update the password in DATABASE_URL in .env file

### Error: Unknown database 'ironpress_db'

- The database doesn't exist
- Create it using MySQL command line or phpMyAdmin

### Error: Can't connect to MySQL server

- MySQL service is not running
- Start MySQL from XAMPP/WAMP or services panel

### Port 3306 already in use

- Another MySQL instance is running
- Either use that instance or stop it and restart

## Database Migrations

For production updates:

```bash
# Create a migration
npm run prisma:migrate

# Apply migrations
npx prisma migrate deploy
```

## Backup Database

```bash
# Export data
mysqldump -u root -p ironpress_db > backup.sql

# Import data
mysql -u root -p ironpress_db < backup.sql
```
