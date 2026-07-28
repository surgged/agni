CREATE TABLE apps (
    id              TEXT PRIMARY KEY,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    owner_email     TEXT NOT NULL,
    name            TEXT NOT NULL,
    runtime         TEXT NOT NULL DEFAULT 'kata',
    image_ref       TEXT NOT NULL DEFAULT '',
    pod_name        TEXT NOT NULL DEFAULT '',
    service_url     TEXT NOT NULL DEFAULT '',
    share_url       TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'created',
    error_message   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_apps_owner ON apps(owner_email);
CREATE INDEX idx_apps_status ON apps(status);
