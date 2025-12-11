# jsTree Integration 

## Implementation Architecture

### File Structure
```
app/projects/[projectNumber]/datasets/[datasetId]/
├── page.tsx              # Main dataset page with dynamic import
└── TreeComponent.tsx     # jsTree component (128 lines)
```


## Problems Encountered & Solutions

### 1. Server-Side Rendering (SSR) Window Reference Error

`ReferenceError: window is not defined`
Solved with Dynamic Import

### 2. jsTree Web Worker Window Access Error

**Error**: `ReferenceError: window is not defined` in worker script
Solved by disabling the jsTree Worker, makes it very slow now. 
```typescript
$(treeRef.current).jstree({
  'core': {
    'worker': false, // Disable jsTree workers
    'data': treeData,
    // ... other config
  }
});
```

### 3. DOM Access Timing Issues

**Error**: `Cannot read properties of null (reading 'attr')`
Sovled with setTimeout 10 to let DOM mount

