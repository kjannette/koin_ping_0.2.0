package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend/internal/domain"
)

type AlertRuleModel struct {
	pool *pgxpool.Pool
}

func NewAlertRuleModel(pool *pgxpool.Pool) *AlertRuleModel {
	return &AlertRuleModel{pool: pool}
}

func (m *AlertRuleModel) Create(ctx context.Context, addressID int, alertType domain.AlertType, threshold, minimum, maximum *float64) (*domain.AlertRule, error) {
	var r domain.AlertRule
	err := m.pool.QueryRow(ctx,
		`INSERT INTO alert_rules (address_id, type, threshold, minimum, maximum, enabled)
		 VALUES ($1, $2, $3, $4, $5, TRUE)
		 RETURNING id, address_id, type, threshold, minimum, maximum, enabled, created_at`,
		addressID, alertType.String(), threshold, minimum, maximum,
	).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (m *AlertRuleModel) ListByAddress(ctx context.Context, addressID int) ([]domain.AlertRule, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT id, address_id, type, threshold, minimum, maximum, enabled, created_at
		 FROM alert_rules
		 WHERE address_id = $1
		 ORDER BY created_at DESC`,
		addressID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []domain.AlertRule
	for rows.Next() {
		var r domain.AlertRule
		if err := rows.Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

func (m *AlertRuleModel) FindByID(ctx context.Context, id int, userID *string) (*domain.AlertRule, error) {
	var r domain.AlertRule
	var err error

	if userID != nil {
		err = m.pool.QueryRow(ctx,
			`SELECT ar.id, ar.address_id, ar.type, ar.threshold, ar.minimum, ar.maximum, ar.enabled, ar.created_at
			 FROM alert_rules ar
			 JOIN addresses a ON a.id = ar.address_id
			 WHERE ar.id = $1 AND a.user_id = $2`,
			id, *userID,
		).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt)
	} else {
		err = m.pool.QueryRow(ctx,
			`SELECT id, address_id, type, threshold, minimum, maximum, enabled, created_at
			 FROM alert_rules
			 WHERE id = $1`,
			id,
		).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &r, nil
}

func (m *AlertRuleModel) UpdateEnabled(ctx context.Context, id int, enabled bool) (*domain.AlertRule, error) {
	var r domain.AlertRule
	err := m.pool.QueryRow(ctx,
		`UPDATE alert_rules
		 SET enabled = $2
		 WHERE id = $1
		 RETURNING id, address_id, type, threshold, minimum, maximum, enabled, created_at`,
		id, enabled,
	).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &r, nil
}

func (m *AlertRuleModel) UpdateThresholds(ctx context.Context, id int, minimum, maximum *float64) (*domain.AlertRule, error) {
	var r domain.AlertRule
	err := m.pool.QueryRow(ctx,
		`UPDATE alert_rules
		 SET minimum = $2, maximum = $3
		 WHERE id = $1
		 RETURNING id, address_id, type, threshold, minimum, maximum, enabled, created_at`,
		id, minimum, maximum,
	).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Minimum, &r.Maximum, &r.Enabled, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &r, nil
}

func (m *AlertRuleModel) Remove(ctx context.Context, id int) (bool, error) {
	tag, err := m.pool.Exec(ctx,
		`DELETE FROM alert_rules WHERE id = $1`,
		id,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
