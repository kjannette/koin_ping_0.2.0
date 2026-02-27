package notifications

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func (c *SMTPConfig) IsConfigured() bool {
	return c.Host != "" && c.From != ""
}

func (c *SMTPConfig) addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func SendEmailNotification(cfg SMTPConfig, toEmail, message string, meta AlertMetadata) (bool, error) {
	if !cfg.IsConfigured() {
		return false, fmt.Errorf("SMTP is not configured")
	}

	subject := fmt.Sprintf("Koin Ping Alert: %s", humanAlertType(meta.AlertType))

	body := buildEmailBody(message, meta)

	msg := strings.Join([]string{
		fmt.Sprintf("From: %s", cfg.From),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	var auth smtp.Auth
	if cfg.Username != "" {
		auth = smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	}

	err := smtp.SendMail(cfg.addr(), auth, cfg.From, []string{toEmail}, []byte(msg))
	if err != nil {
		log.Printf("Failed to send email notification to %s: %v", toEmail, err)
		return false, err
	}

	return true, nil
}

func TestEmailNotification(cfg SMTPConfig, toEmail string) (bool, error) {
	meta := AlertMetadata{AlertType: "test"}
	return SendEmailNotification(cfg, toEmail,
		"This is a test notification from Koin Ping. Your email is configured correctly!", meta)
}

func buildEmailBody(message string, meta AlertMetadata) string {
	txSection := ""
	if meta.TxHash != "" {
		txSection = fmt.Sprintf(
			`<tr><td style="padding:8px 0;color:#666">Transaction</td>`+
				`<td style="padding:8px 0"><a href="https://etherscan.io/tx/%s" style="color:#4f46e5">View on Etherscan</a></td></tr>`,
			meta.TxHash,
		)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#4f46e5;padding:20px 24px">
      <h1 style="margin:0;color:#fff;font-size:18px">Koin Ping Alert</h1>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;font-size:15px;color:#333">%s</p>
      <table style="width:100%%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#666">Address</td><td style="padding:8px 0">%s</td></tr>
        <tr><td style="padding:8px 0;color:#666">Blockchain Address</td><td style="padding:8px 0;font-family:monospace;font-size:12px">%s</td></tr>
        %s
      </table>
    </div>
    <div style="padding:16px 24px;background:#fafafa;font-size:12px;color:#999;text-align:center">
      Sent by Koin Ping
    </div>
  </div>
</body>
</html>`, message, meta.AddressLabel, meta.Address, txSection)
}

func humanAlertType(alertType string) string {
	switch alertType {
	case "incoming_tx":
		return "Incoming Transaction"
	case "outgoing_tx":
		return "Outgoing Transaction"
	case "large_transfer":
		return "Large Transfer"
	case "balance_below":
		return "Balance Below Threshold"
	default:
		return "Alert"
	}
}
