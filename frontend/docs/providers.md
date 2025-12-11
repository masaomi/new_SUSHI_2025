# Application Providers

 **QueryProvider**   
 **AuthProvider**

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

Manages user authentication state and provides authentication context throughout the entire application.


- **Authentication Status Management**
- **JWT Token Handling**
- **Route Protection**
- **Authentication States**
```typescript
interface AuthContextType {
  authStatus: AuthenticationStatus | null;  // Current auth configuration
  loading: boolean;                         // Loading state
  error: string | null;                     // Error messages
  refetch: () => Promise<void>;            // Refresh auth status
  logout: () => void;                      // Logout function
}
```
