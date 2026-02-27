package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	for _, key := range []string{"PORT", "API_BASE_PATH", "POLL_INTERVAL_MS", "NODE_ENV", "SMTP_PORT"} {
		os.Unsetenv(key)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != 3001 {
		t.Errorf("Port = %d, want 3001", cfg.Port)
	}
	if cfg.APIBasePath != "/v1" {
		t.Errorf("APIBasePath = %q, want /v1", cfg.APIBasePath)
	}
	if cfg.PollIntervalMS != 60000 {
		t.Errorf("PollIntervalMS = %d, want 60000", cfg.PollIntervalMS)
	}
	if cfg.NodeEnv != "development" {
		t.Errorf("NodeEnv = %q, want development", cfg.NodeEnv)
	}
	if cfg.SMTPPort != 587 {
		t.Errorf("SMTPPort = %d, want 587", cfg.SMTPPort)
	}
}

func TestLoad_InvalidPollInterval(t *testing.T) {
	os.Setenv("POLL_INTERVAL_MS", "500")
	defer os.Unsetenv("POLL_INTERVAL_MS")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for poll interval < 1000")
	}
}

func TestDSN_DatabaseURL(t *testing.T) {
	cfg := &Config{DatabaseURL: "postgres://user:pass@localhost/db"}
	dsn := cfg.DSN()
	if !strings.Contains(dsn, "sslmode=disable") {
		t.Error("DSN should append sslmode=disable")
	}
	if !strings.HasPrefix(dsn, "postgres://user:pass@localhost/db") {
		t.Error("DSN should preserve original URL")
	}
}

func TestDSN_DatabaseURL_WithSSLMode(t *testing.T) {
	cfg := &Config{DatabaseURL: "postgres://user:pass@localhost/db?sslmode=require"}
	dsn := cfg.DSN()
	if strings.Count(dsn, "sslmode=") != 1 {
		t.Error("DSN should not duplicate sslmode")
	}
}

func TestDSN_Components(t *testing.T) {
	cfg := &Config{
		DBHost:     "myhost",
		DBPort:     5433,
		DBUser:     "myuser",
		DBPassword: "mypass",
		DBName:     "mydb",
	}
	dsn := cfg.DSN()
	if !strings.Contains(dsn, "host=myhost") {
		t.Error("DSN should contain host")
	}
	if !strings.Contains(dsn, "port=5433") {
		t.Error("DSN should contain port")
	}
	if !strings.Contains(dsn, "user=myuser") {
		t.Error("DSN should contain user")
	}
	if !strings.Contains(dsn, "dbname=mydb") {
		t.Error("DSN should contain dbname")
	}
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_KEY_KOINPING", "value")
	defer os.Unsetenv("TEST_KEY_KOINPING")

	if got := getEnv("TEST_KEY_KOINPING", "fallback"); got != "value" {
		t.Errorf("got %q, want %q", got, "value")
	}
	if got := getEnv("NONEXISTENT_KEY_KOINPING", "fallback"); got != "fallback" {
		t.Errorf("got %q, want %q", got, "fallback")
	}
}

func TestGetEnvInt(t *testing.T) {
	os.Setenv("TEST_INT_KOINPING", "42")
	defer os.Unsetenv("TEST_INT_KOINPING")

	if got := getEnvInt("TEST_INT_KOINPING", 0); got != 42 {
		t.Errorf("got %d, want 42", got)
	}
	if got := getEnvInt("NONEXISTENT_INT_KOINPING", 99); got != 99 {
		t.Errorf("got %d, want 99", got)
	}

	os.Setenv("TEST_INT_KOINPING", "notanumber")
	if got := getEnvInt("TEST_INT_KOINPING", 99); got != 99 {
		t.Errorf("got %d, want 99 for invalid int", got)
	}
}
