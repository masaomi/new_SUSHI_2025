# Pagination and Search Architecture
**Last Updated:** 2026-01-29     

This document explains how our pagination and search system works, focusing on the separation of concerns between URL state management and data fetching.   
The key insight is that **URL state management and data fetching are separate concerns** that work together through reactive programming principles.

## Architecture Overview

Our pagination system consists of two main layers:

1. **URL State Management**: Hooks that synchronize form inputs with URL parameters
2. **Data Fetching**: Hooks that automatically refetch data when URL parameters change

## Point 1: URL State Synchronization

The `useSearch` and `usePagination` hooks have a **single responsibility**: synchronizing user input with URL parameters.

### useSearch Hook

```tsx
const { searchQuery, localQuery, setLocalQuery, onSubmit } = useSearch(paramName, debounceMs);
// Example: useSearch('q', 300) - uses ?q= parameter with 300ms debounce
```

**What it does:**
- Reads the specified URL parameter → `searchQuery`
- Maintains local input state → `localQuery` (for immediate UI feedback)
- Debounces input changes before updating URL
- Synchronizes browser navigation (back/forward buttons)
- Resets page to 1 when search changes

**What it does NOT do:**
- Does not fetch data
- Does not know about datasets, jobs, or any business logic
- Only manages the specified URL parameter

### usePagination Hook

```tsx
const { page, per, goToPage, changePerPage } = usePagination(defaultPerPage);
```

**What it does:**
- Reads `page` and `per` parameters from URL
- Provides functions to update these URL parameters
- Resets to page 1 when changing per-page count

**What it does NOT do:**
- Does not fetch data
- Does not calculate total pages or items
- Only manages `page` and `per` URL parameters

### Key Point: Pure URL Management

```tsx
// These hooks only produce values from URL:
const { searchQuery } = useSearch('q');                    // From useSearch
const { page, per } = usePagination(10);                   // From usePagination

// They don't know what data will be fetched with these parameters
```

## Point 2: Automatic Data Refetching

Data fetching hooks (or direct `useQuery`) automatically refetch when URL-derived values change.

### Option A: Direct useQuery (more flexible)

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['datasets', projectNumber, { q: searchQuery, page, per }],
  queryFn: () => projectApi.getProjectDatasets(projectNumber, { q: searchQuery, page, per }),
  placeholderData: keepPreviousData,
  staleTime: 60_000,
});
```

### Option B: useProjectDatasets Hook (more convenient)

```tsx
const { datasets, total, totalPages, isLoading } = useProjectDatasets({
  projectNumber,
  datasetName: searchQuery,  // ← From useSearch hook
  page,                      // ← From usePagination hook
  per                        // ← From usePagination hook
});
```

**How it works:**
- Uses TanStack Query with a cache key that includes all parameters
- When any parameter changes, the cache key changes
- TanStack Query automatically triggers a new API call for the new cache key
- Previous data is shown while loading (via `placeholderData: keepPreviousData`)

### Data Flow Example

```
User types "test" in search input
↓
useSearch: localQuery = "test" (immediate UI update)
↓  
After 300ms debounce: URL updates to ?q=test&page=1
↓
useSearch: searchQuery = "test" (derived from new URL)
↓
useProjectDatasets: receives new searchQuery
↓
TanStack Query: cache key changes, triggers API call
↓
API: GET /api/v1/projects/1001/datasets?q=test&page=1&per=50
↓
Component: re-renders with filtered datasets
```

## Complete Flow in Code

```tsx
function ProjectDatasetsPage() {
  // Step 1: Get URL-derived values
  const { searchQuery, localQuery, setLocalQuery, onSubmit } = useSearch('q');
  const { page, per, goToPage, changePerPage } = usePagination(10);

  // Step 2: Pass values to data fetching hook
  const { datasets, total, totalPages, isLoading } = useProjectDatasets({
    projectNumber,
    datasetName: searchQuery,  // ← URL-derived
    page,                      // ← URL-derived
    per                        // ← URL-derived
  });
  
  // Step 3: Render UI
  return (
    <div>
      <input 
        value={localQuery}                    // ← Local state for immediate feedback
        onChange={(e) => setLocalQuery(e.target.value)} 
      />
      <select 
        value={per} 
        onChange={(e) => changePerPage(Number(e.target.value))}
      >
        {/* per-page options */}
      </select>
      
      {/* Render datasets... */}
      
      <button onClick={() => goToPage(page - 1)}>Previous</button>
      <button onClick={() => goToPage(page + 1)}>Next</button>
    </div>
  );
}
```
