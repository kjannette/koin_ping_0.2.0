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
cp backend/.env.example backend/.env
# edit backend/.env with your DATABASE_URL, FIREBASE_PROJECT_ID, ETH_RPC_URL

# Run checks (requires golangci-lint)
make check

# Start the API server
make run

# Start the poller (separate terminal)
cd backend && go run ./cmd/poller

# Start the frontend dev server (separate terminal)
cd frontend && npm run dev
```

The API listens on `http://localhost:3001` and the frontend on
`http://localhost:3000` by default for development.

## Rationale

Crypto users may actively monitor addresses with webhooks integrating popular 
messaging platforms: Discord, Slack, Telegram.
This lightweight, reliable framework makes instant awareness of on-chain 
activity trivial, without polling block explorers manually. Koin Ping watches 
addresses, evaluates configurable alert rules (incoming transactions, outgoing 
transactions, "large" transfers, balance thresholds), and sends notifications.

## Design

The system is split into two independently deployable processes and one
frontend:

```
koin_ping_0.2.0/
├── backend/                # Go monorepo root
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

## Setting Up Your Alert Platforms

Koin Ping can send real-time alerts to **Telegram**, **Discord**, **Slack**, and **Email**. Each channel is configured per-user through the **Notification Settings** panel on the Alerts page.

Below are step-by-step guides for setting up each platform.

---

### Telegram

To receive alerts via Telegram, you need to create a bot and get your chat ID.

#### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather** (look for the blue verified checkmark).
2. Open the conversation with BotFather and send: `/newbot`
3. BotFather will ask for a **display name** — enter something like `Koin Ping Alerts`.
4. BotFather will ask for a **username** — it must end in `bot`, e.g. `MyKoinPingBot`.
5. BotFather will reply with your **Bot Token** — a string that looks like `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`. Copy it.

#### 2. Get Your Chat ID

1. In Telegram, search for the bot username you just created and open the chat.
2. Tap **Start** or send any message (e.g. `hello`).
3. Open the following URL in your browser, replacing `YOUR_BOT_TOKEN` with the token from step 1:

   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```

4. In the JSON response, find the `"chat"` object — the `"id"` field is your **Chat ID** (a numeric value).

   > **Tip:** If the `'result"` array is empty, make sure you sent a message to your bot first, then refresh the page.

#### 3. Save in Koin Ping

1. Go to the **Alerts** page in Koin Ping.
2. In the **Notification Settings** panel, find the **Telegram** section.
3. Paste your **Bot Token** and **Chat ID** into the corresponding fields.
4. Click **Save Settings**.
5. Click **Test All Channels** to verify — you should receive a test message from your bot in Telegram.

---

*Guides for Discord, Slack, and Email coming soon.*

## License

MIT. See [LICENSE](LICENSE).

## Author

Steven Jannette


