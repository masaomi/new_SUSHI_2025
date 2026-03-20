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
