# Dynamic Form System Implementation (Run Application)

## Overview

The point is to generate forms dynamically based on a JSON file. This JSON file is to be created and maintained on the EzRun side. 

### Field Types Supported

- **text**: Basic string input
- **integer**: Integer numeric input with step=1
- **float**: Floating point numeric input with step=any
- **number**: General numeric input (legacy)
- **select**: Single-selection dropdown with predefined options
- **multi_select**: Multiple-selection dropdown
- **boolean**: Checkbox input for true/false values
- **section**: Section headers and dividers for form organization

### Core Components

1. **Type Definitions** (`lib/types/app-form.ts`)
3. **API Layer** (`lib/api/applications.ts`) - calls `/api/v1/application-configs/:app_name`
4. **Form Renderer** (`lib/utils/form-renderer.tsx`)
5. **Dynamic Page** (`app/projects/[projectNumber]/datasets/[datasetId]/run-application/[appName]/page.tsx`)

## Type System

### `AppFormResponse` - API Response

```typescript
export interface AppFormResponse {
  application: {
    name: string;
    class_name: string;
    category: string;
    description: string;
    required_columns: string[];
    required_params: string[];
    form_fields: AppFormField[];
    modules: string[];
  }
}

export interface AppFormField {
  name: string;                              // Unique field identifier
  type: "text" | "integer" | "float" | "number" | "select" | "multi_select" | "boolean" | "section";
  default_value?: any;                       // Default value from Ruby app
  description?: string;                      // Field description/help text
  options?: string[];                        // For select/multi_select fields
  multi_selection?: boolean;                 // Flag for multi-select behavior
  selected?: any;                            // Pre-selected values for multi-select
  section_header?: string;                   // Text for section headers
  horizontal_rule?: boolean;                 // Flag to show divider
}
```

### `JobSubmissionRequest` - Form Submission

```typescript
export interface JobSubmissionRequest {
  project_number: number;
  dataset_id: number;
  app_name: string;
  next_dataset: {
    name: string;
    comment?: string;
  };
  parameters: DynamicFormData; // All form field values
}

export interface DynamicFormData {
  [fieldName: string]: any;
}
```

### API Response Example

```json
// GET /api/v1/application-configs/Fastqc
{
  "application": {
    "name": "Fastqc",
    "class_name": "FastqcApp", 
    "category": "Quality Control",
    "description": "A quality control tool for high throughput sequence data",
    "required_columns": ["Name", "Read1"],
    "required_params": ["cores"],
    "form_fields": [
      {
        "name": "cores",
        "type": "select",
        "default_value": "1",
        "options": ["1", "2", "4", "8"]
      },
      {
        "name": "partition", 
        "type": "select",
        "default_value": "normal",
        "options": ["normal", "long"]
      }
    ],
    "modules": ["QC"]
  }
}
```

## Page Implementation

The dynamic form page follows this flow:

1. **Data Fetching**: 
   - Uses `useDatasetBase(datasetId)` → `dataset, isDatasetLoading, datasetError, datasetNotFound`
   - Uses `useApplicationFormSchema(appName)` → `formConfigData, isFormConfigLoading, formConfigError`
   - Extracts `formConfig = formConfigData?.application` for form fields

2. **State Management**: 
   - `nextDatasetData` state manages next dataset name and comment fields
   - `dynamicFormData` state initialized from `formConfig.form_fields` defaults
   - Form updates trigger state changes with type-appropriate parsing

3. **Form Submission**: 
   - Uses `useJobSubmission()` hook for submission logic
   - Creates `JobSubmissionRequest` with `parameters: dynamicFormData`
   - Handles loading states, errors, and success feedback

### Key Implementation Details

```typescript
// Extract application config from API response
const formConfig = formConfigData?.application;

// Initialize form data with backend defaults  
useEffect(() => {
  if (formConfig?.form_fields) {
    setDynamicFormData(initializeFormData(formConfig.form_fields));
  }
}, [formConfig]);

// Render dynamic fields
{formConfig?.form_fields?.map((field) => (
  <FormFieldComponent
    key={field.name}
    field={field}
    value={dynamicFormData[field.name]}
    onChange={handleDynamicFieldChange}
  />
))}
```
