# Service to parse SUSHI Application Ruby files and extract configuration
# This service loads *App.rb files from the apps directory and extracts
# metadata, parameters, and form field definitions
class ApplicationConfigParser
  class << self
    # Parse a SUSHI application file and return its configuration
    # @param app_name [String] The application name (e.g., 'Fastqc')
    # @return [Hash, nil] Configuration hash or nil if app not found
    def parse(app_name)
      app_class = LegacyAppLoader.load(app_name)
      return nil unless app_class

      begin
        extract_config(app_class)
      rescue StandardError => e
        Rails.logger.error("Error parsing #{app_name}App: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
        nil
      end
    end

    # List all available application names (native + allow-listed legacy)
    # @return [Array<String>] Array of application names
    def list_apps
      LegacyAppLoader.list_apps
    end

    private

    def extract_config(app_class)
      class_name = app_class.name

      # Create an instance to extract configuration
      instance = app_class.new

      # Extract configuration
      {
        name: instance.name,
        class_name: class_name,
        analysis_category: instance.analysis_category,
        description: clean_description(instance.description),
        required_columns: instance.required_columns,
        required_params: instance.required_params,
        form_fields: extract_form_fields(instance),
        modules: instance.modules,
        inherit_tags: instance.inherit_tags,
        inherit_columns: instance.inherit_columns
      }
    end
    
    def extract_form_fields(instance)
      params = instance.params
      metadata = params.all_metadata
      fields = []
      
      params.each do |key, value|
        next if key.to_s.empty?
        
        field = build_field_definition(key, value, metadata[key] || {})
        fields << field
      end
      
      fields
    end
    
    def build_field_definition(key, value, meta)
      field = {
        name: key.to_s,
        type: infer_field_type(value, meta),
        default_value: extract_default_value(value),
        description: meta['description'] || meta[:description]
      }
      
      # Special handling for partition field - get options from config/SLURM
      if key.to_s == 'partition'
        partitions = SushiConfigHelper.available_partitions
        field[:type] = 'select'
        field[:options] = partitions
        field[:default_value] = SushiConfigHelper.default_partition
      # Add options for select fields
      elsif value.is_a?(Array)
        field[:options] = value
      end
      
      # Add multi_selection flag if present
      if meta['multi_selection'] || meta[:multi_selection]
        field[:multi_selection] = true
        field[:selected] = meta['selected'] || meta[:selected]
      end
      
      # Add hr-header for section headers
      if meta['hr-header'] || meta[:'hr-header']
        field[:section_header] = meta['hr-header'] || meta[:'hr-header']
      end
      
      # Add hr flag for horizontal rule
      if meta['hr'] || meta[:hr]
        field[:horizontal_rule] = true
      end
      
      field.compact
    end
    
    def infer_field_type(value, meta)
      return 'section' if meta['hr-header'] || meta[:'hr-header']
      
      case value
      when Array
        if meta['multi_selection'] || meta[:multi_selection]
          'multi_select'
        else
          'select'
        end
      when TrueClass, FalseClass
        'boolean'
      when Integer
        'integer'
      when Float
        'float'
      when Numeric
        'number'
      else
        'text'
      end
    end
    
    def extract_default_value(value)
      case value
      when Array
        value.first
      else
        value
      end
    end
    
    def clean_description(description)
      return '' if description.nil?
      
      # Remove excessive whitespace and newlines
      description.to_s.strip.gsub(/\s+/, ' ')
    end
  end
end

