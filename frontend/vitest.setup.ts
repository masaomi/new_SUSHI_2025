// Vitest setup file
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// Setup MSW server for all tests
import './mocks/server'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
  // Provide a default empty useParams; tests can override per-file as needed
  useParams: () => ({}),
}))

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)') ||
       args[0].includes('Error: Error: Network error'))
    ) {
      return
    }
    // Suppress test-specific errors
    if (args[0] === 'Error:' && args[1] instanceof Error && args[1].message === 'Network error') {
      return
    }
    // Suppress errors from Error objects during testing
    if (args[0] instanceof Error && args[0].message === 'Network error') {
      return
    }
    originalConsoleError(...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
       args[0].includes('act(...)'))
    ) {
      return
    }
    originalConsoleWarn(...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})