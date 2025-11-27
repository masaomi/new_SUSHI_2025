# Testing Strategy Overview

## Testing Stack

This project uses **Vitest** as the modern testing framework, replacing Jest for better ESM support and performance. The testing infrastructure includes:

- **Vitest** - Fast test runner with native ES modules support
- **@testing-library/react** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking for tests
- **happy-dom** - Lightweight DOM implementation (faster than jsdom)

## Configuration Files

### `vitest.config.ts`
Main Vitest configuration with ESM support, aliases, and coverage settings. No complex transform patterns needed unlike Jest.

### `vitest.setup.ts`
Global test setup file in the project root that:
- Imports `@testing-library/jest-dom` for DOM matchers
- Configures MSW server for API mocking
- Mocks Next.js navigation hooks
- Suppresses console noise during tests

### MSW Handler Patterns (`mocks/handlers.ts`)
API handlers use `*/api/v1/...` patterns instead of `/api/v1/...` because:
- Tests hit full URLs like `http://localhost:4000/api/v1/projects`
- The `*` wildcard matches any hostname/port combination
- This handles both development (`localhost:4000`) and test environments
- Provides flexibility without hardcoding specific hostnames

## Testing Layers

### API Layer Testing (`lib/api/*.test.ts`)

Tests validate raw HTTP client functions that handle:
- URL construction with correct parameters  
- HTTP method selection (GET, POST, PUT, DELETE)
- Request body formatting
- Response parsing and error handling
- Network failure scenarios

**Benefits of Vitest here:**
- Native ESM imports work without configuration
- MSW integration is seamless without transform rules
- Faster test execution for API validation

### Hook Layer Testing (`lib/hooks/**/*.test.ts`)

Tests validate React Query integration covering:
- Loading and error state management
- Data caching and invalidation  
- Query refetching when dependencies change
- Hook lifecycle and React integration
- Disabled query handling

### Integration Layer (`app/**/*.test.tsx`)

Tests validate complete user workflows:
- Multi-component interactions
- URL parameter synchronization  
- Real-time data updates and user feedback
- Complete user workflows (search → filter → paginate)

## Why Vitest Over Jest

### Technical Advantages
- **Native ESM support** - No `transformIgnorePatterns` configuration needed
- **Better MSW integration** - ES modules work out of the box
- **Faster execution** - Tests run ~3x faster than Jest
- **Modern tooling** - Built for current JavaScript ecosystem

### Developer Experience  
- **Clearer error messages** - Better debugging information
- **Hot reload testing** - Watch mode with better performance
- **TypeScript native** - No additional configuration required
- **Vite ecosystem** - Consistent with modern build tools

## Running Tests

```bash
npm run test         # Interactive watch mode
npm run test:run     # Single run
npm run test:coverage # Coverage report
npm run test:ui      # Visual test interface
```

## Mock Strategy

MSW (Mock Service Worker) handles all API mocking:
- **Realistic network simulation** - Tests actual fetch calls
- **Shared mocks** - Same handlers work across all test types  
- **Request inspection** - Can capture and validate request details
- **Error simulation** - Easy to test failure scenarios

The `*/api/v1/*` pattern ensures mocks work regardless of the actual API hostname used during testing.