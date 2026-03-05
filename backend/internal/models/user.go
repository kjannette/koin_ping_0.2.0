package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend/internal/domain"
)

type UserModel struct {
	pool *pgxpool.Pool
}

func NewUserModel(pool *pgxpool.Pool) *UserModel {
	return &UserModel{pool: pool}
}

const userColumns = `id, firebase_uid, email, display_name,
	stripe_customer_id, stripe_subscription_id, subscription_status,
	subscription_created_at, created_at, updated_at`

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName,
		&u.StripeCustomerID, &u.StripeSubscriptionID, &u.SubscriptionStatus,
		&u.SubscriptionCreatedAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil
		}
		return nil, err
	}
	return &u, nil
}

// FindOrCreateByFirebaseUID returns the local user for a Firebase UID,
// creating one if it doesn't exist yet. On conflict (returning user) the
// updated_at timestamp is refreshed.
func (m *UserModel) FindOrCreateByFirebaseUID(ctx context.Context, firebaseUID, email string) (*domain.User, error) {
	row := m.pool.QueryRow(ctx,
		`INSERT INTO users (firebase_uid, email)
		 VALUES ($1, $2)
		 ON CONFLICT (firebase_uid) DO UPDATE SET updated_at = NOW()
		 RETURNING `+userColumns,
		firebaseUID, email,
	)
	return scanUser(row)
}

func (m *UserModel) GetByID(ctx context.Context, id string) (*domain.User, error) {
	row := m.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, id,
	)
	return scanUser(row)
}

func (m *UserModel) UpdateStripeCustomer(ctx context.Context, userID, stripeCustomerID string) error {
	_, err := m.pool.Exec(ctx,
		`UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1`,
		userID, stripeCustomerID,
	)
	return err
}

func (m *UserModel) ActivateSubscription(ctx context.Context, stripeCustomerID, subscriptionID, status string) error {
	_, err := m.pool.Exec(ctx,
		`UPDATE users
		 SET stripe_subscription_id = $2,
		     subscription_status = $3,
		     subscription_created_at = COALESCE(subscription_created_at, NOW()),
		     updated_at = NOW()
		 WHERE stripe_customer_id = $1`,
		stripeCustomerID, subscriptionID, status,
	)
	return err
}

func (m *UserModel) UpdateSubscriptionStatus(ctx context.Context, stripeCustomerID, status string) error {
	_, err := m.pool.Exec(ctx,
		`UPDATE users SET subscription_status = $2, updated_at = NOW()
		 WHERE stripe_customer_id = $1`,
		stripeCustomerID, status,
	)
	return err
}
