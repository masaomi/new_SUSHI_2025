# State Management and Data Persistence Between Pages
**Last Updated:** 2026-01-29  

This document explains how we handle state management and data persistence between pages in the Sushi frontend application.

## Overview

When users navigate between pages in a multi-step workflow (like job submission), we need to preserve form data and application state. This document covers different approaches and their trade-offs.

## Approaches for Data Persistence

### 1. Local Storage (Current Choice)

Local Storage is our preferred method for persisting large form data between pages. It can hold large data as its the browser who saves it (5-10MB). 
It persists across tab refreshes and browser restarts. We only need to be carefull to clear data after use. 

#### Implementation

```typescript

localStorage.setItem('jobSubmissionData', JSON.stringify(formData));

router.push('/confirm');

// Retrieving data on the destination page
const storedData = localStorage.getItem('jobSubmissionData');
const formData = storedData ? JSON.parse(storedData) : {};
```

### 2. React Context (Alternative for App-Wide State)

React Context is suitable for application-wide state that needs to be shared across components.

#### Implementation

```typescript
const JobDataContext = createContext<JobDataContextType | undefined>(undefined);

export function JobDataProvider({ children }: { children: ReactNode }) {
  
  return (
    <JobDataContext.Provider value={{ jobData, setJobData, clearJobData }}>
      {children}
    </JobDataContext.Provider>
  );
}
```

- Lost on page refresh 
- Not suitable for multi-step workflows with page refreshes.

