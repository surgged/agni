CREATE TABLE share_links (
    id              TEXT PRIMARY KEY,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    app_id          TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    permission      TEXT NOT NULL DEFAULT 'use',
    token_hash      TEXT NOT NULL,
    expires_at      DATETIME NOT NULL,
    revoked_at      DATETIME,
    accepted_at     DATETIME
);
CREATE INDEX idx_sharelinks_app ON share_links(app_id);
CREATE INDEX idx_sharelinks_email ON share_links(recipient_email);
