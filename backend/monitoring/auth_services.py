from django.contrib.auth.models import User

from .models import AuthenticatorProfile
from .totp import build_otpauth_uri, generate_base32_secret, verify_totp


class AuthenticatorEnrollmentService:
    issuer = "RefineryMonitor"

    @classmethod
    def create_pending_profile(cls, user: User) -> AuthenticatorProfile:
        secret = generate_base32_secret()
        profile, _ = AuthenticatorProfile.objects.get_or_create(user=user)
        profile.secret = secret
        profile.is_enabled = False
        profile.save()
        return profile

    @classmethod
    def build_setup_payload(cls, user: User, profile: AuthenticatorProfile) -> dict:
        return {
            "setup_required": True,
            "username": user.username,
            "manual_key": profile.secret,
            "otpauth_uri": build_otpauth_uri(profile.secret, user.username, issuer=cls.issuer),
        }

    @classmethod
    def verify_and_enable(cls, user: User, otp_code: str) -> bool:
        try:
            profile = user.authenticator_profile
        except AuthenticatorProfile.DoesNotExist:
            return False

        if not profile.secret:
            return False

        if verify_totp(otp_code, profile.secret):
            profile.is_enabled = True
            profile.save(update_fields=["is_enabled"])
            return True
        return False

    @classmethod
    def verify_reset_otp(cls, user: User, otp_code: str) -> bool:
        try:
            profile = user.authenticator_profile
        except AuthenticatorProfile.DoesNotExist:
            return False

        if not profile.is_enabled or not profile.secret:
            return False

        return verify_totp(otp_code, profile.secret)
