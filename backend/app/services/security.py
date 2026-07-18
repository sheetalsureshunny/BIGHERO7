"""Password hashing + session tokens. Hackathon-grade but not embarrassing:
PBKDF2-SHA256 with per-user salt, random opaque bearer tokens."""

import hashlib
import secrets

ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), ITERATIONS
    ).hex()
    return secrets.compare_digest(candidate, digest)


def make_token() -> str:
    return secrets.token_hex(24)
