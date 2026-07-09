class Sample < ActiveRecord::Base
  belongs_to :data_set

  def to_hash
    parse_key_value(self.key_value)
  end

  def saved?
    if Sample.find_by_key_value(self.key_value)
      true
    else
      false
    end
  end

  # Serialize a Hash into the legacy Ruby Hash#inspect key_value format that
  # legacy SUSHI / btools read back with eval(). Matches Ronald's FastAPI
  # serialize_sample_data_ruby byte-for-byte:
  #   {"k"=>"v", ...}  — double-quoted keys/values, no spaces around =>,
  #   ", " between pairs, nil bareword for nil, escape backslash then quote.
  # Built explicitly on purpose: Ruby's own Hash#inspect adds spaces around
  # => on Ruby 3.4+, which would diverge from the stored legacy format.
  def self.serialize_key_value_ruby(hash)
    pairs = hash.map do |k, v|
      key_s = %Q{"#{escape_ruby(k.to_s)}"}
      val_s = v.nil? ? "nil" : %Q{"#{escape_ruby(v.to_s)}"}
      "#{key_s}=>#{val_s}"
    end
    "{" + pairs.join(", ") + "}"
  end

  # Escape a string for a Ruby double-quoted literal exactly as Ruby's own
  # String#inspect (hence Hash#to_s) does: backslash first, then double quote,
  # then `#` when it introduces interpolation (`#{`, `#@`, `#$`). Escaping `#`
  # is REQUIRED — without it a value like `#{...}` diverges from the stored
  # legacy bytes AND, because legacy SUSHI / btools reconstruct key_value with
  # eval(), would interpolate (arbitrary-code) when read back. A bare `#` is
  # left as-is (Ruby does not escape it).
  def self.escape_ruby(str)
    str.gsub("\\") { "\\\\" }.gsub('"') { "\\\"" }.gsub(/#(?=[{@$])/) { "\\#" }
  end
  private_class_method :escape_ruby

  private

  def parse_key_value(str)
    return {} if str.blank?

    # Try JSON first (new format)
    if str.strip.start_with?('{') && str.include?('"')
      begin
        parsed = JSON.parse(str)
        return parsed if parsed.is_a?(Hash)
      rescue JSON::ParserError
        # Fall through to Ruby hash literal parsing
      end
    end

    safe_parse_ruby_hash(str)
  end

  def safe_parse_ruby_hash(str)
    result = {}

    # String values: {"key"=>"value"} or {'key'=>'value'}
    str.scan(/["']([^"']+)["']\s*=>\s*["']([^"']*)["']/) do |key, value|
      result[key] = value
    end

    # Numeric, boolean, nil values: {"key"=>42}, {"key"=>true}
    str.scan(/["']([^"']+)["']\s*=>\s*(nil|true|false|\d+(?:\.\d+)?)(?=[,\s\}])/) do |key, value|
      result[key] = case value
                    when 'nil' then nil
                    when 'true' then true
                    when 'false' then false
                    else value
                    end
    end

    if result.empty? && str.present?
      Rails.logger.warn("Sample#safe_parse_ruby_hash returned empty for non-empty input: id=#{id}")
    end

    result
  end
end
