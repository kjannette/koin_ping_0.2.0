package domain

import "testing"

func TestIsValidAlertType(t *testing.T) {
	valid := []string{"incoming_tx", "outgoing_tx", "large_transfer", "balance_below"}
	for _, v := range valid {
		if !IsValidAlertType(v) {
			t.Errorf("IsValidAlertType(%q) = false, want true", v)
		}
	}

	invalid := []string{"", "invalid", "INCOMING_TX", "send", "receive"}
	for _, v := range invalid {
		if IsValidAlertType(v) {
			t.Errorf("IsValidAlertType(%q) = true, want false", v)
		}
	}
}

func TestIsThresholdRequired(t *testing.T) {
	required := []AlertType{AlertLargeTransfer, AlertBalanceBelow}
	for _, at := range required {
		if !IsThresholdRequired(at) {
			t.Errorf("IsThresholdRequired(%q) = false, want true", at)
		}
	}

	notRequired := []AlertType{AlertIncomingTx, AlertOutgoingTx}
	for _, at := range notRequired {
		if IsThresholdRequired(at) {
			t.Errorf("IsThresholdRequired(%q) = true, want false", at)
		}
	}
}
