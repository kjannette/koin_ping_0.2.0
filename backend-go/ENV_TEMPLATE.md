# Environment Variables Template

Copy this to `.env` in the backend directory and fill in your values.

```bash
# Server Configuration
PORT=3001
API_BASE_PATH=/v1
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/koin_ping

# Ethereum JSON-RPC Endpoint
# Examples:
#   - Infura: https://mainnet.infura.io/v3/YOUR-PROJECT-ID
#   - Alchemy: https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
#   - Local node: http://localhost:8545
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID

# Polling interval in milliseconds
# Default: 60000 (1 minute)
POLL_INTERVAL_MS=60000

# Firebase Configuration (for authentication)
# Get this from Firebase Console > Project Settings > Project ID
FIREBASE_PROJECT_ID=koin-ping
```

## Quick Setup

```bash
cd backend
cp ENV_TEMPLATE.md .env
# Edit .env with your actual values
```

## Firebase Setup

For Firebase Admin SDK to work, you need to set up Application Default Credentials:

**Option 1: Use Firebase Project ID (easiest for development)**
- Just set `FIREBASE_PROJECT_ID` in .env
- Firebase Admin will use Application Default Credentials

**Option 2: Use Service Account Key (production)**
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Either:
   - Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json` in .env
   - Or keep it in backend/ and add to .gitignore
