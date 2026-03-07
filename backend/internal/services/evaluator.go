package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"golang.org/x/sync/semaphore"

	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/models"
	"github.com/kjannette/koin-ping/backend/internal/notifications"
	"github.com/kjannette/koin-ping/backend/internal/protocols/ethereum"
	"github.com/kjannette/koin-ping/backend/internal/wei"
)

const (
	notificationTimeout    = 30 * time.Second
	notificationMaxRetries = 3
	notificationRetryBase  = time.Second
	maxConcurrentNotifications = 5
)

type EvaluatorService struct {
	eth          ethereum.EthereumObserver
	alertRules   *models.AlertRuleModel
	alertEvents  *models.AlertEventModel
	addresses    *models.AddressModel
	notifConfigs *models.NotificationConfigModel
	resendAPIKey string
	emailFrom    string
	notifSem     *semaphore.Weighted
	notifWg      sync.WaitGroup
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
		notifSem:     semaphore.NewWeighted(maxConcurrentNotifications),
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
		return s.matchesDirectionalTx(rule, obs, domain.DirectionIncoming)
	case domain.AlertOutgoingTx:
		return s.matchesDirectionalTx(rule, obs, domain.DirectionOutgoing)
	case domain.AlertLargeTransfer:
		return s.matchesLargeTransfer(rule, obs)
	case domain.AlertBalanceBelow:
		return s.matchesBalanceBelow(ctx, rule, obs)
	default:
		log.Printf("Unknown rule type: %s", rule.Type)
		return false, nil
	}
}

func (s *EvaluatorService) matchesDirectionalTx(rule domain.AlertRule, obs domain.ObservedTx, expected domain.Direction) (bool, error) {
	if obs.Direction != expected {
		return false, nil
	}

	if rule.Minimum != nil {
		minWei, err := wei.FromEth(*rule.Minimum)
		if err != nil {
			return false, err
		}
		aboveMin, err := wei.GreaterThanOrEqual(obs.Value, minWei)
		if err != nil {
			return false, err
		}
		if !aboveMin {
			return false, nil
		}
	}

	if rule.Maximum != nil {
		maxWei, err := wei.FromEth(*rule.Maximum)
		if err != nil {
			return false, err
		}
		belowMax, err := wei.LessThanOrEqual(obs.Value, maxWei)
		if err != nil {
			return false, err
		}
		if !belowMax {
			return false, nil
		}
	}

	return true, nil
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

	event, err := s.alertEvents.Create(ctx, rule.ID, message, &addressLabel, txHash)
	if err != nil {
		return err
	}

	if event == nil {
		log.Printf("[ALERT DEDUP] Rule %d (%s) - duplicate event skipped for TX: %s", rule.ID, rule.Type, obs.Hash)
		return nil
	}

	log.Printf("[ALERT FIRED] Rule %d (%s) - %s - TX: %s", rule.ID, rule.Type, message, obs.Hash)

	if addr != nil {
		userID := addr.UserID
		address := addr.Address
		if err := s.notifSem.Acquire(ctx, 1); err != nil {
			log.Printf("Failed to acquire notification semaphore for rule %d: %v", rule.ID, err)
			return nil
		}
		s.notifWg.Add(1)
		go func() {
			defer s.notifSem.Release(1)
			defer s.notifWg.Done()
			notifCtx, cancel := context.WithTimeout(context.Background(), notificationTimeout)
			defer cancel()
			s.sendNotification(notifCtx, userID, message, obs, addressLabel, rule, address)
		}()
	}

	return nil
}

// WaitForNotifications blocks until all in-flight notification goroutines finish.
func (s *EvaluatorService) WaitForNotifications() {
	s.notifWg.Wait()
}

func (s *EvaluatorService) buildNotifiers(cfg *domain.NotificationConfig) []notifications.Notifier {
	var notifiers []notifications.Notifier

	if cfg.DiscordWebhookURL != nil && *cfg.DiscordWebhookURL != "" {
		notifiers = append(notifiers, &notifications.DiscordNotifier{WebhookURL: *cfg.DiscordWebhookURL})
	}

	if cfg.TelegramBotToken != nil && *cfg.TelegramBotToken != "" &&
		cfg.TelegramChatID != nil && *cfg.TelegramChatID != "" {
		notifiers = append(notifiers, &notifications.TelegramNotifier{
			BotToken: *cfg.TelegramBotToken,
			ChatID:   *cfg.TelegramChatID,
		})
	}

	if cfg.SlackWebhookURL != nil && *cfg.SlackWebhookURL != "" {
		notifiers = append(notifiers, &notifications.SlackNotifier{WebhookURL: *cfg.SlackWebhookURL})
	}

	if cfg.Email != nil && *cfg.Email != "" {
		notifiers = append(notifiers, &notifications.EmailNotifier{
			APIKey: s.resendAPIKey,
			From:   s.emailFrom,
			To:     *cfg.Email,
		})
	}

	return notifiers
}

func sendWithRetry(ctx context.Context, n notifications.Notifier, message string, meta notifications.AlertMetadata) error {
	var lastErr error
	for attempt := range notificationMaxRetries {
		if attempt > 0 {
			wait := notificationRetryBase * time.Duration(1<<(attempt-1))
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(wait):
			}
		}

		if err := n.Send(ctx, message, meta); err != nil {
			lastErr = err

			if notifications.IsPermanent(err) {
				log.Printf("Permanent notification failure, skipping retries: %v", err)
				return err
			}

			log.Printf("Notification attempt %d/%d failed: %v", attempt+1, notificationMaxRetries, err)
			continue
		}

		return nil
	}

	return lastErr
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

	for _, n := range s.buildNotifiers(notifConfig) {
		if err := sendWithRetry(ctx, n, message, meta); err != nil {
			log.Printf("Notification channel failed for user %s after retries: %v", userID, err)
		} else {
			log.Printf("Notification sent to user %s via %T", userID, n)
		}
	}
}

func (s *EvaluatorService) buildMessage(rule domain.AlertRule, obs domain.ObservedTx) string {
	if obs.IsTokenTransfer() {
		return s.buildTokenMessage(rule, obs)
	}

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

const defaultTokenDecimals = 18

func (s *EvaluatorService) buildTokenMessage(rule domain.AlertRule, obs domain.ObservedTx) string {
	symbol := "tokens"
	if obs.TokenSymbol != nil {
		symbol = *obs.TokenSymbol
	}

	amount := "unknown"
	if obs.TokenValue != nil {
		decimals := defaultTokenDecimals
		if obs.TokenDecimals != nil {
			decimals = *obs.TokenDecimals
		}
		amount = wei.FormatTokenAmount(*obs.TokenValue, decimals)
	}

	switch rule.Type {
	case domain.AlertIncomingTx:
		return fmt.Sprintf("Incoming transfer: %s %s received", amount, symbol)
	case domain.AlertOutgoingTx:
		return fmt.Sprintf("Outgoing transfer: %s %s sent", amount, symbol)
	case domain.AlertLargeTransfer:
		threshold := float64(0)
		if rule.Threshold != nil {
			threshold = *rule.Threshold
		}
		return fmt.Sprintf("Large token transfer: %s %s (threshold: %g)", amount, symbol, threshold)
	default:
		return fmt.Sprintf("Token transfer: %s %s", amount, symbol)
	}
}
