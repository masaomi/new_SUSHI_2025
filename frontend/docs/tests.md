# Testing Strategy Overview

## Running Tests

```bash
npm run test         # Interactive watch mode
npm run test:run     # Single run
npm run test:coverage # Coverage report
npm run test:ui      # Visual test interface
```

## Testing Stack
- **Vitest** 
- **@testing-library/react** 
- **MSW (Mock Service Worker)** 
- **happy-dom**
```
┌─────────────────────────────┐
│    Your Test Code           │ ← You write: getByText('hello'), expect().toBe()
├─────────────────────────────┤
│ React Testing Library (RTL) │ ← Provides: getByText, render, fireEvent, user-event
├─────────────────────────────┤  
│ happy-dom                   │ ← Provides: document, window, DOM APIs (faster than jsdom)
├─────────────────────────────┤
│ Vitest                      │ ← Provides: test runner, expect, mocks, coverage, native ESM
├─────────────────────────────┤
│ Node.js                     │ ← Runtime environment where tests execute
└─────────────────────────────┘
```


### Test File Patterns
Vitest automatically discovers and runs files matching these patterns:
- `**/__tests__/**/*.{js,jsx,ts,tsx}`
- `**/*.{test,spec}.{js,jsx,ts,tsx}`

### Test File Organization
We use **co-located testing** where test files live next to the code they test (e.g., `useSearch.ts` and `useSearch.test.ts` in the same directory). This approach makes tests easy to find and maintain alongside the implementation.

Specialized testing:
- **Basic tests**: `page.test.tsx`
- **Specialized tests**: `page.accessibility.test.tsx`
- **Mock variations**: `datasets.error-state.test.ts` (uses custom MSW handlers to simulate API errors)

## renderWithQuery 
`useQuery` needs to be mocked.
The wrapper creates a fresh React Query client configured for testing 

```typescript
test('dataset page loads data', () => {
  render(<DatasetPage />)  // Error: useQuery must be used within QueryClientProvider
  renderWithQuery(<DatasetPage />)  // Component can safely use useQuery hooks
})
```

## MSW (Mock Service Worker) Data Flow

MSW intercepts HTTP requests at the network layer, creating the illusion of a real API without actually running a server.
MSW sits between your application code and the actual network, capturing real HTTP requests and routing them to handler functions that return mock responses. 

### MSW Files Structure

The `mocks/` directory contains the MSW configuration that enables this request interception:

- **`handlers.ts`** - Defines API endpoint responses using `*/api/v1/...` patterns to match any hostname (e.g., `*/api/v1/projects/:id/datasets`). Contains filtering logic based on request parameters.
- **`server.ts`** - Sets up MSW for Node.js testing environment with Vitest lifecycle hooks (`beforeAll`, `afterEach`, `afterAll`)
- **`data/`** - Contains realistic mock data files (`datasets.ts`, `jobs.ts`) that handlers return, structured to match actual API responses

MSW is only active during testing (`npm run test`) and does not affect your development or production environments.

### MSW Handler Patterns (`mocks/handlers.ts`)
API handlers use `*/api/v1/...` patterns
- Tests hit full URLs like `http://localhost:4000/api/v1/projects`
- The `*` wildcard matches any hostname/port combination
- This handles both development (`localhost:4000`) and test environments

## Implementation List
- visual regression 
- shared utilities 
- hooks 
- api layer
- core components (search, pagination, sorting/filtering)
- page components
- accessibility testing 
- performance testing
