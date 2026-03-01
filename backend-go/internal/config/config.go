// Package config loads environment-based configuration.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	// defaultPort is the default HTTP server port.
	defaultPort = 3001
	// defaultDBPort is the default PostgreSQL port.
	defaultDBPort = 5432
	// defaultPollIntervalMS is the default poller interval in milliseconds.
	defaultPollIntervalMS = 60000
	// minPollIntervalMS is the minimum allowed poller interval.
	minPollIntervalMS = 1000
)

// Config holds application configuration.
type Config struct {
	Port              int
	APIBasePath       string
	DatabaseURL       string
	DBHost            string
	DBPort            int
	DBUser            string
	DBPassword        string
	DBName            string
	FirebaseProjectID string
	EthRPCURL         string
	PollIntervalMS    int
	NodeEnv           string
}

// Load reads configuration from environment variables and returns a Config.
func Load() (*Config, error) {
	cfg := &Config{
		Port:              getEnvInt("PORT", defaultPort),
		APIBasePath:       getEnv("API_BASE_PATH", "/v1"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnvInt("DB_PORT", defaultDBPort),
		DBUser:            os.Getenv("DB_USER"),
		DBPassword:        os.Getenv("DB_PASSWORD"),
		DBName:            os.Getenv("DB_NAME"),
		FirebaseProjectID: os.Getenv("FIREBASE_PROJECT_ID"),
		EthRPCURL:         os.Getenv("ETH_RPC_URL"),
		PollIntervalMS:    getEnvInt("POLL_INTERVAL_MS", defaultPollIntervalMS),
		NodeEnv:           getEnv("NODE_ENV", "development"),
	}

	if cfg.PollIntervalMS < minPollIntervalMS {
		return nil, fmt.Errorf("POLL_INTERVAL_MS must be >= 1000, got %d", cfg.PollIntervalMS) //nolint:err113
	}

	return cfg, nil
}

// DSN returns the PostgreSQL data source name for the configured database.
func (c *Config) DSN() string {
	if c.DatabaseURL != "" {
		// pgx defaults to sslmode=prefer, which fails against local Postgres.
		// Append sslmode=disable if not already specified.
		if !strings.Contains(c.DatabaseURL, "sslmode=") {
			sep := "?"
			if strings.Contains(c.DatabaseURL, "?") {
				sep = "&"
			}

			return c.DatabaseURL + sep + "sslmode=disable"
		}

		return c.DatabaseURL
	}

	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName,
	)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}

	return fallback
}
