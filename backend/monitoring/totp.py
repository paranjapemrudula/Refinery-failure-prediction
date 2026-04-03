from __future__ import annotations

import base64
import hashlib
import hmac
import os
import struct
import time
from urllib.parse import quote


def generate_base32_secret(length: int = 20) -> str:
    secret = base64.b32encode(os.urandom(length)).decode("utf-8")
    return secret.rstrip("=")


def normalize_base32_secret(secret: str) -> bytes:
    padding = "=" * ((8 - len(secret) % 8) % 8)
    return base64.b32decode(f"{secret}{padding}", casefold=True)


def generate_totp(secret: str, interval: int = 30, digits: int = 6, for_time: int | None = None) -> str:
    timestamp = for_time or int(time.time())
    counter = int(timestamp // interval)
    key = normalize_base32_secret(secret)
    message = struct.pack(">Q", counter)
    digest = hmac.new(key, message, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10**digits)).zfill(digits)


def verify_totp(token: str, secret: str, interval: int = 30, digits: int = 6, window: int = 1) -> bool:
    if not token or not token.isdigit():
        return False

    current_time = int(time.time())
    for offset in range(-window, window + 1):
        comparison_time = current_time + (offset * interval)
        if generate_totp(secret, interval=interval, digits=digits, for_time=comparison_time) == token:
            return True
    return False


def build_otpauth_uri(secret: str, username: str, issuer: str = "RefineryMonitor") -> str:
    label = quote(f"{issuer}:{username}")
    issuer_param = quote(issuer)
    return f"otpauth://totp/{label}?secret={secret}&issuer={issuer_param}"
