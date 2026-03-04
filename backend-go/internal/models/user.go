package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

type UserModel struct {
	pool *pgxpool.Pool
}

func NewUserModel(pool *pgxpool.Pool) *UserModel {
	return &UserModel{pool: pool}
}

// FindOrCreateByFirebaseUID returns the local user for a Firebase UID,
// creating one if it doesn't exist yet. On conflict (returning user) the
// updated_at timestamp is refreshed.
func (m *UserModel) FindOrCreateByFirebaseUID(ctx context.Context, firebaseUID, email string) (*domain.User, error) {
	var u domain.User
	err := m.pool.QueryRow(ctx,
		`INSERT INTO users (firebase_uid, email)
		 VALUES ($1, $2)
		 ON CONFLICT (firebase_uid) DO UPDATE SET updated_at = NOW()
		 RETURNING id, firebase_uid, email, display_name, created_at, updated_at`,
		firebaseUID, email,
	).Scan(&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (m *UserModel) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var u domain.User
	err := m.pool.QueryRow(ctx,
		`SELECT id, firebase_uid, email, display_name, created_at, updated_at
		 FROM users
		 WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}
