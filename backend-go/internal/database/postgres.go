// Package database manages PostgreSQL connection pools.
package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	// maxConnIdleSeconds is the maximum idle time for a connection.
	maxConnIdleSeconds = 30
	// maxConnLifetimeMinutes is the maximum lifetime for a connection.
	maxConnLifetimeMinutes = 5
	// connectTimeoutSeconds is the timeout for initial connection.
	connectTimeoutSeconds = 10
	// maxConns is the maximum number of connections in the pool.
	maxConns = 20
	// minConns is the minimum number of connections in the pool.
	minConns = 2
)

var pool *pgxpool.Pool //nolint:gochecknoglobals

// Connect establishes a PostgreSQL connection pool using the given DSN.
func Connect(dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	cfg.MaxConns = maxConns
	cfg.MinConns = minConns
	cfg.MaxConnIdleTime = maxConnIdleSeconds * time.Second
	cfg.MaxConnLifetime = maxConnLifetimeMinutes * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), connectTimeoutSeconds*time.Second)
	defer cancel()

	p, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := p.Ping(ctx); err != nil {
		p.Close()

		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Println("Connected to PostgreSQL database")
	pool = p

	return p, nil
}

// Pool returns the global connection pool.
func Pool() *pgxpool.Pool {
	return pool
}

// Close closes the global connection pool.
func Close() {
	if pool != nil {
		pool.Close()
		log.Println("Database connection pool closed")
	}
}
