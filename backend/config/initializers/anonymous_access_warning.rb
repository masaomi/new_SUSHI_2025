# frozen_string_literal: true

# Loud boot-time warning if the production anonymous-access escape hatch is set.
# SUSHI_ALLOW_ANONYMOUS=1 fully disables authentication in production (anonymous +
# all-projects fallback on the live DB) — see AuthenticationHelper.authentication_skipped?.
# It exists only for deliberate, temporary use; a leftover in an env file must be noticed.
if Rails.env.production? && ENV["SUSHI_ALLOW_ANONYMOUS"] == "1"
  warning = "[SECURITY] SUSHI_ALLOW_ANONYMOUS=1 in production: authentication is DISABLED " \
            "(anonymous access with all-projects scope). Unset it unless this is intentional."
  Rails.logger&.warn(warning)
  warn(warning)
end
