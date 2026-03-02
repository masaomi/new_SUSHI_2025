# Testing Strategy Overview
**Last Updated:** 2026-03-02


## Running Tests

```bash
npm run test         # Interactive watch mode
npm run test:run     # Single run (CI-friendly)
npm run test:coverage # Coverage report
npm run test:ui      # Visual test interface
```

## Testing Stack

| Tool | Purpose | Why This Tool? |
|------|---------|----------------|
| **Vitest** | Test runner | 2-10x faster than Jest, native ESM, Vite-compatible |
| **@testing-library/react** | Component testing | Industry standard, "test behavior not implementation" |
| **MSW v2** | API mocking | Network-level interception, works everywhere |
| **happy-dom** | DOM environment | Faster than jsdom, sufficient for most tests |

```
┌─────────────────────────────────┐
│    Your Test Code               │ ← You write: getByText('hello'), expect().toBe()
├─────────────────────────────────┤
│ React Testing Library (RTL)     │ ← Provides: getByText, render, fireEvent
├─────────────────────────────────┤
│ happy-dom                       │ ← Provides: document, window, DOM APIs
├─────────────────────────────────┤
│ Vitest                          │ ← Provides: test runner, expect, mocks, coverage
├─────────────────────────────────┤
│ Node.js                         │ ← Runtime environment
└─────────────────────────────────┘
```

## Test File Patterns

Vitest auto-discovers:
- `**/__tests__/**/*.{js,jsx,ts,tsx}`
- `**/*.{test,spec}.{js,jsx,ts,tsx}`

### File Organization (Co-located)

```
lib/hooks/
├── useSearch.ts
├── useSearch.test.ts      ← Lives next to implementation
└── usePagination.ts
```

Naming conventions:
- Basic tests: `Component.test.tsx`
- Accessibility: `Component.accessibility.test.tsx`
- Error states: `Component.error-state.test.tsx`

## renderWithQuery

Components using `useQuery` need the QueryClientProvider wrapper:

```typescript
// ❌ Fails - no provider
render(<DatasetPage />)

// ✅ Works - wrapped with test QueryClient
renderWithQuery(<DatasetPage />)
```

The wrapper creates an isolated QueryClient with:
- No retries (fail fast)
- No caching (test isolation)
- No stale time (always refetch)

## MSW (Mock Service Worker)

MSW intercepts HTTP requests at the network layer - your code makes real `fetch()` calls, MSW catches them before they leave.

### Files Structure

```
mocks/
├── handlers.ts    # API endpoint definitions
├── server.ts      # Vitest lifecycle setup
└── data/
    ├── datasets.ts  # Mock dataset responses
    └── jobs.ts      # Mock job responses
```

### Handler Pattern

```typescript
// handlers.ts - uses wildcard for any host
http.get('*/api/v1/projects/:id/datasets', ({ params }) => {
  return HttpResponse.json(mockDatasets);
})
```

The `*` prefix matches any hostname, working in both dev and test environments.

### Overriding Handlers in Tests

```typescript
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

test('handles API error', async () => {
  // Override default handler for this test only
  server.use(
    http.get('*/api/v1/projects/:id/datasets', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    })
  );

  renderWithQuery(<DatasetPage />);
  expect(await screen.findByText('Error loading')).toBeInTheDocument();
});
```

