# Application Providers

**Last Updated:** 2026-01-29

**QueryProvider** | **AuthProvider**

## Provider Hierarchy

The providers are nested in `app/layout.tsx` with specific order:

```typescript
<QueryProvider>          // Outermost - provides query functionality
  <AuthProvider>         // Inner - provides auth context
    {children}           // App content
  </AuthProvider>
</QueryProvider>
```

## QueryProvider
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['datasets', projectNumber],
  queryFn: () => projectApi.getProjectDatasets(projectNumber),
  staleTime: 60_000, // Data stays fresh for 1 minute
});
```

## AuthProvider

Manages user authentication state and provides the `useAuth()` hook throughout the application.

**What it does automatically:**
- Fetches auth status on app load
- Verifies JWT tokens from localStorage
- Redirects unauthenticated users to `/login`
- Re-checks auth on every route change

**You don't need `useAuth()` on every page** - the provider handles redirects automatically. Only use it when you need to:
- Display the current username
- Show different UI based on auth state
- Manually trigger logout

### useAuth() Hook

```typescript
import { useAuth } from '@/providers/AuthContext';

const { authStatus, loading, error, logout, refetch } = useAuth();
```

**Returns:**
```typescript
{
  authStatus: AuthenticationStatus | null;  // User info, authentication_skipped flag
  loading: boolean;                         // True while checking auth
  error: string | null;                     // Error message if auth check failed
  logout: () => void;                       // Clears token and redirects to /login
  refetch: () => Promise<void>;             // Re-check auth status
}
```
