from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = sorted((ROOT / "migrations").glob("*.sql"))


def main() -> None:
    assert len(MIGRATIONS) >= 2, "Expected the initial schema and follow-up migrations"
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")

    # Build the previous schema, insert representative legacy records, then test the
    # Telegram-only migration against existing data rather than only a fresh database.
    for migration in MIGRATIONS[:-1]:
        db.executescript(migration.read_text(encoding="utf-8"))

    db.execute(
        "INSERT INTO users (id,email,password_hash,is_verified,auth_method) VALUES (?,?,?,?,?)",
        ("user-1", "telegram-12345@telegram.local", "legacy-marker", 1, "telegram"),
    )
    db.execute(
        "INSERT INTO users (id,email,password_hash,is_verified,auth_method) VALUES (?,?,?,?,?)",
        ("user-2", "old-user@example.com", "legacy-marker", 1, "email"),
    )
    db.execute("INSERT INTO telegram_links (user_id,telegram_user_id) VALUES (?,?)", ("user-1", "12345"))

    final_migration = MIGRATIONS[-1]
    db.executescript(final_migration.read_text(encoding="utf-8"))

    user_columns = {row[1] for row in db.execute("PRAGMA table_info(users)")}
    assert {"id", "telegram_identity", "telegram_verified", "identity_provider", "created_at"} <= user_columns
    assert not {"email", "password_hash", "is_verified", "auth_method", "verification_token_hash", "verification_expires_at", "password_reset_token_hash", "password_reset_expires_at"} & user_columns

    migrated_telegram = db.execute(
        "SELECT telegram_identity,identity_provider,telegram_verified FROM users WHERE id='user-1'"
    ).fetchone()
    assert migrated_telegram == ("tg:12345", "telegram", 1)
    migrated_legacy = db.execute(
        "SELECT telegram_identity,identity_provider FROM users WHERE id='user-2'"
    ).fetchone()
    assert migrated_legacy == ("legacy:user-2", "legacy")

    auth_code_columns = {row[1] for row in db.execute("PRAGMA table_info(telegram_auth_codes)")}
    assert {"code_hash", "expires_at", "telegram_user_id", "user_id", "authenticated_at", "session_issued_at", "auth_mode", "error_message"} <= auth_code_columns

    db.execute(
        "INSERT INTO users (id,telegram_identity,telegram_verified,identity_provider) VALUES (?,?,1,'telegram')",
        ("user-3", "tg:67890"),
    )
    try:
        db.execute("INSERT INTO telegram_links (user_id,telegram_user_id) VALUES (?,?)", ("user-3", "12345"))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("Telegram user IDs must be unique across linked accounts")

    db.execute("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+1 day'))", ("session-hash", "user-1"))
    db.execute("DELETE FROM users WHERE id=?", ("user-1",))
    assert db.execute("SELECT COUNT(*) FROM sessions WHERE user_id='user-1'").fetchone()[0] == 0

    db.execute(
        "INSERT INTO telegram_auth_codes (code_hash,expires_at,user_id) VALUES (?,?,?)",
        ("auth-code-hash", "2099-01-01 00:00:00", "user-3"),
    )
    assert db.execute("SELECT user_id FROM telegram_auth_codes WHERE code_hash='auth-code-hash'").fetchone()[0] == "user-3"

    print(f"Validated {len(MIGRATIONS)} D1 migrations, Telegram-only identity migration, auth codes, uniqueness, and cascading session deletion.")


if __name__ == "__main__":
    main()
