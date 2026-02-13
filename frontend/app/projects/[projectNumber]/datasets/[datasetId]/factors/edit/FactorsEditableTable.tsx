import { useEffect, useRef, useMemo } from 'react';
import { DatasetSample } from '@/lib/types';
import { registerAllModules } from 'handsontable/registry';
import { HotTable } from '@handsontable/react-wrapper';
import 'handsontable/dist/handsontable.full.min.css';
import 'handsontable/styles/ht-theme-classic.css';

interface FactorsEditableTableProps {
  initialSamples: DatasetSample[];
}

export default function FactorsEditableTable({
  initialSamples,
}: FactorsEditableTableProps) {
  const hotTableRef = useRef<any>(null);

  useEffect(() => {
    registerAllModules();
  }, []);

  // Extract only [Factor] columns and the sample identifier
  const { tableData, factorColumns, sampleNames } = useMemo(() => {
    if (!initialSamples || initialSamples.length === 0) {
      return { tableData: [], factorColumns: [], sampleNames: [] };
    }

    // Get all columns
    const allCols = Array.from(
      new Set(initialSamples.flatMap(sample => Object.keys(sample)))
    );

    // Filter to only [Factor] columns (postfix)
    const factors = allCols.filter(col => col.endsWith('[Factor]'));

    // Get sample names (usually 'name' or 'Name' column, or fall back to 'id')
    const nameCol = allCols.find(col => col.toLowerCase() === 'name') || 'id';
    const names = initialSamples.map(sample => sample[nameCol] || sample.id || '');

    // Create table data: first column is sample name (read-only), then factor columns
    // Header row first
    const headers = ['Sample', ...factors];
    const data = [
      headers,
      ...initialSamples.map((sample, idx) => [
        names[idx],
        ...factors.map(col => sample[col] || '')
      ])
    ];

    return { tableData: data, factorColumns: factors, sampleNames: names };
  }, [initialSamples]);

  const handleSaveChanges = () => {
    if (hotTableRef.current) {
      const hotInstance = hotTableRef.current.hotInstance;
      const data = hotInstance.getData();
      console.log('Factors Table Data:', data);

      if (data && data.length > 0) {
        const headers = data[0];
        const dataRows = data.slice(1);

        console.log('Headers:', headers);
        console.log('Data Rows:', dataRows);

        // Convert back to object format
        const convertedData = dataRows.map((row: any[], idx: number) => {
          const obj: any = { sample: row[0] };
          headers.slice(1).forEach((header: string, colIdx: number) => {
            obj[header || `Column${colIdx + 1} [Factor]`] = row[colIdx + 1] || '';
          });
          return obj;
        });
        console.log('Converted Factors Data:', convertedData);
        alert('Mock save - check console for data');
      }
    }
  };

  if (!initialSamples.length) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-gray-400 text-lg mb-2">📊</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">No samples found</h4>
        <p className="text-gray-500 text-sm mb-4">This dataset doesn't contain any sample data yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <HotTable
          ref={hotTableRef}
          data={tableData}
          colHeaders={false}
          rowHeaders={true}
          width="100%"
          height={400}
          colWidths={150}
          columnSorting={false}
          themeName="ht-theme-classic"
          contextMenu={{
            items: {
              'col_left': {
                name: 'Insert column left',
                disabled: function() {
                  if (hotTableRef.current) {
                    const selected = hotTableRef.current.hotInstance.getSelected();
                    if (selected && selected[0]) {
                      return selected[0][1] === 0; // Disable if first column (Sample) selected
                    }
                  }
                  return false;
                }
              },
              'col_right': {
                name: 'Insert column right'
              },
              'remove_col': {
                name: 'Remove column',
                disabled: function() {
                  if (hotTableRef.current) {
                    const selected = hotTableRef.current.hotInstance.getSelected();
                    if (selected && selected[0]) {
                      return selected[0][1] === 0; // Disable if first column (Sample) selected
                    }
                  }
                  return false;
                }
              },
              'separator1': '---------',
              'copy': {
                name: 'Copy'
              },
              'cut': {
                name: 'Cut'
              },
              'paste': {
                name: 'Paste'
              }
            }
          }}
          cells={(row: number, col: number) => {
            const cellProperties: any = {};

            // Make first row (headers) have different styling
            if (row === 0) {
              cellProperties.className = 'header-cell';
              cellProperties.renderer = (instance: any, td: HTMLElement, row: number, col: number, prop: any, value: any) => {
                td.style.backgroundColor = '#f3f4f6';
                td.style.fontWeight = 'bold';
                td.style.borderBottom = '2px solid #d1d5db';
                td.innerHTML = value || '';
                return td;
              };
            }

            // Make first column (Sample names) read-only with different styling
            if (col === 0) {
              cellProperties.readOnly = true;
              cellProperties.renderer = (instance: any, td: HTMLElement, row: number, col: number, prop: any, value: any) => {
                td.style.backgroundColor = row === 0 ? '#e5e7eb' : '#f9fafb';
                td.style.fontWeight = row === 0 ? 'bold' : 'normal';
                td.style.color = '#374151';
                if (row === 0) {
                  td.style.borderBottom = '2px solid #d1d5db';
                }
                td.innerHTML = value || '';
                return td;
              };
            }

            return cellProperties;
          }}
          licenseKey="non-commercial-and-evaluation"
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {factorColumns.length} factor column{factorColumns.length !== 1 ? 's' : ''} • {initialSamples.length} sample{initialSamples.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleSaveChanges}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
