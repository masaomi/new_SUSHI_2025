import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImportDatasetForm } from './useImportDatasetForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api', () => ({
  projectApi: {
    importDataset: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

const mockTreeData = {
  tree: [
    { id: 1, text: 'Dataset 1', parent: '#' },
    { id: 2, text: 'Dataset 2', parent: '#' },
    { id: 3, text: 'Child Dataset', parent: 1 },
  ],
};

describe('useImportDatasetForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
    );

    expect(result.current.file).toBeNull();
    expect(result.current.datasetName).toBe('');
    expect(result.current.parentId).toBeNull();
    expect(result.current.noParent).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('file handling', () => {
    it('accepts valid file types (.txt)', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'data.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(event);
      });

      expect(result.current.file).toBe(file);
      expect(result.current.datasetName).toBe('data');
      expect(result.current.error).toBeNull();
    });

    it('accepts valid file types (.csv)', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'data.csv', { type: 'text/csv' });
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(event);
      });

      expect(result.current.file).toBe(file);
      expect(result.current.datasetName).toBe('data');
    });

    it('accepts valid file types (.tsv)', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'data.tsv', { type: 'text/tab-separated-values' });
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(event);
      });

      expect(result.current.file).toBe(file);
    });

    it('rejects invalid file types', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'data.xlsx', { type: 'application/vnd.ms-excel' });
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(event);
      });

      expect(result.current.file).toBeNull();
      expect(result.current.error).toContain('Invalid file type');
    });

    it('does not override existing dataset name', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.setDatasetName('My Custom Name');
      });

      const file = new File(['content'], 'data.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(event);
      });

      expect(result.current.datasetName).toBe('My Custom Name');
    });
  });

  describe('drag and drop', () => {
    it('sets isDragOver on drag over', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.DragEvent<HTMLDivElement>;

      act(() => {
        result.current.handleDragOver(event);
      });

      expect(result.current.isDragOver).toBe(true);
    });

    it('clears isDragOver on drag leave', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.DragEvent<HTMLDivElement>;

      act(() => {
        result.current.handleDragOver(event);
      });

      act(() => {
        result.current.handleDragLeave(event);
      });

      expect(result.current.isDragOver).toBe(false);
    });

    it('handles file drop', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'dropped.txt', { type: 'text/plain' });
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: [file] },
      } as unknown as React.DragEvent<HTMLDivElement>;

      act(() => {
        result.current.handleDrop(event);
      });

      expect(result.current.file).toBe(file);
      expect(result.current.isDragOver).toBe(false);
    });
  });

  describe('parent ID handling', () => {
    it('validates parent ID as number', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleParentIdChange('abc');
      });

      expect(result.current.parentIdError).toBe('Please enter a valid number');
      expect(result.current.parentId).toBeNull();
    });

    it('validates parent ID exists in tree', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleParentIdChange('999');
      });

      expect(result.current.parentIdError).toBe('Dataset #999 not found');
      expect(result.current.parentId).toBeNull();
    });

    it('accepts valid parent ID', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleParentIdChange('1');
      });

      expect(result.current.parentIdError).toBeNull();
      expect(result.current.parentId).toBe(1);
    });

    it('clears parent ID when input is empty', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleParentIdChange('1');
      });

      act(() => {
        result.current.handleParentIdChange('');
      });

      expect(result.current.parentId).toBeNull();
      expect(result.current.parentIdError).toBeNull();
    });
  });

  describe('tree selection', () => {
    it('sets parent ID from tree selection', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleTreeSelect(2);
      });

      expect(result.current.parentId).toBe(2);
      expect(result.current.parentIdInput).toBe('2');
      expect(result.current.parentIdError).toBeNull();
    });

    it('clears parent ID when null is selected', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleTreeSelect(2);
      });

      act(() => {
        result.current.handleTreeSelect(null);
      });

      expect(result.current.parentId).toBeNull();
      expect(result.current.parentIdInput).toBe('');
    });
  });

  describe('no parent checkbox', () => {
    it('clears parent when checked', () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      act(() => {
        result.current.handleNoParentChange(false);
        result.current.handleParentIdChange('1');
      });

      act(() => {
        result.current.handleNoParentChange(true);
      });

      expect(result.current.noParent).toBe(true);
      expect(result.current.parentId).toBeNull();
      expect(result.current.parentIdInput).toBe('');
      expect(result.current.parentIdError).toBeNull();
    });
  });

  describe('form submission', () => {
    it('requires file to submit', async () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(result.current.error).toBe('Please select a dataset file');
    });

    it('requires dataset name to submit', async () => {
      const { result } = renderHook(() =>
        useImportDatasetForm({ projectNumber: 1001, treeData: mockTreeData })
      );

      const file = new File(['content'], 'data.txt', { type: 'text/plain' });
      const fileEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(fileEvent);
        result.current.setDatasetName('');
      });

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(result.current.error).toBe('Please enter a dataset name');
    });
  });
});
