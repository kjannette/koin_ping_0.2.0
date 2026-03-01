# Koin Ping
A lightweight on-chain monitoring and alerting system designed to give users situational awareness over blockchain addresses they care about.

# Overview
Koin Ping observes on-chain activity and notifies users when predefined conditions are met. It does not execute transactions, manage wallets, or speculate on prices.

## Getting Started

### Prerequisites

- Go 1.24+
- Node.js 18+ and npm (or yarn — preferred per repo policy)
- PostgreSQL 15+
- `golangci-lint` v2 (for `make lint`)

### Setup

```bash
# Clone and enter the repo
git clone <repo-url>
cd koin_ping_0.2.0

# Install pre-commit hook
make hooks

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy and fill in environment variables
cp backend-go/.env.example backend-go/.env
# edit backend-go/.env with your DATABASE_URL, FIREBASE_PROJECT_ID, ETH_RPC_URL

# Run checks (requires golangci-lint)
make check

# Start the API server
make run

# Start the poller (separate terminal)
cd backend-go && go run ./cmd/poller

# Start the frontend dev server (separate terminal)
cd frontend && npm run dev
```

The API listens on `http://localhost:3001` and the frontend on
`http://localhost:3000` by default.

## Rationale

Crypto users who hold or actively monitor addresses need a lightweight, reliable
way to know when on-chain activity occurs without polling block explorers
manually. Koin Ping fills that gap: it watches a set of Ethereum addresses,
evaluates configurable alert rules (incoming transactions, outgoing
transactions, large transfers, balance thresholds), and notifies the user
through Discord webhooks.

## Design

The system is split into two independently deployable processes and one
frontend:

```
koin_ping_0.2.0/
├── backend-go/                # Go monorepo root
│   ├── cmd/api/               # HTTP REST API server
│   ├── cmd/poller/            # Blockchain polling daemon
│   └── internal/
│       ├── config/            # Environment-based config loading
│       ├── database/          # pgx connection pool
│       ├── domain/            # Shared domain types
│       ├── firebase/          # Firebase auth client
│       ├── handlers/          # HTTP handler wiring
│       ├── middleware/         # Auth middleware
│       ├── models/            # SQL persistence layer
│       ├── notifications/     # Discord webhook delivery
│       ├── protocols/ethereum/ # Ethereum JSON-RPC client
│       ├── services/          # Observer and evaluator business logic
│       └── wei/               # ETH/Wei conversion utilities
└── frontend/                  # React + Vite SPA
    └── src/
        ├── api/               # Fetch wrappers for the REST API
        ├── components/        # Reusable UI components
        ├── contexts/          # React contexts (auth, etc.)
        ├── firebase/          # Firebase SDK initialization
        └── pages/             # Top-level route pages
```

**API server** (`cmd/api`): standard-library `net/http` with Firebase JWT
authentication middleware. Exposes CRUD endpoints for addresses, alert rules,
alert events, and notification configuration.

**Poller** (`cmd/poller`): long-running daemon that polls Ethereum via JSON-RPC,
compares observed transactions against persisted alert rules, fires alert events
to the database, and dispatches Discord notifications.

**Frontend** (`frontend/`): React 19 SPA built with Vite. Authenticates with
Firebase, communicates with the API via fetch, and renders the address/alert
management UI.

## License

MIT. See [LICENSE](LICENSE).

## Author

Steven Jannette
