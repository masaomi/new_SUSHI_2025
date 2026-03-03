import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from './useSearch';

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    // Reset search params
    mockSearchParams.delete('q');
    mockSearchParams.delete('page');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty search query initially', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.localQuery).toBe('');
  });

  it('updates localQuery immediately when setLocalQuery is called', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setLocalQuery('test');
    });

    expect(result.current.localQuery).toBe('test');
  });

  it('debounces URL updates', async () => {
    const { result } = renderHook(() => useSearch('q', 300));

    act(() => {
      result.current.setLocalQuery('test');
    });

    // URL should not be updated immediately
    expect(mockPush).not.toHaveBeenCalled();

    // Fast-forward past debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?q=test&page=1');
  });

  it('uses custom param name', async () => {
    const { result } = renderHook(() => useSearch('search', 300));

    act(() => {
      result.current.setLocalQuery('custom');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?search=custom&page=1');
  });

  it('removes param when query is empty', async () => {
    mockSearchParams.set('q', 'existing');
    const { result } = renderHook(() => useSearch('q', 300));

    act(() => {
      result.current.setLocalQuery('');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=1');
  });

  it('trims whitespace from search query', async () => {
    const { result } = renderHook(() => useSearch('q', 300));

    act(() => {
      result.current.setLocalQuery('  test  ');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?q=test&page=1');
  });

  it('resets page to 1 on new search', async () => {
    mockSearchParams.set('page', '5');
    const { result } = renderHook(() => useSearch('q', 300));

    act(() => {
      result.current.setLocalQuery('new search');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=1&q=new+search');
  });

  it('onSubmit prevents default form behavior', () => {
    const { result } = renderHook(() => useSearch());
    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    act(() => {
      result.current.onSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
