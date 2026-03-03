import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJobSubmission } from './useJobSubmission';

const mockSubmitJob = vi.fn();

vi.mock('@/lib/api', () => ({
  jobApi: {
    submitJob: (...args: any[]) => mockSubmitJob(...args),
  },
}));

describe('useJobSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitJob.mockReset();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useJobSubmission());

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
  });

  it('sets isSubmitting to true during submission', async () => {
    mockSubmitJob.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useJobSubmission());

    act(() => {
      result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.isSubmitting).toBe(true);
  });

  it('sets success to true on successful submission', async () => {
    mockSubmitJob.mockResolvedValue({ jobId: 123 });

    const { result } = renderHook(() => useJobSubmission());

    await act(async () => {
      await result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.success).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sets error on failed submission', async () => {
    mockSubmitJob.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useJobSubmission());

    await act(async () => {
      await result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.error).toBe('Failed to submit job. Please try again.');
    expect(result.current.success).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('resets error before new submission', async () => {
    mockSubmitJob.mockRejectedValueOnce(new Error('First error'));
    mockSubmitJob.mockResolvedValueOnce({ jobId: 123 });

    const { result } = renderHook(() => useJobSubmission());

    // First submission fails
    await act(async () => {
      await result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.error).not.toBeNull();

    // Second submission should clear error
    await act(async () => {
      await result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(true);
  });

  it('resetState clears error and success', async () => {
    mockSubmitJob.mockResolvedValue({ jobId: 123 });

    const { result } = renderHook(() => useJobSubmission());

    await act(async () => {
      await result.current.submitJob({
        projectNumber: 1001,
        datasetId: 1,
        appName: 'TestApp',
        nextDataset: { name: 'Output', comment: '' },
        parameters: {},
      });
    });

    expect(result.current.success).toBe(true);

    act(() => {
      result.current.resetState();
    });

    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passes job data to API', async () => {
    mockSubmitJob.mockResolvedValue({ jobId: 123 });

    const { result } = renderHook(() => useJobSubmission());
    const jobData = {
      projectNumber: 1001,
      datasetId: 1,
      appName: 'TestApp',
      nextDataset: { name: 'Output', comment: 'Test comment' },
      parameters: { cores: 4, ram: 16 },
    };

    await act(async () => {
      await result.current.submitJob(jobData);
    });

    expect(mockSubmitJob).toHaveBeenCalledWith(jobData);
  });
});
