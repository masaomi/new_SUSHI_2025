# lib/fgcz.rb defines `module FGCZ` — the LDAP-backed project-membership resolver
# (FGCZ.get_user_projects2). Zeitwerk would expect fgcz.rb -> `Fgcz`, so the file
# is not autoloaded; require it explicitly so ApiToken#allowed_projects (user
# principal) and ProjectAuthorizable can resolve a login's current projects.
require Rails.root.join("lib", "fgcz").to_s
