Start DB:

brew services start postgresql@15

From the backend directory, you have a few options:

Option 1: Single command (both API + poller)
cd /Users/kjannette/workspace/koin_ping_0.2.0/backendmake dev-all

Option 2: Two separate terminals
Terminal 1 (API server):
cd /Users/kjannette/workspace/koin_ping_0.2.0/backend go run ./cmd/api
Terminal 2 (Poller):
cd /Users/kjannette/workspace/koin_ping_0.2.0/backend go run ./cmd/poller

make run — Builds and runs the API server.
make dev — Runs the API server with auto-reload via air (falls back to go run if air isn't installed).
make poller — Builds and runs the poller.
make poller-dev — Runs the poller with auto-reload.
make dev-all — Runs both the API and poller concurrently.