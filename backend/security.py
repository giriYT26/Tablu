import hashlib
import hmac

import bcrypt

BCRYPT_ROUNDS = 12

# Legacy constant kept for verifying old hashes during migration
_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    """Hash a password with bcrypt (cost factor 12)."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_password(password: str, stored: str) -> bool:
    """Verify a password against a stored hash.

    Supports both the new bcrypt format and the legacy
    ``pbkdf2:<iterations>:<salt>:<digest>`` format so existing
    accounts keep working until they are re-hashed on next login.
    """
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        # bcrypt hash
        try:
            return bcrypt.checkpw(password.encode(), stored.encode())
        except (ValueError, TypeError):
            return False

    # Legacy PBKDF2 path
    try:
        scheme, iterations, salt, digest = stored.split(":")
        if scheme != "pbkdf2":
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        ).hex()
        return hmac.compare_digest(candidate, digest)
    except (ValueError, TypeError):
        return False


def needs_rehash(stored: str) -> bool:
    """Return True when the hash uses the old PBKDF2 scheme and should
    be upgraded to bcrypt on next successful login."""
    return not (stored.startswith("$2b$") or stored.startswith("$2a$"))
