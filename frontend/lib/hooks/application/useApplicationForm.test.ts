import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApplicationForm } from './useApplicationForm';

vi.mock('@/lib/api', () => ({
  applicationApi: {
    validateAppConfig: vi.fn().mockResolvedValue({
      application: {
        param_groups: [
          {
            id: 'resources',
            title: 'Resources',
            fields: [
              { name: 'cores', type: 'integer', default_value: 8 },
            ],
          },
        ],
      },
    }),
  },
}));

vi.mock('@/lib/utils/form-renderer', () => ({
  initializeFormDataFromGroups: vi.fn((groups) => {
    const result: Record<string, any> = {};
    groups.forEach((group: any) => {
      group.fields?.forEach((field: any) => {
        result[field.name] = field.default_value ?? '';
      });
    });
    return result;
  }),
  flattenParamGroups: vi.fn((groups) => {
    const result: any[] = [];
    groups.forEach((group: any) => {
      group.fields?.forEach((field: any) => {
        result.push(field);
      });
    });
    return result;
  }),
}));

const mockParamGroups = [
  {
    id: 'resources',
    title: 'Resource Parameters',
    fields: [
      { name: 'cores', type: 'integer', default_value: 4 },
      { name: 'ram', type: 'integer', default_value: 16 },
    ],
  },
  {
    id: 'input',
    title: 'Input Parameters',
    fields: [
      { name: 'inputFile', type: 'string', default_value: '' },
    ],
  },
];

describe('useApplicationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state for dataset name', () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: undefined,
        paramGroups: undefined,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    expect(result.current.nextDatasetData.datasetName).toBe('Loading...');
    expect(result.current.formValues).toEqual({});
  });

  it('generates dataset name when datasetName is provided', async () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: undefined,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    await waitFor(() => {
      expect(result.current.nextDatasetData.datasetName).toContain('TestApp_RNA-seq_');
    });
  });

  it('initializes form values from param groups', async () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    await waitFor(() => {
      expect(result.current.formValues).toEqual({
        cores: 4,
        ram: 16,
        inputFile: '',
      });
    });
  });

  it('merges resubmit params into form values', async () => {
    const resubmitParams = {
      cores: 8,
      ram: 32,
    };

    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams,
        isResubmit: true,
      })
    );

    await waitFor(() => {
      expect(result.current.formValues.cores).toBe(8);
      expect(result.current.formValues.ram).toBe(32);
    });
  });

  it('ignores resubmit params not in schema', async () => {
    const resubmitParams = {
      cores: 8,
      unknownParam: 'value',
    };

    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams,
        isResubmit: true,
      })
    );

    await waitFor(() => {
      expect(result.current.formValues.cores).toBe(8);
      expect(result.current.formValues.unknownParam).toBeUndefined();
    });
  });

  it('handleInputChange updates nextDatasetData', () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    act(() => {
      result.current.handleInputChange({
        target: { name: 'datasetComment', value: 'Test comment' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.nextDatasetData.datasetComment).toBe('Test comment');
  });

  it('handleFieldChange updates specific form field', async () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    await waitFor(() => {
      expect(result.current.formValues.cores).toBe(4);
    });

    act(() => {
      result.current.handleFieldChange('cores', 16);
    });

    expect(result.current.formValues.cores).toBe(16);
  });

  it('stores param groups in groupConfig', async () => {
    const { result } = renderHook(() =>
      useApplicationForm({
        appName: 'TestApp',
        datasetName: 'RNA-seq',
        paramGroups: mockParamGroups,
        resubmitParams: undefined,
        isResubmit: false,
      })
    );

    await waitFor(() => {
      expect(result.current.paramGroups).toEqual(mockParamGroups);
    });
  });
});
