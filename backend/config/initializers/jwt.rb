# JWT Configuration (B2 auth gateway)
JWT_SECRET_KEY = ENV.fetch('JWT_SECRET_KEY') { Rails.application.secret_key_base }
JWT_ALGORITHM = 'HS256'

# Short-lived access token TTL (seconds). Matches Ronald's FastAPI default of 30 min.
# NOTE: this must be a duration applied at issue time, NOT an absolute timestamp
# computed once at boot.
JWT_ACCESS_TTL = (ENV['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] || 30).to_i.minutes

# JWT access token generation. `exp` is computed at call time so every token lives
# for JWT_ACCESS_TTL from when it was issued.
def generate_jwt_token(user)
  now = Time.current
  payload = {
    user_id: user.id,
    login: user.login,
    type: 'access',
    iat: now.to_i,
    exp: (now + JWT_ACCESS_TTL).to_i
  }
  # Include email only if not in legacy database mode (no email column there).
  payload[:email] = user.email unless AuthenticationHelper.legacy_database?

  JWT.encode(payload, JWT_SECRET_KEY, JWT_ALGORITHM)
end

# JWT access token decoding. Returns the payload hash, or nil if the token is
# invalid, expired, or not an access token.
def decode_jwt_token(token)
  decoded = JWT.decode(token, JWT_SECRET_KEY, true, { algorithm: JWT_ALGORITHM })
  payload = decoded[0]
  # Defensive: only accept access tokens here (refresh tokens are opaque, not JWTs).
  return nil unless payload && payload['type'] == 'access'

  payload
rescue JWT::DecodeError => e
  Rails.logger.error "JWT decode error: #{e.message}"
  nil
end
