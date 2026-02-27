package firebase

import (
	"context"
	"fmt"
	"sync"

	fb "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var (
	authClient *auth.Client
	once       sync.Once
	initErr    error
)

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
			initErr = fmt.Errorf("initialize firebase app: %w", err)
			return
		}

		authClient, err = app.Auth(ctx)
		if err != nil {
			initErr = fmt.Errorf("initialize firebase auth: %w", err)
			return
		}
	})

	return initErr
}

func Auth() *auth.Client {
	return authClient
}
