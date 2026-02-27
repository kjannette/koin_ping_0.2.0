package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

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

	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:           getEnvInt("PORT", 3001),
		APIBasePath:    getEnv("API_BASE_PATH", "/v1"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnvInt("DB_PORT", 5432),
		DBUser:         os.Getenv("DB_USER"),
		DBPassword:     os.Getenv("DB_PASSWORD"),
		DBName:         os.Getenv("DB_NAME"),
		FirebaseProjectID: os.Getenv("FIREBASE_PROJECT_ID"),
		EthRPCURL:      os.Getenv("ETH_RPC_URL"),
		PollIntervalMS: getEnvInt("POLL_INTERVAL_MS", 60000),
		NodeEnv:        getEnv("NODE_ENV", "development"),

		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     getEnvInt("SMTP_PORT", 587),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:     os.Getenv("SMTP_FROM"),
	}

	if cfg.PollIntervalMS < 1000 {
		return nil, fmt.Errorf("POLL_INTERVAL_MS must be >= 1000, got %d", cfg.PollIntervalMS)
	}

	return cfg, nil
}

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
