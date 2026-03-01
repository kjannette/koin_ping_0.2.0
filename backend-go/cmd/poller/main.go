// Package main is the entry point for the blockchain observer poller.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/kjannette/koin-ping/backend-go/internal/config"
	"github.com/kjannette/koin-ping/backend-go/internal/database"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
	"github.com/kjannette/koin-ping/backend-go/internal/protocols/ethereum"
	"github.com/kjannette/koin-ping/backend-go/internal/services"
)

const (
	// separatorWidth is the number of characters in log separator lines.
	separatorWidth = 60
	// msPerSecond converts milliseconds to seconds.
	msPerSecond = 1000
)

//nolint:funlen
func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if cfg.EthRPCURL == "" {
		log.Fatal("ERROR: ETH_RPC_URL environment variable is required")
	}

	pool, err := database.Connect(cfg.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	eth, err := ethereum.NewJsonRpcEthereum(cfg.EthRPCURL)
	if err != nil {
		log.Fatalf("Failed to create Ethereum observer: %v", err)
	}

	defer database.Close()

	addressModel := models.NewAddressModel(pool)
	alertRuleModel := models.NewAlertRuleModel(pool)
	alertEventModel := models.NewAlertEventModel(pool)
	checkpointModel := models.NewCheckpointModel(pool)
	notifConfigModel := models.NewNotificationConfigModel(pool)

	observer := services.NewObserverService(eth, addressModel, checkpointModel)
	evaluator := services.NewEvaluatorService(
		eth, alertRuleModel, alertEventModel, addressModel, notifConfigModel,
		cfg.ResendAPIKey, cfg.EmailFrom,
	)
	digestSvc := services.NewEmailDigestService(cfg.ResendAPIKey, cfg.EmailFrom, alertEventModel, notifConfigModel)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println()
		log.Println(strings.Repeat("=", separatorWidth))
		log.Println("Shutting down poller gracefully...")
		log.Println(strings.Repeat("=", separatorWidth))
		cancel()
	}()

	interval := time.Duration(cfg.PollIntervalMS) * time.Millisecond
	digestInterval := time.Duration(cfg.DigestIntervalHours) * time.Hour

	log.Println(strings.Repeat("=", separatorWidth))
	log.Println("Koin Ping Observer Poller Starting")
	log.Println(strings.Repeat("=", separatorWidth))
	log.Printf("RPC URL: %s", cfg.EthRPCURL)
	log.Printf("Poll Interval: %dms (%ds)", cfg.PollIntervalMS, cfg.PollIntervalMS/msPerSecond)
	log.Printf("Digest Interval: %dh", cfg.DigestIntervalHours)
	log.Println(strings.Repeat("=", separatorWidth))

	runCycle(ctx, observer, evaluator)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	digestTicker := time.NewTicker(digestInterval)
	defer digestTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Poller stopped")

			return
		case <-ticker.C:
			runCycle(ctx, observer, evaluator)
		case <-digestTicker.C:
			sent, digestErr := digestSvc.SendDigestsForAllUsers(ctx)
			if digestErr != nil {
				log.Printf("Email digest failed: %v", digestErr)
			} else {
				log.Printf("Sent %d email digests", sent)
			}
		}
	}
}

func runCycle(
	ctx context.Context,
	observer *services.ObserverService,
	evaluator *services.EvaluatorService,
) {
	startTime := time.Now()
	log.Printf("[%s] Starting observation cycle...", time.Now().UTC().Format(time.RFC3339))

	observations, err := observer.RunOnce(ctx)
	if err != nil {
		log.Printf("[%s] Observation cycle failed: %v", time.Now().UTC().Format(time.RFC3339), err)

		return
	}

	alertsFired, err := evaluator.Evaluate(ctx, observations)
	if err != nil {
		log.Printf("[%s] Evaluation failed: %v", time.Now().UTC().Format(time.RFC3339), err)

		return
	}

	duration := time.Since(startTime)
	log.Printf("[%s] Cycle complete: %d observations, %d alerts fired in %s",
		time.Now().UTC().Format(time.RFC3339),
		len(observations), alertsFired,
		fmt.Sprintf("%dms", duration.Milliseconds()))
}
