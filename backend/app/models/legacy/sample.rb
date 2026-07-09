# Read model for the legacy SUSHI `samples` table (see LegacyRecord). Parses the
# stored Ruby Hash#inspect key_value with the same reader as the primary Sample,
# so oracle comparisons use one parser.
module Legacy
  class Sample < LegacyRecord
    self.table_name = 'samples'

    # Parse the legacy key_value string into a plain Hash, reusing the primary
    # Sample reader (string parsing only; no query on the primary connection).
    def to_hash
      ::Sample.new(key_value: key_value).to_hash
    end
  end
end
