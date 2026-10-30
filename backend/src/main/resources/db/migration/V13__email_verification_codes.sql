CREATE TABLE email_verification_code (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
);
