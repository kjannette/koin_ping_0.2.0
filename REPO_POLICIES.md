---
title: Repository Policies
last_modified: 2026-02-22
---

This document covers repository structure, tooling, and workflow standards. Code
style conventions are in separate documents:

- [Code Styleguide](<link>)
  (general, bash, Docker)
- [Go](<link>)
- [JavaScript](<link>)
- [Python](<link>)
- [Go HTTP Server Conventions](<link>)

---

- Cross-project documentation (such as this file) must include
  `last_modified: YYYY-MM-DD` in the YAML front matter so it can be kept in sync
  with the authoritative source as policies evolve.

- **ALL external references must be pinned by cryptographic hash.** This
  includes Docker base images, Go modules, npm packages, GitHub Actions, and
  anything else fetched from a remote source. Version tags (`@v4`, `@latest`,
  `:3.21`, etc.) are server-mutable and therefore remote code execution
  vulnerabilities. The ONLY acceptable way to reference an external dependency
  is by its content hash (Docker `@sha256:...`, Go module hash in `go.sum`, npm
  integrity hash in lockfile, GitHub Actions `@<commit-sha>`). No exceptions.
  This also means never `curl | bash` to install tools like pyenv, nvm, rustup,
  etc. Instead, download a specific release archive from GitHub, verify its hash
  (hardcoded in the Dockerfile or script), and only then install. Unverified
  install scripts are arbitrary remote code execution. This is the single most
  important rule in this document. Double-check every external reference in
  every file before committing. There are zero exceptions to this rule.

- Every repo with software must have a root `Makefile` with these targets:
  `make test`, `make lint`, `make fmt` (writes), `make fmt-check` (read-only),
  `make check` (prereqs: `test`, `lint`, `fmt-check`), `make docker`, and
  `make hooks` (installs pre-commit hook). A model Makefile is at
  `(<link>)`.

- Always use Makefile targets (`make fmt`, `make test`, `make lint`, etc.)
  instead of invoking the underlying tools directly. The Makefile is the single
  source of truth for how these operations are run.

- The Makefile is authoritative documentation for how the repo is used. Beyond
  the required targets above, it should have targets for every common operation:
  running a local development server (`make run`, `make dev`), re-initializing
  or migrating the database (`make db-reset`, `make migrate`), building
  artifacts (`make build`), generating code, seeding data, or anything else a
  developer would do regularly. If someone checks out the repo and types
  `make<tab>`, they should see every meaningful operation available. A new
  contributor should be able to understand the entire development workflow by
  reading the Makefile.

- Every repo should have a `Dockerfile`. All Dockerfiles must run `make check`
  as a build step so the build fails if the branch is not green. For non-server
  repos, the Dockerfile should bring up a development environment and run
  `make check`. For server repos, `make check` should run as an early build
  stage before the final image is assembled.

- Every repo should have a Gitea Actions workflow (`.gitea/workflows/`) that
  runs `docker build .` on push. Since the Dockerfile already runs `make check`,
  a successful build implies all checks pass.

- Use platform-standard formatters: `black` for Python, `prettier` for
  JS/CSS/Markdown/HTML, `go fmt` for Go. Always use default configuration with
  two exceptions: four-space indents (except Go), and `proseWrap: always` for
  Markdown (hard-wrap at 80 columns). Documentation and writing repos (Markdown,
  HTML, CSS) should also have `.prettierrc` and `.prettierignore`.

- Pre-commit hook: `make check` if local testing is possible, otherwise
  `make lint && make fmt-check`. The Makefile should provide a `make hooks`
  target to install the pre-commit hook.

- All repos with software must have tests that run via the platform-standard
  test framework (`go test`, `pytest`, `jest`/`vitest`, etc.). If no meaningful
  tests exist yet, add the most minimal test possible — e.g. importing the
  module under test to verify it compiles/parses. There is no excuse for
  `make test` to be a no-op.

- `make test` must complete in under 20 seconds. Add a 30-second timeout in the
  Makefile.

- Docker builds must complete in under 5 minutes.

- `make check` must not modify any files in the repo. Tests may use temporary
  directories.

