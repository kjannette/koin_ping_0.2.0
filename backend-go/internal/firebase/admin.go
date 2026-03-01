// Package firebase provides Firebase authentication integration.
package firebase

import (
	"context"
	"fmt"
	"sync"

	fb "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var ( //nolint:gochecknoglobals
	authClient *auth.Client //nolint:gochecknoglobals
	once       sync.Once    //nolint:gochecknoglobals
	errInit    error        //nolint:gochecknoglobals
)

// Init initializes the Firebase app and auth client using the given project ID.
func Init(projectID string) error {
	once.Do(func() {
		ctx := context.Background()

		var app *fb.App
		var err error

		if projectID != "" {
			cfg := &fb.Config{ProjectID: projectID}
			app, err = fb.NewApp(ctx, cfg, option.WithoutAuthentication())
		} else {
			app, err = fb.NewApp(ctx, nil)
		}
		if err != nil {
			errInit = fmt.Errorf("initialize firebase app: %w", err)

			return
		}

		authClient, err = app.Auth(ctx)
		if err != nil {
			errInit = fmt.Errorf("initialize firebase auth: %w", err)

			return
		}
	})

	return errInit
}

// Auth returns the initialized Firebase auth client.
func Auth() *auth.Client {
	return authClient
}
