CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    owner_email TEXT NOT NULL,
    name TEXT NOT NULL,
    runtime TEXT NOT NULL DEFAULT 'kata',
    image_ref TEXT NOT NULL DEFAULT '',
    pod_name TEXT NOT NULL DEFAULT '',
    service_url TEXT NOT NULL DEFAULT '',
    share_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'created',
    error_message TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS apps_owner_email_idx ON apps (owner_email);

CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    app_id UUID NOT NULL REFERENCES apps (id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'use',
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS share_links_app_id_idx ON share_links (app_id);
CREATE INDEX IF NOT EXISTS share_links_recipient_email_idx ON share_links (recipient_email);
