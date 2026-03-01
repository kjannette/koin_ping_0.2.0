# syntax=docker/dockerfile:1

# golang:1.24-alpine, 2025-02-28
FROM golang:1.24-alpine@sha256:8bee1901f1e530bfb4a7850aa7a479d17ae3a18beb6e09064ed54cfd245b7191

# Install system dependencies: Node.js, npm, make, git
RUN apk add --no-cache nodejs npm make git

# Install golangci-lint at a pinned commit hash
# golangci-lint v2.10.1 (2025-02-17), commit 5d1e709b7be35cb2025444e19de266b056b7b7ee
RUN GOBIN=/usr/local/bin go install \
    github.com/golangci/golangci-lint/cmd/golangci-lint@5d1e709b7be35cb2025444e19de266b056b7b7ee

WORKDIR /app

COPY . .

# Install frontend dependencies
RUN cd frontend && npm ci

# Run all checks — build fails if the branch is not green
RUN make check
