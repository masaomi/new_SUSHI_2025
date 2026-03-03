import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJobsFilters } from './useJobsFilters';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe('useJobsFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty filters initially', () => {
    const { result } = renderHook(() => useJobsFilters());

    expect(result.current.filters).toEqual({
      status: '',
      from_date: '',
      to_date: '',
    });
    expect(result.current.localFilters).toEqual({
      status: '',
      from_date: '',
      to_date: '',
    });
  });

  it('reads filters from URL params', () => {
    mockSearchParams.set('status', 'COMPLETED');
    mockSearchParams.set('from_date', '2024-01-01');
    mockSearchParams.set('to_date', '2024-12-31');

    const { result } = renderHook(() => useJobsFilters());

    expect(result.current.filters).toEqual({
      status: 'COMPLETED',
      from_date: '2024-01-01',
      to_date: '2024-12-31',
    });
  });

  it('updates localFilters immediately with setStatusLocal', () => {
    const { result } = renderHook(() => useJobsFilters());

    act(() => {
      result.current.setStatusLocal('RUNNING');
    });

    expect(result.current.localFilters.status).toBe('RUNNING');
  });

  it('updates localFilters immediately with setFromDateLocal', () => {
    const { result } = renderHook(() => useJobsFilters());

    act(() => {
      result.current.setFromDateLocal('2024-01-15');
    });

    expect(result.current.localFilters.from_date).toBe('2024-01-15');
  });

  it('updates localFilters immediately with setToDateLocal', () => {
    const { result } = renderHook(() => useJobsFilters());

    act(() => {
      result.current.setToDateLocal('2024-06-30');
    });

    expect(result.current.localFilters.to_date).toBe('2024-06-30');
  });

  it('debounces URL updates', () => {
    const { result } = renderHook(() => useJobsFilters(300));

    act(() => {
      result.current.setStatusLocal('COMPLETED');
    });

    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?status=COMPLETED&page=1');
  });

  it('resets page to 1 when filters change', () => {
    mockSearchParams.set('page', '5');
    const { result } = renderHook(() => useJobsFilters(300));

    act(() => {
      result.current.setStatusLocal('FAILED');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=1&status=FAILED');
  });

  it('clearFilters clears all local filters', () => {
    const { result } = renderHook(() => useJobsFilters());

    act(() => {
      result.current.setStatusLocal('COMPLETED');
      result.current.setFromDateLocal('2024-01-01');
      result.current.setToDateLocal('2024-12-31');
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.localFilters).toEqual({
      status: '',
      from_date: '',
      to_date: '',
    });
  });

  it('removes empty filter params from URL', () => {
    mockSearchParams.set('status', 'COMPLETED');
    const { result } = renderHook(() => useJobsFilters(300));

    act(() => {
      result.current.setStatusLocal('');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=1');
  });

  it('combines multiple filter changes', () => {
    const { result } = renderHook(() => useJobsFilters(300));

    act(() => {
      result.current.setStatusLocal('RUNNING');
      result.current.setFromDateLocal('2024-01-01');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?status=RUNNING&from_date=2024-01-01&page=1');
  });
});
