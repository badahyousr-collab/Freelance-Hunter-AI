from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = sorted((ROOT / "migrations").glob("*.sql"))

def main() -> None:
    assert MIGRATIONS, "No D1 migrations found"
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    for migration in MIGRATIONS:
        db.executescript(migration.read_text(encoding="utf-8"))

    user_columns = {row[1] for row in db.execute("PRAGMA table_info(users)")}
    assert {"verification_expires_at", "password_reset_token_hash", "password_reset_expires_at", "auth_method"} <= user_columns
    auth_code_columns = {row[1] for row in db.execute("PRAGMA table_info(telegram_auth_codes)")}
    assert {"code_hash", "expires_at", "telegram_user_id", "user_id", "authenticated_at", "session_issued_at", "auth_mode", "error_message"} <= auth_code_columns

    db.execute(
        "INSERT INTO users (id,email,password_hash,is_verified) VALUES (?,?,?,1)",
        ("user-1", "one@example.com", "test-hash"),
    )
    db.execute("INSERT INTO telegram_links (user_id,telegram_user_id) VALUES (?,?)", ("user-1", "12345"))

    try:
        db.execute("INSERT INTO users (id,email,password_hash,is_verified) VALUES (?,?,?,1)", ("user-2", "two@example.com", "test-hash"))
        db.execute("INSERT INTO telegram_links (user_id,telegram_user_id) VALUES (?,?)", ("user-2", "12345"))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("Telegram user IDs must be unique across linked accounts")

    db.execute("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+1 day'))", ("session-hash", "user-1"))
    db.execute("DELETE FROM users WHERE id=?", ("user-1",))
    assert db.execute("SELECT COUNT(*) FROM sessions WHERE user_id='user-1'").fetchone()[0] == 0
    db.execute("INSERT INTO telegram_auth_codes (code_hash,expires_at,user_id) VALUES (?,?,?)", ("auth-code-hash", "2099-01-01 00:00:00", "user-2"))
    assert db.execute("SELECT user_id FROM telegram_auth_codes WHERE code_hash='auth-code-hash'").fetchone()[0] == "user-2"

    print(f"Validated {len(MIGRATIONS)} D1 migrations, Telegram auth codes, auth fields, Telegram uniqueness, and cascading session deletion.")

if __name__ == "__main__":
    main()
