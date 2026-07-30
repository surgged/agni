package user

// CreateUserCommand is the application-layer request to create a new
// user. The CommandHandler parses the stringly-typed ID into a
// uuid.UUID before constructing the aggregate.
type CreateUserCommand struct {
	ID       string
	Name     string
	Email    string
	Password string
}

// UpdateUserCommand is the application-layer request to mutate an
// existing user. The CommandHandler loads the aggregate by ID, calls
// Update, and persists the result.
type UpdateUserCommand struct {
	ID       string
	Name     string
	Email    string
	Password string
}

// DeleteUserCommand is the application-layer request to remove a
// user.
type DeleteUserCommand struct {
	ID string
}

// AuthenticateUserCommand is the application-layer request to verify
// a user's email/password credentials during login.
type AuthenticateUserCommand struct {
	Email    string
	Password string
}

// VerifyEmailCommand is the application-layer request to confirm an email address token.
type VerifyEmailCommand struct {
	Token string
}

// ResendVerificationCommand is the application-layer request to resend verification email.
type ResendVerificationCommand struct {
	Email string
}
