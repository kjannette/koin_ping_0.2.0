package services

import (
	"context"
	"fmt"
	"log"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
	"github.com/kjannette/koin-ping/backend-go/internal/notifications"
	"github.com/kjannette/koin-ping/backend-go/internal/protocols/ethereum"
	"github.com/kjannette/koin-ping/backend-go/internal/wei"
)

type EvaluatorService struct {
	eth          ethereum.EthereumObserver
	alertRules   *models.AlertRuleModel
	alertEvents  *models.AlertEventModel
	addresses    *models.AddressModel
	notifConfigs *models.NotificationConfigModel
	resendAPIKey string
	emailFrom    string
}

func NewEvaluatorService(
	eth ethereum.EthereumObserver,
	alertRules *models.AlertRuleModel,
	alertEvents *models.AlertEventModel,
	addresses *models.AddressModel,
	notifConfigs *models.NotificationConfigModel,
	resendAPIKey string,
	emailFrom string,
) *EvaluatorService {
	return &EvaluatorService{
		eth:          eth,
		alertRules:   alertRules,
		alertEvents:  alertEvents,
		addresses:    addresses,
		notifConfigs: notifConfigs,
		resendAPIKey: resendAPIKey,
		emailFrom:    emailFrom,
	}
}

func (s *EvaluatorService) Evaluate(ctx context.Context, observations []domain.ObservedTx) (int, error) {
	alertsFired := 0

	for _, obs := range observations {
		fired, err := s.evaluateObservation(ctx, obs)
		if err != nil {
			log.Printf("Error evaluating observation for address ID %d: %v", obs.AddressID, err)
			continue
		}
		alertsFired += fired
	}

	return alertsFired, nil
}

func (s *EvaluatorService) evaluateObservation(ctx context.Context, obs domain.ObservedTx) (int, error) {
	rules, err := s.alertRules.ListByAddress(ctx, obs.AddressID)
	if err != nil {
		return 0, err
	}

	alertsFired := 0
	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		matches, err := s.ruleMatches(ctx, rule, obs)
		if err != nil {
			log.Printf("Error matching rule %d: %v", rule.ID, err)
			continue
		}

		if matches {
			if err := s.fireAlert(ctx, rule, obs); err != nil {
				log.Printf("Error firing alert for rule %d: %v", rule.ID, err)
				continue
			}
			alertsFired++
		}
	}

	return alertsFired, nil
}

func (s *EvaluatorService) ruleMatches(ctx context.Context, rule domain.AlertRule, obs domain.ObservedTx) (bool, error) {
	switch rule.Type {
	case domain.AlertIncomingTx:
		return obs.Direction == domain.DirectionIncoming, nil
	case domain.AlertOutgoingTx:
		return obs.Direction == domain.DirectionOutgoing, nil
	case domain.AlertLargeTransfer:
		return s.matchesLargeTransfer(rule, obs)
	case domain.AlertBalanceBelow:
		return s.matchesBalanceBelow(ctx, rule, obs)
	default:
		log.Printf("Unknown rule type: %s", rule.Type)
		return false, nil
	}
}

func (s *EvaluatorService) matchesLargeTransfer(rule domain.AlertRule, obs domain.ObservedTx) (bool, error) {
	if rule.Threshold == nil {
		return false, nil
	}

	thresholdWei, err := wei.FromEth(*rule.Threshold)
	if err != nil {
		return false, err
	}

	return wei.GreaterThanOrEqual(obs.Value, thresholdWei)
}

// matchesBalanceBelow only triggers after outgoing transactions, since incoming
// transactions increase balance and can't cause it to drop below threshold.
func (s *EvaluatorService) matchesBalanceBelow(ctx context.Context, rule domain.AlertRule, obs domain.ObservedTx) (bool, error) {
	if rule.Threshold == nil {
		return false, nil
	}

	if obs.Direction != domain.DirectionOutgoing {
		return false, nil
	}

	addr, err := s.addresses.FindByID(ctx, obs.AddressID, nil)
	if err != nil {
		return false, err
	}
	if addr == nil {
		log.Printf("Address ID %d not found", obs.AddressID)
		return false, nil
	}

	balanceWei, err := s.eth.GetBalance(ctx, addr.Address)
	if err != nil {
		return false, err
	}

	thresholdWei, err := wei.FromEth(*rule.Threshold)
	if err != nil {
		return false, err
	}

	return wei.LessThan(balanceWei, thresholdWei)
}

