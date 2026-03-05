package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend/internal/domain"
)

type AlertEventModel struct {
	pool *pgxpool.Pool
}

func NewAlertEventModel(pool *pgxpool.Pool) *AlertEventModel {
	return &AlertEventModel{pool: pool}
}

func (m *AlertEventModel) ListRecentByUser(ctx context.Context, userID string, limit int) ([]domain.AlertEvent, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT ae.id, ae.alert_rule_id, ae.message, ae.address_label, ae.tx_hash, ae.timestamp
		 FROM alert_events ae
		 JOIN alert_rules ar ON ar.id = ae.alert_rule_id
		 JOIN addresses a ON a.id = ar.address_id
		 WHERE a.user_id = $1
		 ORDER BY ae.timestamp DESC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.AlertEvent
	for rows.Next() {
		var e domain.AlertEvent
		if err := rows.Scan(&e.ID, &e.AlertRuleID, &e.Message, &e.AddressLabel, &e.TxHash, &e.Timestamp); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (m *AlertEventModel) ListRecent(ctx context.Context, limit int) ([]domain.AlertEvent, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT id, alert_rule_id, message, address_label, tx_hash, timestamp
		 FROM alert_events
		 ORDER BY timestamp DESC
		 LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.AlertEvent
	for rows.Next() {
		var e domain.AlertEvent
		if err := rows.Scan(&e.ID, &e.AlertRuleID, &e.Message, &e.AddressLabel, &e.TxHash, &e.Timestamp); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (m *AlertEventModel) Create(ctx context.Context, alertRuleID int, message string, addressLabel *string, txHash *string) (*domain.AlertEvent, error) {
	var e domain.AlertEvent
	err := m.pool.QueryRow(ctx,
		`INSERT INTO alert_events (alert_rule_id, message, address_label, tx_hash)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT DO NOTHING
		 RETURNING id, alert_rule_id, message, address_label, tx_hash, timestamp`,
		alertRuleID, message, addressLabel, txHash,
	).Scan(&e.ID, &e.AlertRuleID, &e.Message, &e.AddressLabel, &e.TxHash, &e.Timestamp)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Duplicate silently skipped by ON CONFLICT DO NOTHING
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}
