## Quick Resume 
| Route | Used In | Function |
|-------|---------|----------|
| `/api/v1/projects (GET)` | `/projects` | `useProjectList -> projectApi.getUserProjects()` |
| `/api/v1/projects/{id}/datasets (GET)` | `/projects/{id}/datasets` | `useProjectDatasets -> projectApi.getProjectDatasets()` |
| `/api/v1/projects/{id}/datasets (GET)` | `/projects/{id}/datasets (PAGINATION)` | `{q?, user?, page?, per?}` |
| `/api/v1/projects/{id}/datasets/tree (GET)` | `/projects/{id}/datasets` | `useProjectJobs -> projectApi.getProjectDatasetsTree()` |
| `(TODO)` | `/projects/{id}/datasets/import` | `(?) -> projectApi.importDataset()` |
| `(TODO)` | `/projects/{id}/gStore/{path}` | `(?) -> gstoreApi.listPath()` |
| `(TODO)` | `/projects/{id}/gStore/{path} (PAGINATION)` | `` |
| `(TODO)` | `/projects/{id}/datasets` | `(?) -> datasetApi.deleteDatasets()` |
| `(TODO)` | `/projects/{id}/datasets` | `(?) -> projectApi.downloadDatasets()` |
| `/api/v1/projects/{id}/jobs (GET)` | `/projects/{id}/jobs` | `useProjectDatasets -> projectApi.getProjectJobs()` |
| `/api/v1/projects/{id}/jobs (GET)` | `/projects/{id}/jobs (PAGINATION)` | `{status?, user?, dataset_id?, from_date?, to_date?, page?, per?}` |
| `(TODO) /api/v1/jobs/{id}/show-script (GET)` | `/jobs/{id}/script` | `jobApi.showJobScript()` |
| `(TODO) /api/v1/jobs/{id}/show-log (GET)` | `/jobs/{id}/log` | `jobApi.showJobLog()` |
||||
| `/api/v1/datasets/{id} (GET)` | `/projects/{id}/datasets/{id}` | `useDatasetBase -> datasetApi.getDataset()` |
| `/api/v1/datasets/{id}/tree (GET)` | `/projects/{id}/datasets/{id}` | `useDatasetBase -> datasetApi.getDatasetTree()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.updateDatasetComment()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.renameDatasetName()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.downloadDataset(?)()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.showDatasetScripts()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.openMergeDatasetPage()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.openDatasetParameters()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.updateDatasetResourceSize()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.updateDatasetBFabricId()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.announceDataset()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.openGeoUploader()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.openFactorsPage()` |
| `(TODO)` | `/projects/{id}/datasets/{id}` | `(?) -> datasetApi.openSamplesDataFolder()` |
||||
| `/api/v1/jobs (POST)` | `/projects/{id}/datasets{id}/run-application/{app}/confirm` | `useJobSubmission -> jobApi.submitJob()` |
| `/api/v1/jobs (GET)` | `` | `` |
||||
| `/api/v1/application_configs/{appName} (GET)` | `/projects/{id}/datasets{id}/run-application/{app}` | `applicationApi.getFormSchema()` |
||||
| `/api/v1/login (POST)` | `/login` | `authApi.login()` |
| `/api/v1/register (POST)` | `/login` | `authApi.register()` |
## Project APIs

### ProjectApi (`lib/api/projects.ts`)

| Route | Returns | Used In | Function |
|-------|---------|---------|----------|
| `GET /api/v1/projects` | `UserProjectsResponse` | `/projects` | `useProjectList` → `projectApi.getUserProjects()` |
| `GET /api/v1/projects/{id}/datasets - { q?, user?, page?, per?}` | `DatasetListResponse` | `/projects/:id/datasets` | `useProjectDatasets` → `projectApi.getProjectDatasets()` |
| `GET /api/v1/projects/{id}/jobs - { status?, user?, dataset_id?, from_date?: string, to_date?: string, page?, per?}` | `JobListResponse` | `/projects/:id/jobs` | `useProjectJobs` → `projectApi.getProjectJobs()` |
| `GET /api/v1/projects/{id}/datasets/tree` | `{ tree: DatasetTreeResponse }` | `/projects/:id/datasets` (tree view) | `useProjectDatasets` → `projectApi.getProjectDatasetsTree()` |

**Return Types:**
- `UserProjectsResponse`: `{ projects: Array<{ number}>, current_user}`
- `DatasetListResponse`: `{ datasets: DatasetMinimal[], total_count, page, per, project_number}`
- `JobListResponse`: `{ jobs: JobMinimal[], total_count, page, per, project_number, filters: object }`
- `DatasetTreeResponse`: `Array<{ id, text, parent: string|number, a_attr: object, dataset_data: DatasetMinimal }>`

---

## Dataset APIs

### DatasetApi (`lib/api/datasets.ts`)

| Route | Returns | Used In | Function |
|-------|---------|---------|----------|
| `GET /api/v1/datasets/{id}` | `DatasetFullResponse` | `/projects/:id/datasets/:datasetId` | `useDatasetBase` → `datasetApi.getDataset()` |
| `GET /api/v1/datasets/{id}/tree` | `DatasetTreeResponse` | `/projects/:id/datasets/:datasetId` (tree component) | `useDatasetTree` → `datasetApi.getDatasetTree()` |