- `main` must always pass `make check`, no exceptions.

- Never commit secrets. `.env` files, credentials, API keys, and private keys
  must be in `.gitignore`. No exceptions.

- `.gitignore` should be comprehensive from the start: OS files (`.DS_Store`),
  editor files (`.swp`, `*~`), language build artifacts, and `node_modules/`.
  Fetch the standard `.gitignore` from
  `(<link>) when setting up
  a new repo.

- Never use `git add -A` or `git add .`. Always stage files explicitly by name.

- Never force-push to `main`.

- Make all changes on a feature branch. You can do whatever you want on a
  feature branch.

- `.golangci.yml` is standardized and must _NEVER_ be modified by an agent, only
  manually by the user. Fetch from
  `(<link>)`.

- When pinning images or packages by hash, add a comment above the reference
  with the version and date (YYYY-MM-DD).

- Use `yarn`, not `npm`.

- Write all dates as YYYY-MM-DD (ISO 8601).

- Simple projects should be configured with environment variables.

- Dockerized web services listen on port 8080 by default, overridable with
  `PORT`.

- `README.md` is the primary documentation. Required sections:
    - **Description**: First line must include the project name, purpose,
      category (web server, SPA, CLI tool, etc.), license, and author. Example:
      "µPaaS is an MIT-licensed Go web application by @sjdev that receives
      git-frontend webhooks and deploys applications via Docker in realtime."
    - **Getting Started**: Copy-pasteable install/usage code block.
    - **Rationale**: Why does this exist?
    - **Design**: How is the program structured?
    - **TODO**: Update meticulously, even between commits. When planning, put
      the todo list in the README so a new agent can pick up where the last one
      left off.
    - **License**: MIT, GPL, or WTFPL. Ask the user for new projects. Include a
      `LICENSE` file in the repo root and a License section in the README.
    - **Author**: [@sjdev](https://sjdev.co).

- First commit of a new repo should contain only `README.md`.

- Always run `go mod tidy` before committing.

- Use SemVer.

- Database migrations live in `internal/db/migrations/` and must be embedded in
  the binary.
    - `000_migration.sql` — contains ONLY the creation of the migrations
      tracking table itself. Nothing else.
    - `001_schema.sql` — the full application schema.
    - **Pre-1.0.0:** never add additional migration files (002, 003, etc.).
      There is no installed base to migrate. Edit `001_schema.sql` directly.
    - **Post-1.0.0:** add new numbered migration files for each schema change.
      Never edit existing migrations after release.

- All repos should have an `.editorconfig` enforcing the project's indentation
  settings.

- Avoid putting files in the repo root unless necessary. Root should contain
  only project-level config files (`README.md`, `Makefile`, `Dockerfile`,
  `LICENSE`, `.gitignore`, `.editorconfig`, `REPO_POLICIES.md`, and
  language-specific config). Everything else goes in a subdirectory. Canonical
  subdirectory names:
    - `bin/` — executable scripts and tools
    - `cmd/` — Go command entrypoints
    - `configs/` — configuration templates and examples
    - `deploy/` — deployment manifests (k8s, compose, terraform)
    - `docs/` — documentation and markdown (README.md stays in root)
    - `internal/` — Go internal packages
    - `internal/db/migrations/` — database migrations
    - `pkg/` — Go library packages
    - `share/` — systemd units, data files
    - `static/` — static assets (images, fonts, etc.)
    - `web/` — web frontend source

- When setting up a new repo, files from the `prompts` repo may be used as
  templates. Fetch them from
  `(<link>)<path>`.

- New repos must contain at minimum:
    - `README.md`, `.git`, `.gitignore`, `.editorconfig`
    - `LICENSE`, `REPO_POLICIES.md` (copy from the `prompts` repo)
    - `Makefile`
    - `Dockerfile`, `.dockerignore`
    - `.gitea/workflows/check.yml`
    - Go: `go.mod`, `go.sum`, `.golangci.yml`
    - JS: `package.json`, `yarn.lock`, `.prettierrc`, `.prettierignore`
    - Python: `pyproject.toml`
