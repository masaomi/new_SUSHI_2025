# frozen_string_literal: true
#
# B1 contract smoke test (no new gem). Validates the AUTHORITATIVE hand-authored
# OpenAPI contract `swagger/v1/swagger.yaml` for well-formedness and the B1
# invariants. This is structural only; full schema conformance against the running
# servers is the repo-root language-agnostic Python runner's job (later step).
#
# Intentionally does NOT require rails_helper — it is a pure YAML structural check.

require 'yaml'
require 'set'

RSpec.describe 'OpenAPI contract (swagger/v1/swagger.yaml)', type: :contract do
  CONTRACT_PATH = File.expand_path('../../swagger/v1/swagger.yaml', __dir__)
  HTTP_METHODS = %w[get put post delete options head patch trace].freeze
  REF_SECTIONS = %w[
    schemas parameters responses requestBodies securitySchemes
    examples headers links callbacks
  ].freeze

  let(:doc) { YAML.safe_load(File.read(CONTRACT_PATH), aliases: true) }

  # Collect [json_pointer_string] for every "$ref" anywhere in the document.
  def collect_refs(node, acc = [])
    case node
    when Hash
      node.each do |k, v|
        if k == '$ref' && v.is_a?(String)
          acc << v
        else
          collect_refs(v, acc)
        end
      end
    when Array
      node.each { |v| collect_refs(v, acc) }
    end
    acc
  end

  # Yield [path, method, operation_hash] for every operation.
  def each_operation
    (doc['paths'] || {}).each do |path, item|
      next unless item.is_a?(Hash)
      item.each do |method, op|
        next unless HTTP_METHODS.include?(method)
        yield path, method, op
      end
    end
  end

  it 'is valid YAML with the required top-level keys' do
    expect(doc).to be_a(Hash)
    %w[openapi info paths components].each do |key|
      expect(doc).to have_key(key), "missing top-level key: #{key}"
    end
    expect(doc['openapi']).to start_with('3.0')
  end

  it 'declares servers[0].url == "/api/v1" and never embeds it in path keys' do
    expect(doc.dig('servers', 0, 'url')).to eq('/api/v1')
    (doc['paths'] || {}).keys.each do |path|
      expect(path).not_to include('/api/v1'),
        "path key embeds /api/v1 (normalize relative to servers.url): #{path}"
    end
  end

  it 'has only internal #/components/<section>/<name> $refs that resolve' do
    collect_refs(doc).each do |ref|
      expect(ref).to match(%r{\A#/components/[^/]+/[^/]+\z}),
        "unexpected $ref form (external or #/paths refs are not allowed): #{ref}"
      # ref == "#/components/<section>/<name>"
      _, _components, section, name = ref.split('/')
      expect(REF_SECTIONS).to include(section), "unknown components section in #{ref}"
      target = doc.dig('components', section, name)
      expect(target).not_to be_nil, "$ref target does not exist: #{ref}"
    end
  end

  it 'gives every operation a unique operationId' do
    ids = []
    each_operation { |_p, _m, op| ids << op['operationId'] }
    expect(ids).to all(be_a(String))
    dupes = ids.tally.select { |_id, n| n > 1 }.keys
    expect(dupes).to be_empty, "duplicate operationIds: #{dupes.inspect}"
  end

  it 'gives every operation >=1 response and a 2xx (unless x-error-only)' do
    each_operation do |path, method, op|
      responses = op['responses'] || {}
      expect(responses).not_to be_empty, "#{method.upcase} #{path} has no responses"
      next if op['x-error-only'] == true
      has_2xx = responses.keys.any? { |code| code.to_s =~ /\A2\d\d\z/ }
      expect(has_2xx).to be(true),
        "#{method.upcase} #{path} has no 2xx response (mark x-error-only: true if intentional)"
    end
  end

  it 'tags every operation and sets x-maturity to ratified|draft' do
    each_operation do |path, method, op|
      expect(op['tags']).to be_a(Array).and(be_any),
        "#{method.upcase} #{path} has no tag"
      expect(%w[ratified draft]).to include(op['x-maturity']),
        "#{method.upcase} #{path} has invalid x-maturity: #{op['x-maturity'].inspect}"
    end
  end

  # B1 invariant: spec consolidation only, no implementation -> everything is draft.
  # Endpoints are promoted to `ratified` in their implementing step (auth=B2, datasets=B3).
  it 'has every operation at x-maturity: draft in B1' do
    each_operation do |path, method, op|
      expect(op['x-maturity']).to eq('draft'),
        "#{method.upcase} #{path} is not draft (ratified promotion belongs to B2/B3)"
    end
  end
end
