ALTER TABLE app_user
    ADD COLUMN username VARCHAR(30),
    ADD COLUMN role VARCHAR(24) NOT NULL DEFAULT 'STUDENT',
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN google_subject VARCHAR(255),
    ADD COLUMN last_login_at TIMESTAMPTZ;

UPDATE app_user
SET username = 'user_' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 12)
WHERE username IS NULL;

ALTER TABLE app_user
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN password_hash DROP NOT NULL,
    DROP CONSTRAINT uq_app_user_email,
    ADD CONSTRAINT ck_app_user_role CHECK (role IN ('STUDENT', 'ADMIN'));

CREATE UNIQUE INDEX uq_app_user_email_ci ON app_user (LOWER(email));
CREATE UNIQUE INDEX uq_app_user_username_ci ON app_user (LOWER(username));
CREATE UNIQUE INDEX uq_app_user_google_subject ON app_user (google_subject) WHERE google_subject IS NOT NULL;

CREATE TABLE refresh_token (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_token_user ON refresh_token(user_id);
CREATE INDEX idx_refresh_token_active ON refresh_token(token_hash) WHERE revoked_at IS NULL;
