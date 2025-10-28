# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UaiViu (formerly Atendechat) is a WhatsApp multi-tenant customer service platform built as a white-label solution. The system enables teams to manage WhatsApp conversations, automate responses, and organize customer support operations.

**Tech Stack:**
- **Backend:** Express.js + TypeScript + Sequelize ORM
- **Frontend:** React.js 17 (Material-UI v4)
- **Database:** PostgreSQL
- **Real-time:** Socket.IO
- **Queue System:** Bull (Redis-backed)
- **WhatsApp Integration:** Baileys library (v6.7.18)

## Repository Structure

```
/backend          - Express API server
  /src
    /controllers  - Request handlers
    /services     - Business logic (organized by domain)
    /models       - Sequelize models
    /database     - Migrations and seeds
    /routes       - API routes
    /helpers      - Utility functions
    /libs         - Core libraries (socket, wbot, cache)
    /WbotServices - WhatsApp bot services
    /config       - Configuration files
/frontend         - React SPA
  /src
    /components   - Reusable UI components
    /pages        - Route pages
    /context      - React Context providers
    /routes       - Route definitions
/instalador       - Automated installation scripts
```

## Development Commands

### Backend

```bash
cd backend/

# Install dependencies
npm install --force

# Development mode
npm run watch    # Compile TypeScript in watch mode
npm start        # Start server with nodemon (requires compiled code)

# Alternative: run directly with ts-node-dev
npm run dev:server

# Build for production
npm run build

# Database operations
npm run db:migrate          # Run pending migrations
npm run db:seed            # Run all seeders
npx sequelize db:migrate   # Run migrations (alternative)
npx sequelize db:seed      # Run seeders (alternative)

# Testing
npm test                   # Run tests with Jest

# Code quality
npm run lint               # Lint TypeScript files
```

### Frontend

```bash
cd frontend/

# Install dependencies
npm install --force

# Development mode
npm start          # Starts dev server with legacy OpenSSL provider

# Build for production
npm run build      # Production build (no source maps)
npm run builddev   # Development build (with source maps)

# Testing
npm test
```

## Architecture & Key Concepts

### Multi-Tenancy

The system supports multiple companies (tenants) with complete data isolation:
- `Company` model is the root tenant entity
- Almost all models have a `companyId` foreign key
- Plan limits (users, connections) are enforced per company
- Each company can have multiple WhatsApp connections

### WhatsApp Integration

- **Baileys:** Core library for WhatsApp Web API communication
- **Whatsapp Model:** Represents a WhatsApp connection (phone number)
- **Baileys/BaileysChats Models:** Store connection state and chat data
- **WbotServices:** Services that interact with WhatsApp (send/receive messages)
- Connection flow: QR code generation → scanning → session persistence

### Ticket System

Tickets represent customer conversations:
- **Status:** open, pending, closed
- **Queue Assignment:** Tickets can be assigned to queues (departments)
- **User Assignment:** Tickets can be assigned to specific users
- **Tags:** Tickets can be tagged for categorization
- **Notes:** Internal notes can be added to tickets

### Queue System (Bull)

Background job processing with Redis:
- `messageQueue`: Handles message sending
- `sendScheduledMessages`: Processes scheduled messages
- Queue processing starts after WhatsApp sessions are initialized

### Flow Builder

Visual chatbot/automation builder:
- **FlowBuilder:** Main flow configuration
- **FlowDefault:** Default flows for WhatsApp connections
- **FlowCampaign:** Flows for marketing campaigns
- Node types: text, image, audio, video, menu, question, condition, OpenAI integration, etc.

### Campaign System

Bulk messaging functionality:
- **Campaign:** Campaign configuration
- **ContactList/ContactListItem:** Contact lists for campaigns
- **CampaignShipping:** Tracks individual message deliveries
- **CampaignSetting:** Campaign-level settings

### Real-time Communication

Socket.IO events are used extensively:
- Ticket updates
- New messages
- Connection status changes
- User status updates
- Notifications

Key socket file: `backend/src/libs/socket.ts`

## Database Migrations

Migrations are timestamp-prefixed and must be run in order. Always run migrations twice during deployment to ensure consistency:

```bash
npx sequelize db:migrate
npx sequelize db:migrate  # Run twice as shown in README
npx sequelize db:seed
```

## Deployment

Deployments use PM2 process manager under the `deploy` user:

**Backend:**
```bash
cd /home/deploy/${empresa_atualizar}
pm2 stop ${empresa_atualizar}-backend
git pull
cd backend
npm install
npm update -f
rm -rf dist
npm run build
npx sequelize db:migrate
npx sequelize db:migrate
npx sequelize db:seed
pm2 start ${empresa_atualizar}-backend
pm2 save
```

**Frontend:**
```bash
cd /home/deploy/${empresa_atualizar}
pm2 stop ${empresa_atualizar}-frontend
git pull
cd frontend
npm install
rm -rf build
npm run build
pm2 start ${empresa_atualizar}-frontend
pm2 save
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=
BACKEND_URL=          # Backend URL
FRONTEND_URL=         # Frontend URL (used for CORS)
PORT=                 # Backend port

# Database
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASS=
DB_NAME=

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=

# Redis
REDIS_URI=redis://:password@127.0.0.1:port
REDIS_OPT_LIMITER_MAX=1
REGIS_OPT_LIMITER_DURATION=3000

# Limits
USER_LIMIT=           # Max users per company
CONNECTIONS_LIMIT=    # Max WhatsApp connections per company
CLOSED_SEND_BY_ME=true

# Payment Gateway (Gerencianet)
GERENCIANET_SANDBOX=false
GERENCIANET_CLIENT_ID=
GERENCIANET_CLIENT_SECRET=
GERENCIANET_PIX_CERT=
GERENCIANET_PIX_KEY=

# Email
MAIL_HOST=
MAIL_USER=
MAIL_PASS=
MAIL_FROM=
MAIL_PORT=
```

### Frontend (.env)

```bash
REACT_APP_BACKEND_URL=
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
```

## Common Development Patterns

### Service Pattern

Business logic is organized in service classes under `backend/src/services/[Domain]/[Action]Service.ts`:
- `CreateService.ts` - Create entity
- `UpdateService.ts` - Update entity
- `DeleteService.ts` - Delete entity
- `ShowService.ts` - Get single entity
- `ListService.ts` - Get paginated list
- `FindService.ts` - Find with specific criteria

### Controller Pattern

Controllers are thin wrappers that:
1. Extract request parameters
2. Call appropriate service(s)
3. Return formatted response

### Authentication

JWT-based authentication with refresh tokens:
- Access token in request headers
- Refresh token in HTTP-only cookies
- `tokenVersion` field in User model for token revocation

### Authorization

Role-based access control:
- User profiles: `admin`, `user`, `supervisor`
- `super` flag for super admin access
- Middleware: `isAuth` for authentication check

## Important Notes

- **Force Install:** The project requires `npm install --force` due to dependency conflicts
- **Legacy OpenSSL:** Frontend requires `NODE_OPTIONS=--openssl-legacy-provider` due to React Scripts 3.x
- **Sequential Migrations:** Always run `db:migrate` twice during deployment
- **Cron Jobs:** A cron job runs every minute for ticket transfer queue processing
- **Session Initialization:** On server start, all WhatsApp sessions are initialized before queue processing begins
- **Group Message Support:** Messages to groups (number length > 13 digits) skip contact validation
