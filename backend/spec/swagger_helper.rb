# frozen_string_literal: true

require 'rails_helper'

RSpec.configure do |config|
  # Specify a root folder where Swagger JSON files are generated
  # NOTE: If you're using the rswag-api to serve API descriptions, you'll need
  # to ensure that it's configured to serve Swagger from the same folder
  config.openapi_root = Rails.root.join('swagger').to_s

  # Define one or more Swagger documents and provide global metadata for each one
  # When you run the 'rswag:specs:swaggerize' rake task, the complete Swagger will
  # be generated at the provided relative path under openapi_root
  # By default, the operations defined in spec files are added to the first
  # document below. You can override this behavior by adding a openapi_spec tag to the
  # the root example_group in your specs, e.g. describe '...', openapi_spec: 'v2/swagger.json'
  # NOTE (B1, contract-first):
  #   `swagger/v1/swagger.yaml` is now the HAND-AUTHORED, AUTHORITATIVE OpenAPI
  #   contract — the single source of truth for the Rails v8 API and the FastAPI
  #   server. It MUST NOT be the swaggerize target. The rswag generator therefore
  #   writes to a disposable, git-ignored file used only for optional drift
  #   detection. See backend/swagger/v1/README.md.
  config.openapi_specs = {
    'v1/_generated_from_specs.yaml' => {
      openapi: '3.0.1',
      info: {
        title: 'API V1 (generated from specs — NOT authoritative)',
        version: 'v1'
      },
      paths: {},
      servers: [
        { url: '/' }
      ]
    }
  }

  # Specify the format of the output Swagger file when running 'rswag:specs:swaggerize'.
  # The openapi_specs configuration option has the filename including format in
  # the key, this may want to be changed to avoid putting yaml in json files.
  # Defaults to json. Accepts ':json' and ':yaml'.
  config.openapi_format = :yaml
end
