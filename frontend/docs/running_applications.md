# Running Applications - Input Schema
**Last Updated:** 2026-03-02

This document explains the application input schema structure and how it's handled in the frontend.

## Overview

When a user runs an application on a dataset, the frontend needs to know:
1. What parameters the application accepts
2. How to group and display those parameters
3. What types and defaults each parameter has

## Example Response

```json
{
  "application": {
    "name": "CountQC",
    "class_name": "CountQC",
    "category": "QC",
    "description": "Quality control analysis for count data",
    "required_columns": ["Name", "Count"],
    "required_params": ["cores", "ram"],
    "modules": ["Tools/QC"],
    "param_groups": [
      {
        "id": "resources",
        "title": "Resource Parameters",
        "description": "Configure compute resources for the job",
        "fields": [
          { "name": "cores", "type": "integer", "default_value": 8, "description": "Number of CPU cores" },
          { "name": "ram", "type": "integer", "default_value": 32, "description": "RAM in GB" },
          { "name": "scratch", "type": "integer", "default_value": 400, "description": "Scratch space in GB" },
          { "name": "partition", "type": "select", "default_value": "normal", "options": ["normal", "high", "low"], "description": "Cluster partition" }
        ]
      },
      {
        "id": "analysis",
        "title": "Tool Parameters",
        "description": "Configure analysis parameters",
        "fields": [
          { "name": "ref", "type": "select", "default_value": "hg38", "options": ["hg38", "hg19", "mm10", "mm39"], "description": "Reference genome" },
          { "name": "paired", "type": "boolean", "default_value": true, "description": "Paired-end data" }
        ]
      }
    ]
  }
}
```

## Frontend Implementation

### Multi-Step Form

The frontend renders parameter groups as a multi-step wizard:

1. **URL-based Navigation**: Steps are tracked via URL query params (`?step=1`, `?step=2`)
2. **FormStepper Component**: Visual progress indicator showing current step
3. **StepNavigation Component**: Back/Next buttons for navigation

### Key Files

| File | Purpose |
|------|---------|
| `lib/types/app-form.ts` | TypeScript interfaces for the schema |
| `lib/api/applications.ts` | API calls to fetch form schema |
| `lib/hooks/application/useApplicationForm.ts` | Form state management hook |
| `lib/utils/form-renderer.tsx` | Field rendering utilities |
| `app/.../run-application/[appName]/page.tsx` | Main form page |
| `app/.../run-application/[appName]/FormStepper.tsx` | Step progress indicator |
| `app/.../run-application/[appName]/StepNavigation.tsx` | Navigation buttons |

### Field Type Rendering

The `FormFieldComponent` in `form-renderer.tsx` handles each field type:

- `text`: Standard text input
- `integer`: Number input with step=1
- `float`/`number`: Number input with step=any
- `select`: Dropdown with options
- `multi_select`: Multi-select dropdown
- `boolean`: Checkbox with inline label
- `section`: Section header (non-input)

### Field Validation

The form supports dynamic validation where field changes trigger a backend request to get an updated schema. This is useful for limiting dropdown options based on other field values.

When a user changes a field and leaves it (on blur), the frontend sends the current form values to:

```
POST /api/v1/application_configs/{appName}/validate
Body: { config: { cores: 8, ram: 32, ref: "hg38", ... } }
```

The backend responds with an updated `AppFormResponse`. The frontend then:
1. Updates the field configurations (new options, disabled states, etc.)
2. Updates form values with any new defaults from the response

This enables scenarios like:
- Selecting a reference genome filters available annotation options
- Choosing a partition updates the maximum allowed cores/RAM
- Enabling a feature reveals additional related parameters
