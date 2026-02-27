.PHONY: build build-api build-poller run dev poller poller-dev dev-all clean tidy

# Build both binaries
build: build-api build-poller

build-api:
	go build -o bin/api ./cmd/api

build-poller:
	go build -o bin/poller ./cmd/poller

# Run API server
run: build-api
	./bin/api

# Run API server with auto-reload (requires air: go install github.com/air-verse/air@latest)
dev:
	air -c .air.api.toml 2>/dev/null || go run ./cmd/api

# Run poller
poller: build-poller
	./bin/poller

poller-dev:
	air -c .air.poller.toml 2>/dev/null || go run ./cmd/poller

# Run both API and poller concurrently
dev-all:
	@echo "Starting API and Poller..."
	@(go run ./cmd/api &) && go run ./cmd/poller

clean:
	rm -rf bin/

tidy:
	go mod tidy

# Database setup
db-setup:
	psql -d koin_ping_dev -f infra/schema.sql

vet:
	go vet ./...
