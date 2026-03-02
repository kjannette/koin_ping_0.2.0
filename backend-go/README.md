Start DB:

brew services start postgresql@15


From the backend-go directory, you have a few options:

Option 1: Single command (both API + poller)
cd /Users/kjannette/workspace/koin_ping_0.2.0/backend-gomake dev-all

Option 2: Two separate terminals
Terminal 1 (API server):
cd /Users/kjannette/workspace/koin_ping_0.2.0/backend-gogo run ./cmd/api
Terminal 2 (Poller):
cd /Users/kjannette/workspace/koin_ping_0.2.0/backend-gogo run ./cmd/poller