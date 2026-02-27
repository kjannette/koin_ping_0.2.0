# Database Setup

## Prerequisites

- PostgreSQL installed locally
- Database created (e.g., `koin_ping_dev`)

## Setup Steps

### 1. Create Database

```bash
# Using psql
createdb koin_ping_dev

# Or via psql command line
psql -U postgres
CREATE DATABASE koin_ping_dev;
\q
```

### 2. Set Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/koin_ping_dev
```

Or if using individual variables (for `infra/database.js`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=koin_ping_dev
```

### 3. Run Schema

```bash
# From the backend 
psql -d koin_ping_dev -f db/schema.sql

# Or the full connection string
psql postgresql://your_user:your_password@localhost:5432/koin_ping_dev -f db/schema.sql
```

### 4. Verify Tables

```bash
psql -d koin_ping_dev

# In psql:
\dt                    # List tables
\d addresses          # Describe addresses table
\d alert_rules        # Describe alert_rules table
\d alert_events       # Describe alert_events table
```

## Tables

### addresses
- `id` - Primary key
- `address` - Ethereum address (unique)
- `label` - Optional display name
- `created_at` - Timestamp

### alert_rules
- `id` - Primary key
- `address_id` - Foreign key to addresses
- `type` - Alert type: `incoming_tx`, `outgoing_tx`, `large_transfer`, `balance_below`
- `threshold` - ETH amount (nullable)
- `enabled` - Active status
- `created_at` - Timestamp

### alert_events
- `id` - Primary key
- `alert_rule_id` - Foreign key to alert_rules
- `message` - Alert description
- `address_label` - Denormalized label for display
- `timestamp` - When alert fired

## Reset Database

To start fresh:

```bash
psql -d koin_ping_dev -f db/schema.sql
```

The schema includes `DROP TABLE IF EXISTS` statements for clean reruns.

