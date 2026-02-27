# Koin Ping Backend

On-chain monitoring and alerting system backend.

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
PORT=3001
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=koin_ping

# Blockchain RPC Endpoints (examples)
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://polygon-rpc.com

# Polling Configuration
POLL_INTERVAL_MS=10000
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your `.env` file with the required environment variables

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run in production:
   ```bash
   npm start
   ```

## Project Structure

- `api/` - API endpoints and server configuration
- `poller/` - Blockchain polling logic
- `alerts/` - Alert evaluation and management
- `notifications/` - Notification delivery system
- `domain/` - Domain models and business logic
- `infra/` - Infrastructure (database, external services)
- `shared/` - Shared utilities and helpers

