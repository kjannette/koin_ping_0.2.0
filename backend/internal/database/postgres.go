package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (

	maxConnIdleSeconds = 30

	maxConnLifetimeMinutes = 5

	connectTimeoutSeconds = 10

	maxConns = 20

	minConns = 2
)

var pool *pgxpool.Pool //nolint:gochecknoglobals

// establishPostgreSQL connection pool using the given DSN.
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

func Pool() *pgxpool.Pool {
	return pool
}

func Close() {
	if pool != nil {
		pool.Close()
		log.Println("Database connection pool closed")
	}
}
