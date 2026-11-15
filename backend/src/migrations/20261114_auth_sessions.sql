-- Apply before the matching backend release. Brief ACCESS EXCLUSIVE lock on users;
-- fail instead of waiting behind long transactions. No existing passwords are changed.
SET LOCAL lock_timeout = '5s';

ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0
    CHECK (session_version >= 0);

-- All password writers (self-service, admin, teacher, operational scripts) revoke
-- sessions atomically with the password update, including legacy refresh tokens.
CREATE FUNCTION revoke_sessions_on_password_change() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        NEW.session_version := OLD.session_version + 1;
        DELETE FROM refresh_tokens WHERE user_id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_password_session_revocation
    BEFORE UPDATE OF password_hash ON users
    FOR EACH ROW EXECUTE FUNCTION revoke_sessions_on_password_change();

CREATE TABLE google_oauth_transactions (
    state_hash TEXT PRIMARY KEY,
    browser_hash TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_version INTEGER NOT NULL,
    code_verifier TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX google_oauth_transactions_user_idx ON google_oauth_transactions(user_id);
CREATE INDEX google_oauth_transactions_expiry_idx ON google_oauth_transactions(expires_at);

-- Rollback: prefer rolling back application code while retaining this additive
-- schema. Removing the trigger/version restores the old revocation vulnerability.
-- Never restore deleted refresh tokens. OAuth transactions are ephemeral, not backups.
