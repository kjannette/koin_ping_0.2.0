# Koin Ping

A lightweight on-chain monitoring and alerting system designed to give users situational awareness over blockchain addresses they care about.

## Overview

Koin Ping is designed to reliably observe on-chain activity and notify users when predefined conditions are met. It does not execute transactions, manage wallets, or speculate on prices.

## Project Structure

```
koin_ping/
├── backend/                  # Node.js + Express + PostgreSQL backend
│   ├── api/                 # API endpoints and server configuration
│   ├── poller/              # Blockchain polling logic
│   ├── alerts/              # Alert evaluation and management
│   ├── notifications/       # Notification delivery system
│   ├── domain/              # Domain models and business logic
│   ├── infra/               # Infrastructure (database, external services)
│   └── shared/              # Shared utilities and helpers
│
└── frontend/                 # React + Vite frontend
    ├── public/              # Static assets
    └── src/
        ├── api/             # Frontend API calls to backend
        ├── components/      # Reusable UI components
        ├── pages/           # Top-level pages (views)
        └── utils/           # Utility functions

```

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL
- **Key Dependencies:** 
  - `pg` - PostgreSQL client
  - `dotenv` - Environment variable management
  - `cors` - CORS middleware
  - `nodemon` - Development auto-reload

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** JavaScript/TypeScript (mixed)
- **Type Checking:** TypeScript

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (already done):
   ```bash
   npm install
   ```

3. Create a `.env` file (see backend/README.md for required variables)

4. Start the development server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`
