# frozen_string_literal: true

require "json"

module Middleware
  # Rack-level read-only guard. When SUSHI_READ_ONLY=1, any non-idempotent HTTP
  # method (POST/PUT/PATCH/DELETE) is rejected with 403 BEFORE it reaches any
  # controller — so it covers ALL surfaces uniformly (/api/v1, /v1, /internal, and
  # any auth controller), regardless of which base class they inherit. This is the
  # SERVER-SIDE write gate; the sushi-chain MCP proxy allow_writes flag is a second,
  # client-side layer (defense in depth).
  #
  # A tiny allowlist keeps genuinely non-mutating POSTs working (e.g. dataset
  # validation, which computes checks without writing).
  class SushiReadOnlyGuard
    SAFE_METHODS = %w[GET HEAD OPTIONS TRACE].freeze

    # Request paths that are POST but perform NO write (validation/dry-run). Matched
    # after stripping any trailing slash / .format suffix so /v1/datasets/validate,
    # /v1/datasets/validate/ and .../validate.json are all treated alike.
    ALLOWLIST_PATHS = %w[
      /v1/datasets/validate
    ].freeze

    def initialize(app)
      @app = app
    end

    def call(env)
      return @app.call(env) unless read_only?

      method = env["REQUEST_METHOD"]
      return @app.call(env) if SAFE_METHODS.include?(method)

      path = env["PATH_INFO"].to_s
      return @app.call(env) if allowlisted?(path)

      body = JSON.generate(
        error: "read_only",
        message: "This SUSHI backend is running in read-only mode; " \
                 "#{method} #{path} is not permitted."
      )
      # Rack 3 (Rails 8) requires lowercase response header field names.
      [403, { "content-type" => "application/json" }, [body]]
    end

    private

    # Normalize a trailing slash and any .format suffix before matching, so
    # /v1/datasets/validate, /v1/datasets/validate/ and .../validate.json all match.
    def allowlisted?(path)
      normalized = path.sub(%r{/\z}, "").sub(/\.[a-z0-9]+\z/i, "")
      ALLOWLIST_PATHS.include?(normalized)
    end

    def read_only?
      ENV["SUSHI_READ_ONLY"] == "1"
    end
  end
end
