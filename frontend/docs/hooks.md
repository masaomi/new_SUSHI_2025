# Hooks Documentation

**Last Updated:** 2026-01-29

Custom logic that instead of being written in a page.tsx, is encapsulated to their own files for sharing code and keeping components clean.

## Table of Contents

1. [Shared Hooks](#shared-hooks)
2. [Project Hooks](#project-hooks)
3. [Dataset Hooks](#dataset-hooks)
4. [Job Hooks](#job-hooks)
5. [Application Hooks](#application-hooks)
6. [Hook Patterns](#hook-patterns)

## Shared Hooks

Reusable hooks for common UI patterns across listing pages (datasets, jobs, projects). These handle URL-driven pagination and search.

### `useSearch`
USED ONLY ONCE ON projects/id/jobs/page.tsx!!!!   
**Location:** `lib/hooks/shared/useSearch.ts`

**Purpose:** Returns variables to handle the synchronization of URL params and local variables. Once the localQuery is updated, the debounceTime triggers a URL params update to this variable.

**Usage:**
```tsx
const { localQuery, setLocalQuery, onSubmit } = useSearch('q', 300);

<form onSubmit={onSubmit}>
  <input value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} />
</form>
```

Updating this input field, will put `?q=UserInput` at the end of the URL, and keep the variable and this parameter synchronized.   

**Returns:**
- `localQuery` - updates immediately when user types (bind to input field)
- `searchQuery` - stable URL value after debounce (use for API calls)
- `setLocalQuery` - setter for the input value
- `onSubmit` - form submit handler
   
searchQuery is used as the final value, what we see at the URL after the debounce, to use for other API calls, instead of relying on localQuery, which can be changed more easily.

**Flow:**
1) useSearch gives you the variables and functions
2) user edits an input field, we update the localQuery on the `page.tsx` side 
3) useSearch handles debounce, and updates the URL 
4) searchQuery is syncrhonized to the URL, and this variable can then be used for further API calls.

---

### `usePagination`

**Location:** `lib/hooks/shared/usePagination.ts`   
Used only once in projecets/id/jobs/page.tsx

**Purpose:** Returns `page` and `per` variables after reading them from URL. Offers goToPage and changePerPage to update URL params with new values.

**Returns:**
```typescript
{
  page: number;                          // Current page (from URL)
  per: number;                           // Items per page (from URL)
  goToPage: (page: number) => void;      // Navigate to specific page
  changePerPage: (per: number) => void;  // Change items per page (resets to page 1)
}
```

---

## Project Hooks

Hooks for fetching and managing project-related data.

### `useProjectList`

**Location:** `lib/hooks/project/useProjectList.ts`   
Used only once in the Header.   

**Purpose:** Calls projectApi.getUserProjects and returns the data/error/isLoading

**Returns:**
```typescript
{
  userProjects: UserProjectsResponse | undefined;
  isLoading: boolean;    // Includes auth loading state
  error: Error | null;
  isEmpty: boolean;      // True if loaded but no projects
  refetch: () => void;
}
```

---

### `useProjectDatasets`

`lib/hooks/project/useProjectDatasets.ts`   
Used in `projects/[id]/datasets/page.tsx`

**Purpose:** Calls `projectApi.getProjectDatasets()` with pagination and filters, returns datasets list with loading/error states.

**Usage:**
```tsx
const { datasets, total, totalPages, isLoading, error, isEmpty } = useProjectDatasets({
  projectNumber,
  datasetName: searchQuery,  // optional search filter
  user: userFilter,          // optional user filter
  page,
  per,
});
```

Uses `keepPreviousData` to prevent UI flash during pagination.   

---

### `useProjectJobs`

`lib/hooks/project/useProjectJobs.ts`  
Used in `projects/[id]/jobs/page.tsx`

**Purpose:** Calls `projectApi.getProjectJobs()` with pagination, returns jobs list with loading/error states.

**Usage:**
```tsx
const { jobs, total, totalPages, isLoading, error, isEmpty } = useProjectJobs({
  projectNumber,
  user: userFilter,
  page,
  per,
});
```

---

## Dataset Hooks

Hooks for fetching individual dataset data.

### `useDatasetBase`

`lib/hooks/dataset/useDatasetBase.ts`   
Used in dataset detail pages (`projects/[id]/datasets/[datasetId]/...`)

**Purpose:** Calls `datasetApi.getDataset()` to fetch full dataset info.

**Usage:**
```tsx
const { dataset, isLoading, error, notFound, refetch } = useDatasetBase(datasetId);
```

Returns `notFound: true` if the dataset doesn't exist.

---

### `useDatasetTree`

`lib/hooks/dataset/useDatasetTree.ts`
Used in `projects/[id]/datasets/page.tsx` (tree view)

**Purpose:** Calls `datasetApi.getDatasetTree()` to fetch parent-child dataset relationships.

**Usage:**
```tsx
const { datasetTree, isLoading, error, isEmpty, refetch } = useDatasetTree(datasetId);
```

---

### `useImportDatasetForm`

`lib/hooks/dataset/useImportDatasetForm.ts`
Used in `projects/[id]/datasets/import/page.tsx`

**Purpose:** Manages the import dataset form: file selection, validation, parent dataset selection, and submission.

**Usage:**
```tsx
const {
  file, datasetName, setDatasetName,
  parentId, parentIdInput, parentIdError,
  noParent, treeSearch, setTreeSearch,
  isSubmitting, error, isDragOver,
  handleFileChange, handleDragOver, handleDragLeave, handleDrop,
  handleParentIdChange, handleTreeSelect, handleNoParentChange,
  handleSubmit,
} = useImportDatasetForm({ projectNumber, treeData });
```

Handles file type validation (.txt, .csv, .tsv), parent ID existence validation, and form submission via `projectApi.importDataset()`.

---

## Job Hooks

Hooks for job filtering and fetching.

### `useJobsFilters`

`lib/hooks/job/useJobsFilters.ts`
Used in `projects/[id]/jobs/page.tsx`

**Purpose:** Like `useSearch`, but for multiple filter fields (status, date range). Returns local values for UI binding and URL-synced values for API calls.

**Usage:**
```tsx
const { filters, localFilters, setStatusLocal, setFromDateLocal, setToDateLocal, clearFilters } = useJobsFilters();

// Bind localFilters to inputs
<select value={localFilters.status} onChange={(e) => setStatusLocal(e.target.value)} />
<input type="date" value={localFilters.from_date} onChange={(e) => setFromDateLocal(e.target.value)} />

// Use filters (URL-synced) for API calls
fetchJobs({ status: filters.status, from_date: filters.from_date, to_date: filters.to_date });
```

---

### `useAllJobs` / `useJobBase`

`lib/hooks/job/useAllJobs.ts`, `lib/hooks/job/useJobBase.ts`

⚠️ Not implemented (empty files)

---

## Application Hooks

Hooks for running applications (job submission forms).

### `useApplicationFormSchema`

`lib/hooks/application/useApplicationFormSchema.ts`   
Used in `run-application/[appName]/page.tsx`

**Purpose:** Calls `applicationApi.getFormSchema()` to fetch form field definitions for an application.

**Usage:**
```tsx
const { data: formConfig, isLoading, error } = useApplicationFormSchema(appName);
// formConfig.application.form_fields contains the field definitions
```

---

### `useApplicationForm`

`lib/hooks/application/useApplicationForm.ts`   
Used in `run-application/[appName]/page.tsx`

**Purpose:** Manages the entire run-application form: next dataset naming, form values, field configuration, and validation. Extracted from page.tsx to keep it clean.

**Usage:**
```tsx
const {
  nextDatasetData,     // { datasetName, datasetComment } for output dataset
  formValues,          // current form field values
  fieldConfig,         // field definitions (may change after validation)
  handleInputChange,   // for nextDataset name/comment inputs
  handleFieldChange,   // for dynamic form fields
  handleFieldBlur,     // triggers validation API
  handleKeyDown,       // Enter key moves to next field
} = useApplicationForm({
  appName,
  datasetName: dataset?.name,
  formFields: formConfig?.form_fields,
  resubmitParams: resubmitData?.parameters,
  isResubmit,
});
```

**Internal behavior:**
- Auto-generates next dataset name: `{appName}_{datasetName}_{date}`
- Initializes form with defaults (or resubmit params if resubmitting)
- On field blur: calls `validateAppConfig()` which may disable fields or update defaults
- Enter key navigates to next field instead of submitting

---

### `useJobSubmission`

`lib/hooks/application/useJobSubmission.ts`  
Used in `run-application/[appName]/confirm/page.tsx`

**Purpose:** Calls `jobApi.submitJob()` and tracks submission state.

**Usage:**
```tsx
const { submitJob, isSubmitting, error, success, resetState } = useJobSubmission();

<button onClick={() => submitJob(jobData)} disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
{error && <p>{error}</p>}
{success && <p>Job submitted!</p>}
```

---

## Hook Patterns

### URL-Driven State (useSearch, usePagination, useJobsFilters)

These hooks sync state with URL parameters for shareable links and browser history. They return two versions of each value:
- `localValue` - for binding to inputs (immediate updates)
- `value` - from URL, for API calls (debounced/stable)

### Data Fetching (useProjectList, useProjectDatasets, useDatasetBase, etc.)

All use React Query's `useQuery` with:
- `staleTime: 60_000` (1 minute cache)
- `keepPreviousData` for pagination (prevents flash)
- Computed states like `isEmpty`, `notFound`

### Form State (useApplicationForm, useJobSubmission, useImportDatasetForm)

Manage form values and submission state, returning handlers and status flags.

---

## Import

All hooks re-exported from `lib/hooks/index.ts`:

```typescript
import { useSearch, usePagination, useProjectList, ... } from '@/lib/hooks';
```