func (s *EvaluatorService) fireAlert(ctx context.Context, rule domain.AlertRule, obs domain.ObservedTx) error {
	addr, err := s.addresses.FindByID(ctx, obs.AddressID, nil)
	if err != nil {
		return err
	}

	addressLabel := "Unknown"
	if addr != nil {
		if addr.Label != nil {
			addressLabel = *addr.Label
		} else {
			addressLabel = addr.Address
		}
	}

	message := s.buildMessage(rule, obs)
	txHash := &obs.Hash

	_, err = s.alertEvents.Create(ctx, rule.ID, message, &addressLabel, txHash)
	if err != nil {
		return err
	}

	log.Printf("[ALERT FIRED] Rule %d (%s) - %s - TX: %s", rule.ID, rule.Type, message, obs.Hash)

	// Send Discord notification (non-fatal on failure)
	if addr != nil {
		go func() {
			s.sendNotification(
				ctx, addr.UserID, message, obs, addressLabel, rule, addr.Address,
			)
		}()
	}

	return nil
}

func (s *EvaluatorService) sendNotification(ctx context.Context, userID, message string, obs domain.ObservedTx, addressLabel string, rule domain.AlertRule, address string) {
	notifConfig, err := s.notifConfigs.GetConfig(ctx, userID)
	if err != nil {
		log.Printf("Failed to get notification config: %v", err)
		return
	}

	if notifConfig == nil || !notifConfig.NotificationEnabled {
		return
	}

	meta := notifications.AlertMetadata{
		TxHash:       obs.Hash,
		AddressLabel: addressLabel,
		AlertType:    string(rule.Type),
		Address:      address,
	}

	if notifConfig.DiscordWebhookURL != nil && *notifConfig.DiscordWebhookURL != "" {
		sent, sendErr := notifications.SendDiscordNotification(*notifConfig.DiscordWebhookURL, message, meta)
		if sendErr != nil || !sent {
			log.Printf("Discord notification failed for user %s: %v", userID, sendErr)
		} else {
			log.Printf("Discord notification sent to user %s", userID)
		}
	}

	if notifConfig.TelegramBotToken != nil && *notifConfig.TelegramBotToken != "" &&
		notifConfig.TelegramChatID != nil && *notifConfig.TelegramChatID != "" {
		sent, sendErr := notifications.SendTelegramNotification(
			*notifConfig.TelegramBotToken, *notifConfig.TelegramChatID, message, meta,
		)
		if sendErr != nil || !sent {
			log.Printf("Telegram notification failed for user %s: %v", userID, sendErr)
		} else {
			log.Printf("Telegram notification sent to user %s", userID)
		}
	}

	if notifConfig.SlackWebhookURL != nil && *notifConfig.SlackWebhookURL != "" {
		sent, sendErr := notifications.SendSlackNotification(*notifConfig.SlackWebhookURL, message, meta)
		if sendErr != nil || !sent {
			log.Printf("Slack notification failed for user %s: %v", userID, sendErr)
		} else {
			log.Printf("Slack notification sent to user %s", userID)
		}
	}

	if notifConfig.Email != nil && *notifConfig.Email != "" {
		sent, sendErr := notifications.SendEmailNotification(
			s.resendAPIKey, s.emailFrom, *notifConfig.Email, message, meta,
		)
		if sendErr != nil || !sent {
			log.Printf("Email notification failed for user %s: %v", userID, sendErr)
		} else {
			log.Printf("Email notification sent to user %s", userID)
		}
	}
}

func (s *EvaluatorService) buildMessage(rule domain.AlertRule, obs domain.ObservedTx) string {
	switch rule.Type {
	case domain.AlertIncomingTx:
		ethStr, _ := wei.FormatAsEth(obs.Value, 4)
		return fmt.Sprintf("Incoming transaction: %s received", ethStr)
	case domain.AlertOutgoingTx:
		ethStr, _ := wei.FormatAsEth(obs.Value, 4)
		return fmt.Sprintf("Outgoing transaction: %s sent", ethStr)
	case domain.AlertLargeTransfer:
		ethStr, _ := wei.FormatAsEth(obs.Value, 4)
		threshold := float64(0)
		if rule.Threshold != nil {
			threshold = *rule.Threshold
		}
		return fmt.Sprintf("Large transfer detected: %s (threshold: %g ETH)", ethStr, threshold)
	case domain.AlertBalanceBelow:
		threshold := float64(0)
		if rule.Threshold != nil {
			threshold = *rule.Threshold
		}
		return fmt.Sprintf("Balance dropped below threshold of %g ETH", threshold)
	default:
		return "Alert triggered"
	}
}
