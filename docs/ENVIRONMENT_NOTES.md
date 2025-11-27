# Environment-Specific Notes

This document records environment-specific dependencies and considerations for the SUSHI application.

## SLURM Cluster Dependency

### Overview
The job submission system assumes a SLURM cluster environment is available.

### Affected Components
- `backend/app/helpers/sushi_config_helper.rb` - Fetches partitions via `sinfo` command
- `backend/config/sushi.yml` - Partition configuration
- `backend/lib/sushi_fabric.rb` - Uses partition for job scripts

### SLURM Commands Used
```bash
sinfo --format=%R  # Get available partitions
```

### For Non-SLURM Environments
If deploying to an environment without SLURM:

1. **Disable dynamic partition fetching** in `config/sushi.yml`:
   ```yaml
   development:
     partition:
       default: default
       available: [default]
       dynamic: false
   ```

2. **Or implement alternative scheduler support**:
   - Create a new helper similar to `SushiConfigHelper`
   - Modify `sushi_fabric.rb` to generate scripts for the target scheduler
   - Update job_manager to work with the new scheduler

### Related Configuration
- `SUSHI_TYPE` environment variable: Controls production deployment type
- Options: `production`, `demo`, `course`, `test_server`

## Job Manager Integration

### Overview
The external job_manager expects specific files and formats.

### Required Files
- `parameters.tsv` - Located at `dirname(dirname(script_path))`
- Must contain: `cores`, `ram`, `scratch`, `partition`

### Job Manager Location
- Not part of this repository
- Located at: `/srv/sushi/job_manager_by_masa/` (on FGCZ servers)

## Legacy Database Mode

### Overview
For connecting to old SUSHI MySQL database that lacks email/password columns.

### Activation
```bash
export LEGACY_DATABASE=true
```

### What It Does
- Skips Devise `:validatable` module
- Disables OAuth2, 2FA, wallet authentication features
- Skips migration error checks

---

*Last updated: 2025-11-27*

