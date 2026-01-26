# CRM Service

Customer Relationship Management service for XeroCare ERP system.

## Overview

This service provides CRM functionality including customer management, interactions tracking, and relationship analytics. Built with Node.js, TypeScript, Express, and TypeORM.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Logger**: Winston
- **Package Manager**: pnpm

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
# Edit .env and add your database credentials
```

### Environment Variables

Create a `.env` file with the following variables:

```env
PORT=3005
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db
NODE_ENV=development
```

## Development

```bash
# Run in development mode with hot reload
pnpm dev

# Type check
pnpm typecheck

# Build for production
pnpm build

# Run production build
pnpm start
```

## API Endpoints

### Health Check

- **GET** `/health` - Service health status

```json
{
  "status": "UP",
  "service": "crm_service",
  "timestamp": "2026-01-17T08:15:54.000Z"
}
```

## Architecture

### Folder Structure

```
crm_service/
├── src/
│   ├── app.ts                 # Express app setup & server bootstrap
│   ├── config/                # Configuration files
│   │   ├── env.ts            # Environment variables
│   │   ├── logger.ts         # Winston logger
│   │   └── datasource.ts     # TypeORM DataSource
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── repositories/          # Data access layer
│   ├── entities/              # TypeORM entities
│   ├── routes/                # Express routes
│   ├── middleware/            # Custom middleware
│   ├── types/                 # TypeScript types
│   ├── errors/                # Custom error classes
│   └── utils/                 # Utility functions
├── logs/                      # Application logs
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Layered Architecture

1. **Routes** → Define API endpoints
2. **Controllers** → Handle HTTP requests/responses
3. **Services** → Implement business logic
4. **Repositories** → Data access and persistence
5. **Entities** → Database models

## Development Guidelines

- Follow repository pattern for data access
- Use dependency injection where applicable
- Implement proper error handling with AppError
- Log all important operations
- Write type-safe code with TypeScript
- Keep controllers thin, services fat

## Future Features

- Customer CRUD operations
- Interaction tracking
- Lead management
- Sales pipeline
- Analytics and reporting
- Integration with other services via RabbitMQ
