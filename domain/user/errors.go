package user

import "errors"

// ErrUserNotFound is returned by the repository when a user
// lookup by id does not match any stored aggregate.
var ErrUserNotFound = errors.New("user not found")

// ErrInvalidUser is returned by the aggregate constructor when one of
// its invariants is violated (e.g. an empty string for a required field).
var ErrInvalidUser = errors.New("invalid user")

// ErrInvalidUserID is returned when a nil uuid.UUID is passed as a
// user id.
var ErrInvalidUserID = errors.New("invalid user id")

// ErrEmailNotVerified is returned when trying to authenticate an unverified user.
var ErrEmailNotVerified = errors.New("email not verified")

// ErrInvalidVerificationToken is returned when an invalid email verification token is provided.
var ErrInvalidVerificationToken = errors.New("invalid verification token")
