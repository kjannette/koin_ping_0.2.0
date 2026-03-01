.PHONY: test lint fmt fmt-check check docker hooks build run dev clean \
        test-go test-js lint-go lint-js fmt-go fmt-js fmt-check-go fmt-check-js \
        build-go build-js

GODIR    := backend-go
JSDIR    := frontend
PRETTIER := $(JSDIR)/node_modules/.bin/prettier

# ── required targets ────────────────────────────────────────────

all: check

check: test lint fmt-check

test: test-go test-js

lint: lint-go lint-js

fmt: fmt-go fmt-js

fmt-check: fmt-check-go fmt-check-js

# ── go ──────────────────────────────────────────────────────────

test-go:
	cd $(GODIR) && go test -timeout 30s ./...

lint-go:
	cd $(GODIR) && golangci-lint run ./...

fmt-go:
	cd $(GODIR) && gofmt -w .

fmt-check-go:
	@diff=$$(cd $(GODIR) && gofmt -l .); \
	if [ -n "$$diff" ]; then \
		echo "Go files need formatting:"; \
		echo "$$diff"; \
		exit 1; \
	fi

# ── js / frontend ───────────────────────────────────────────────

test-js:
	cd $(JSDIR) && npm test

lint-js:
	$(PRETTIER) --check '**/*.{js,jsx,ts,tsx,css,md,json}'

fmt-js:
	$(PRETTIER) --write '**/*.{js,jsx,ts,tsx,css,md,json}'

fmt-check-js:
	$(PRETTIER) --check '**/*.{js,jsx,ts,tsx,css,md,json}'

# ── build ───────────────────────────────────────────────────────

build: build-go build-js

build-go:
	cd $(GODIR) && go build -o bin/api ./cmd/api
	cd $(GODIR) && go build -o bin/poller ./cmd/poller

build-js:
	cd $(JSDIR) && npm run build

# ── dev / run ───────────────────────────────────────────────────

run:
	cd $(GODIR) && go run ./cmd/api

dev:
	cd $(GODIR) && go run ./cmd/api

# ── docker ──────────────────────────────────────────────────────

docker:
	docker build -t koin-ping .

# ── hooks ───────────────────────────────────────────────────────

hooks:
	printf '#!/bin/sh\nmake check\n' > .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

# ── clean ───────────────────────────────────────────────────────

clean:
	rm -rf $(GODIR)/bin/
	rm -rf $(JSDIR)/dist/
