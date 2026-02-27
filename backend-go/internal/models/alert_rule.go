package models

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

type AlertRuleModel struct {
	pool *pgxpool.Pool
}

func NewAlertRuleModel(pool *pgxpool.Pool) *AlertRuleModel {
	return &AlertRuleModel{pool: pool}
}

func (m *AlertRuleModel) Create(ctx context.Context, addressID int, alertType domain.AlertType, threshold *float64) (*domain.AlertRule, error) {
	var r domain.AlertRule
	err := m.pool.QueryRow(ctx,
		`INSERT INTO alert_rules (address_id, type, threshold, enabled)
		 VALUES ($1, $2, $3, TRUE)
		 RETURNING id, address_id, type, threshold, enabled, created_at`,
		addressID, string(alertType), threshold,
	).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Enabled, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (m *AlertRuleModel) ListByAddress(ctx context.Context, addressID int) ([]domain.AlertRule, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT id, address_id, type, threshold, enabled, created_at
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
		if err := rows.Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Enabled, &r.CreatedAt); err != nil {
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
			`SELECT ar.id, ar.address_id, ar.type, ar.threshold, ar.enabled, ar.created_at
			 FROM alert_rules ar
			 JOIN addresses a ON a.id = ar.address_id
			 WHERE ar.id = $1 AND a.user_id = $2`,
			id, *userID,
		).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Enabled, &r.CreatedAt)
	} else {
		err = m.pool.QueryRow(ctx,
			`SELECT id, address_id, type, threshold, enabled, created_at
			 FROM alert_rules
			 WHERE id = $1`,
			id,
		).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Enabled, &r.CreatedAt)
	}

	if err != nil {
		if err.Error() == "no rows in result set" {
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
		 RETURNING id, address_id, type, threshold, enabled, created_at`,
		id, enabled,
	).Scan(&r.ID, &r.AddressID, &r.Type, &r.Threshold, &r.Enabled, &r.CreatedAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
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
