package notifications

import (
	"strings"
	"testing"
)

func TestSMTPConfig_IsConfigured(t *testing.T) {
	tests := []struct {
		name string
		cfg  SMTPConfig
		want bool
	}{
		{"fully configured", SMTPConfig{Host: "smtp.example.com", Port: 587, From: "noreply@example.com"}, true},
		{"missing host", SMTPConfig{Port: 587, From: "noreply@example.com"}, false},
		{"missing from", SMTPConfig{Host: "smtp.example.com", Port: 587}, false},
		{"empty", SMTPConfig{}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.cfg.IsConfigured(); got != tt.want {
				t.Errorf("IsConfigured() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSMTPConfig_Addr(t *testing.T) {
	cfg := SMTPConfig{Host: "smtp.example.com", Port: 587}
	if got := cfg.addr(); got != "smtp.example.com:587" {
		t.Errorf("addr() = %q, want %q", got, "smtp.example.com:587")
	}
}

func TestBuildEmailBody(t *testing.T) {
	meta := AlertMetadata{
		TxHash:       "0xabc123",
		AddressLabel: "Treasury",
		AlertType:    "incoming_tx",
		Address:      "0x1234567890abcdef1234567890abcdef12345678",
	}

	body := buildEmailBody("Incoming transaction: 5.5 ETH received", meta)

	if !strings.Contains(body, "Koin Ping Alert") {
		t.Error("body should contain title")
	}
	if !strings.Contains(body, "Incoming transaction: 5.5 ETH received") {
		t.Error("body should contain message")
	}
	if !strings.Contains(body, "Treasury") {
		t.Error("body should contain address label")
	}
	if !strings.Contains(body, "0x1234567890abcdef") {
		t.Error("body should contain blockchain address")
	}
	if !strings.Contains(body, "etherscan.io/tx/0xabc123") {
		t.Error("body should contain etherscan link")
	}
}

func TestBuildEmailBody_NoTxHash(t *testing.T) {
	meta := AlertMetadata{
		AddressLabel: "Cold Storage",
		AlertType:    "balance_below",
		Address:      "0xabcdef",
	}

	body := buildEmailBody("Balance dropped below threshold", meta)

	if strings.Contains(body, "etherscan.io") {
		t.Error("body should not contain etherscan link when no tx hash")
	}
}

func TestHumanAlertType(t *testing.T) {
	tests := map[string]string{
		"incoming_tx":    "Incoming Transaction",
		"outgoing_tx":    "Outgoing Transaction",
		"large_transfer": "Large Transfer",
		"balance_below":  "Balance Below Threshold",
		"unknown":        "Alert",
		"test":           "Alert",
	}
	for alertType, want := range tests {
		if got := humanAlertType(alertType); got != want {
			t.Errorf("humanAlertType(%q) = %q, want %q", alertType, got, want)
		}
	}
}

func TestSendEmailNotification_NotConfigured(t *testing.T) {
	cfg := SMTPConfig{}
	sent, err := SendEmailNotification(cfg, "user@example.com", "test", AlertMetadata{})
	if err == nil {
		t.Fatal("expected error for unconfigured SMTP")
	}
	if sent {
		t.Fatal("expected sent to be false")
	}
}
