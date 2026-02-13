# Handsontable Documentation

**Last Updated:** 2026-02-03

Excel-like data grid component for editing tabular data in the browser. Used for dataset sample editing and factor column management.

## Installation & Setup

### Package

```bash
npm install handsontable @handsontable/react-wrapper
```

### Required Imports

```tsx
import { useEffect, useRef } from 'react';
import { registerAllModules } from 'handsontable/registry';
import { HotTable } from '@handsontable/react-wrapper';

// Required CSS files
import 'handsontable/dist/handsontable.full.min.css';
import 'handsontable/styles/ht-theme-classic.css';
```

### Module Registration

Register all Handsontable modules on component mount:

```tsx
useEffect(() => {
  registerAllModules();
}, []);
```

## Basic Usage

```tsx
const hotTableRef = useRef<any>(null);

<HotTable
  ref={hotTableRef}
  data={tableData}
  colHeaders={false}      // We use data[0] as headers
  rowHeaders={true}       // Show row numbers
  width="100%"
  height={400}
  colWidths={150}
  columnSorting={false}
  themeName="ht-theme-classic"
  licenseKey="non-commercial-and-evaluation"
/>
```

## Data Structure

We use a **headers-in-data** approach where the first row contains column headers:

```tsx
const { tableData, columns } = useMemo(() => {
  const cols = Array.from(
    new Set(samples.flatMap(sample => Object.keys(sample)))
  );

  // Headers as first row, then sample data
  const data = [
    cols, // Row 0 = headers
    ...samples.map(sample =>
      cols.map(column => sample[column] || '')
    )
  ];

  return { tableData: data, columns: cols };
}, [samples]);
```

This approach allows headers to be editable (rename columns) when needed.

### Common Instance Methods

| Method | Description |
|--------|-------------|
| `getData()` | Returns all data as 2D array |
| `getSelected()` | Returns selected cell ranges `[[startRow, startCol, endRow, endCol], ...]` |
| `setDataAtCell(row, col, value)` | Set a single cell value |
| `alter('insert_row', index)` | Programmatically insert row |
| `alter('remove_col', index)` | Programmatically remove column |

## Implementations in This Codebase

### EditableTable (Full Sample Editing)

**Location:** `app/projects/[projectNumber]/datasets/[datasetId]/samples/edit/EditableTable.tsx`

### FactorsEditableTable (Factor Column Editing)

**Location:** `app/projects/[projectNumber]/datasets/[datasetId]/factors/edit/FactorsEditableTable.tsx`
