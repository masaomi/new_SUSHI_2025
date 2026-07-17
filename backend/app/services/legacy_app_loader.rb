# Loads SUSHI application classes for headless execution.
#
# Two sources, in precedence order:
#   1. Backend-native ported apps in lib/apps/*App.rb  -> loaded as-is (they
#      `require_relative` the backend headless SushiFabric shim themselves).
#   2. Allow-listed legacy SUSHI apps from config.legacy_apps_dir -> loaded onto the
#      SAME backend shim by neutralizing their `require 'sushi_fabric'`,
#      `require_relative 'global_variables'` and top-level `include GlobalVariables`
#      lines (which would otherwise bind them to the legacy gem base class, not the
#      headless shim) and eval-ing the source with the shim preloaded.
#
# Only allow-listed legacy apps are exposed, because not every legacy app is
# headless-safe yet (e.g. SAMPLE-mode apps need per-sample fan-out — see the
# process_mode gap). The allow-list grows as apps are verified end-to-end.
#
# Used by ApplicationConfigParser (list/show) and JobSubmissionService (submit).
class LegacyAppLoader
  NATIVE_APPS_DIR = Rails.root.join('lib', 'apps')

  class << self
    # All exposed app base names (without the "App" suffix), sorted & deduped.
    def list_apps
      (native_app_names + legacy_app_names).uniq.sort
    end

    # Whether an app is resolvable (native or allow-listed legacy).
    def available?(app_name)
      !resolve(normalize(app_name)).first.nil?
    end

    # Define (if needed) and return the app class, or nil on failure.
    def load(app_name)
      source, path = resolve(normalize(app_name))
      return nil unless source

      ensure_shim_loaded
      case source
      when :native then Kernel.load(path)
      when :legacy then eval_legacy(path)
      end
      # Use the canonical class name from the actual file basename (preserves case,
      # so a case-insensitive lookup like "fastqc" still resolves FastqcApp).
      Object.const_get(File.basename(path, '.rb'))
    rescue StandardError => e
      Rails.logger.error("LegacyAppLoader.load(#{app_name}) failed: #{e.class}: #{e.message}")
      Rails.logger.error(e.backtrace.first(5).join("\n")) if e.backtrace
      nil
    end

    # Normalize to the class name form (add "App" suffix if absent).
    def normalize(app_name)
      n = app_name.to_s.gsub(/[^a-zA-Z0-9_]/, '')
      n.end_with?('App') ? n : "#{n}App"
    end

    private

    def native_app_names
      Dir.glob(NATIVE_APPS_DIR.join('*App.rb')).map { |f| File.basename(f, 'App.rb') }
    end

    def legacy_apps_dir
      dir = Rails.application.config.try(:legacy_apps_dir).to_s
      dir.present? && Dir.exist?(dir) ? dir : nil
    end

    def legacy_allowlist
      Array(Rails.application.config.try(:legacy_apps_allowlist))
    end

    def legacy_app_names
      dir = legacy_apps_dir
      return [] unless dir
      legacy_allowlist.select { |base| File.exist?(File.join(dir, "#{base}App.rb")) }
    end

    # Resolve to [:native | :legacy, absolute_path] or [nil, nil].
    # Native (ported) apps always win over a legacy app of the same name.
    # Matching is case-insensitive (e.g. "fastqc" resolves FastqcApp.rb).
    def resolve(normalized)
      native = NATIVE_APPS_DIR.join("#{normalized}.rb")
      return [:native, native.to_s] if File.exist?(native)

      native_ci = Dir.glob(NATIVE_APPS_DIR.join('*App.rb'))
                     .find { |f| File.basename(f, '.rb').casecmp?(normalized) }
      return [:native, native_ci] if native_ci

      dir = legacy_apps_dir
      if dir
        base = normalized.sub(/App\z/, '')
        allow = legacy_allowlist.find { |a| a.casecmp?(base) }
        if allow
          legacy = File.join(dir, "#{allow}App.rb")
          return [:legacy, legacy] if File.exist?(legacy)
        end
      end
      [nil, nil]
    end

    def ensure_shim_loaded
      return if defined?(SushiFabric::SushiApp)
      require Rails.root.join('lib', 'sushi_fabric.rb').to_s
    end

    # Load a legacy app onto the backend shim. The require/include lines are
    # neutralized so the class subclasses the shim's SushiFabric::SushiApp (already
    # loaded) and inherits GlobalVariables through it, instead of pulling in the
    # legacy gem. The original file path is passed to eval so backtraces stay useful.
    def eval_legacy(path)
      src = File.read(path)
      src = src.gsub(/^\s*require\s+['"]sushi_fabric['"].*$/,
                     "# [LegacyAppLoader] neutralized: require 'sushi_fabric'")
      src = src.gsub(/^\s*require_relative\s+['"]global_variables['"].*$/,
                     "# [LegacyAppLoader] neutralized: require_relative 'global_variables'")
      src = src.gsub(/^\s*include\s+GlobalVariables\s*$/,
                     "# [LegacyAppLoader] neutralized: include GlobalVariables")
      eval(src, TOPLEVEL_BINDING, path) # rubocop:disable Security/Eval
    end
  end
end
