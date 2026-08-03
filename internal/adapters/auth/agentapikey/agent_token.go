package agentapikey

import (
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AgentTokenService struct {
	secret string
	expiry time.Duration
}

func NewAgentTokenService(secret string, expiry time.Duration) *AgentTokenService {
	return &AgentTokenService{secret: secret, expiry: expiry}
}

type agentClaims struct {
	jwt.RegisteredClaims
	Type string `json:"typ"`
}

func (s *AgentTokenService) Issue(email string) (string, int64, error) {
	now := time.Now()
	exp := now.Add(s.expiry)
	claims := agentClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        uuid.NewString(),
		},
		Type: "agent",
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(s.secret))
	if err != nil {
		slog.Error("failed to sign agent token", "email", email, "error", err)
		return "", 0, fmt.Errorf("sign agent token: %w", err)
	}
	return signed, exp.Unix(), nil
}

func (s *AgentTokenService) Validate(tokenStr string) (string, error) {
	return s.parseTyped(tokenStr, "agent")
}

func (s *AgentTokenService) IssueMagicToken(email string, ttl time.Duration) (string, int64, error) {
	now := time.Now()
	exp := now.Add(ttl)
	claims := agentClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        uuid.NewString(),
		},
		Type: "magic",
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(s.secret))
	if err != nil {
		slog.Error("failed to sign magic token", "email", email, "error", err)
		return "", 0, fmt.Errorf("sign magic token: %w", err)
	}
	return signed, exp.Unix(), nil
}

func (s *AgentTokenService) ValidateMagicToken(tokenStr string) (string, error) {
	return s.parseTyped(tokenStr, "magic")
}

func (s *AgentTokenService) IssueSessionToken(email string, ttl time.Duration) (string, int64, error) {
	now := time.Now()
	exp := now.Add(ttl)
	claims := agentClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        uuid.NewString(),
		},
		Type: "session",
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(s.secret))
	if err != nil {
		slog.Error("failed to sign session token", "email", email, "error", err)
		return "", 0, fmt.Errorf("sign session token: %w", err)
	}
	return signed, exp.Unix(), nil
}

func (s *AgentTokenService) ValidateSessionToken(tokenStr string) (string, error) {
	return s.parseTyped(tokenStr, "session")
}

func (s *AgentTokenService) parseTyped(tokenStr, expectedType string) (string, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &agentClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return []byte(s.secret), nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := parsed.Claims.(*agentClaims)
	if !ok || !parsed.Valid {
		return "", errors.New("invalid token")
	}
	if claims.Type != expectedType {
		return "", fmt.Errorf("expected %s token, got %s", expectedType, claims.Type)
	}
	return claims.Subject, nil
}
