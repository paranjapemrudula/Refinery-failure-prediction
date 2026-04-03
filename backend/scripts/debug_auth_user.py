import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "refinery_monitor.settings")

import django

django.setup()

from django.contrib.auth.models import User


def main() -> None:
    username = sys.argv[1] if len(sys.argv) > 1 else ""
    user = User.objects.filter(username=username).first()
    if not user:
        print({"user_exists": False, "username": username})
        return

    profile = getattr(user, "authenticator_profile", None)
    print(
        {
            "user_exists": True,
            "username": user.username,
            "is_active": user.is_active,
            "has_profile": bool(profile),
            "profile_enabled": getattr(profile, "is_enabled", None),
            "has_secret": bool(getattr(profile, "secret", "")),
        }
    )


if __name__ == "__main__":
    main()