**Return Types:**
- `DatasetFullResponse`: `{ id, name, sushi_app_name, completed_samples, samples_length, parent_id?, children_ids: number[], user_login, created_at, bfabric_id?, project_number, comment?}`

---

## Job APIs

### JobApi (`lib/api/jobs.ts`)

| Route | Returns | Used In | Function |
|-------|---------|---------|----------|
| `POST /api/v1/jobs - JobSubmissionRequest` | `JobSubmissionResponse` | `/projects/:id/datasets/:datasetId/run-application/:appName/confirm` | `useJobSubmission` → `jobApi.submitJob()` |
| `mock` | `JobFullResponse` | `/jobs/:jobId/logs`, `/jobs/:jobId/script` | Direct call → `jobApi.getJob()` |
| `GET /api/v1/jobs - { datasetName?, user?, page?, per?}` | `JobListResponse` | - | Unused → `jobApi.getAllJobs()` |

**Return Types:**
- `JobSubmissionRequest`: `{ dataset_id, application_name, parameters: DynamicFormData }`
- `JobSubmissionResponse`: `{ id, status, created_at: string, message}`
- `JobFullResponse`: `{ id, status: string, user, input_dataset_id, next_dataset_id, created_at: string, script_path, submit_job_id, start_time: string, end_time?: string, updated_at: string }`

---

## Application APIs

### ApplicationApi (`lib/api/applications.ts`)

| Route | Returns | Used In | Function |
|-------|---------|---------|----------|
| `GET /api/v1/application_configs/{appName}` | `AppFormResponse` | `/projects/:id/datasets/:datasetId/run-application/:appName` | Direct call → `applicationApi.getFormSchema()` |

**Return Types:**
- `AppFormResponse`: `{ app_name, description, fields: AppFormField[] }`
- `AppFormField`: `{ name, type, label, required, default_value?: any, options?: string[], validation?: object }`

---
## Authentication API

### AuthApi (`lib/api/auth.ts`)

| Route | Returns | Used In | Function |
|-------|---------|---------|----------|
| `POST /api/v1/auth/login - { login, password}` | `LoginResponse` | `/login` | Direct call → `authApi.login()` |
| `POST /api/v1/auth/register - { login, email, password, password_confirmation}` | `LoginResponse` | `/login` | Direct call → `authApi.register()` |
| `client-only` | `void` | `/logout`, App-wide (AuthContext) | `useAuth` → `authApi.logout()` |
| `GET /api/v1/auth/verify` | `TokenVerifyResponse` | App-wide (AuthContext) | `useAuth` → `authApi.verifyToken()` |
| `GET /auth/login_options` | `AuthenticationStatus` | App-wide (AuthContext) | `useAuth` → `authApi.getAuthenticationStatus()` |
| `GET /api/v1/authentication_config` | `AuthenticationConfig` | App-wide (AuthContext) | `useAuth` → `authApi.getAuthenticationConfig()` |

**Return Types:**
- `LoginResponse`: `{ token, user: User }`
- `TokenVerifyResponse`: `{ valid, user?: User }`
- `AuthenticationStatus`: `{ authentication_skipped, current_user?}`
- `AuthenticationConfig`: `{ methods: string[], ldap_enabled}`

---

## API Usage by Page

### Pages Overview

| Page | Primary APIs Used | Purpose |
|------|-------------------|---------|
| `/app/login/page.tsx` | `authApi.login()`, `authApi.register()` | User authentication |
| `/app/logout/page.tsx` | `authApi.logout()` | User logout |
| `/app/projects/page.tsx` | `projectApi.getUserProjects()` | List user's accessible projects |
| `/app/projects/[projectNumber]/page.tsx` | - | Project dashboard (no API calls) |
| `/app/projects/[projectNumber]/datasets/page.tsx` | `projectApi.getProjectDatasets()`, `projectApi.getProjectDatasetsTree()` | List/tree view of datasets |
| `/app/projects/[projectNumber]/datasets/[datasetId]/page.tsx` | `datasetApi.getDataset()` | Dataset details |
| `/app/projects/[projectNumber]/datasets/[datasetId]/run-application/[appName]/page.tsx` | `applicationApi.getFormSchema()`, `datasetApi.getDataset()` | Application form |
| `/app/projects/[projectNumber]/datasets/[datasetId]/run-application/[appName]/confirm/page.tsx` | `jobApi.submitJob()` | Job submission |
| `/app/projects/[projectNumber]/jobs/page.tsx` | `projectApi.getProjectJobs()` | List project jobs with filtering |
| `/app/jobs/[jobid]/logs/page.tsx` | `jobApi.getJob()` | Job logs (mock) |
| `/app/jobs/[jobid]/script/page.tsx` | `jobApi.getJob()` | Job script (mock) |

### Authentication Context
The `AuthContext` (`providers/AuthContext.tsx`) uses:
- `authApi.getAuthenticationStatus()`
- `authApi.verifyToken()`
- `authApi.logout()`

---


## Notes

### Backend Parameter Mapping
- Frontend uses `datasetName` but backend expects `q` for dataset search
- Job filters support: `status`, `user`, `dataset_id`, `from_date`, `to_date`, `page`, `per`
- Dataset filters support: `q` (name search), `user`, `page`, `per`

### Authentication
- Token-based authentication with JWT
- Token stored in localStorage via `httpClient`
- Authentication can be skipped in development mode
