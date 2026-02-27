package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

func Connect(dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnIdleTime = 30 * time.Second
	cfg.MaxConnLifetime = 5 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
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
