# Types

## Project Types

| API call | Return Type | Hooks |
|------|---------|--|
|`projectApi.getUserProjects()` | `UserProjectsResponse` | `useProjectList` |

### Dataset Types

| API call | Return Type | Subtypes | Hooks | 
|------|---------|------|-----|
| `projectApi.getProjectDatasets(projectId, params:{datasetName, user, page, per})` | `DatasetListResponse` | `DatasetMinimal` | `useProjectDatasets` |
| `datasetApi.getDataset(id)` | `DatasetFullResponse` | | `useDatasetBase` |
| `DatasetSample` | 
| `DatasetAppCategory` | 
| `DatasetTreeNode` | | | `useDatasetTree` | 

## Job Types 

| API call | Return Type | Subtypes | Hooks |
|------|---------|--------|------|
| `jobApi.getAllJobs(params:{datasetName, user, page, per})` | `JobListResponse` | `JobMinimal` | `useAllJobs` |
| `projectApi.getProjectJobs(projectId, params:{datasetName, user, page, per})` | `JobListResponse` | `JobMinimal` | `useProjectJobs` |
| `jobApi.getJob(jobId)` | `JobFullResponse` | | `useJobBase` |
| `jobApi.submitJob(JobSubmissionRequest)` | `JobSubmissionResponse` | `DynamicFormData` | 

## Authentication Types 

| Type | Purpose | Used In |
|------|---------|---------|
| `AuthenticationStatus` | Return type for `getAuthenticationStatus()` | `lib/api/auth.ts` |
| `AuthenticationConfig` | Return type for `getAuthenticationConfig()` | `lib/api/auth.ts` |
| `LoginResponse` | Return type for `login()` and `register()` | `lib/api/auth.ts` |
| `TokenVerifyResponse` | Return type for `verifyToken()` | `lib/api/auth.ts` |

## App Form Types

| Type | Purpose | Primary Usage |
|------|---------|---------------|
| `AppFormField` | Dynamic form field definition | 
| `AppFormResponse` | API response structure (includes app description) |

