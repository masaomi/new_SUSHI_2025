import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe('usePagination', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('returns default page and per values', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.per).toBe(10);
  });

  it('uses custom default per page', () => {
    const { result } = renderHook(() => usePagination(25));
    expect(result.current.per).toBe(25);
  });

  it('reads page from URL params', () => {
    mockSearchParams.set('page', '3');
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(3);
  });

  it('reads per from URL params', () => {
    mockSearchParams.set('per', '50');
    const { result } = renderHook(() => usePagination());
    expect(result.current.per).toBe(50);
  });

  it('goToPage updates URL with new page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.goToPage(5);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=5');
  });

  it('goToPage preserves existing params', () => {
    mockSearchParams.set('q', 'search');
    mockSearchParams.set('per', '25');
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.goToPage(3);
    });

    expect(mockPush).toHaveBeenCalledWith('?q=search&per=25&page=3');
  });

  it('changePerPage updates URL and resets to page 1', () => {
    mockSearchParams.set('page', '5');
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.changePerPage(50);
    });

    expect(mockPush).toHaveBeenCalledWith('?page=1&per=50');
  });

  it('changePerPage preserves other params', () => {
    mockSearchParams.set('q', 'search');
    mockSearchParams.set('page', '3');
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.changePerPage(100);
    });

    expect(mockPush).toHaveBeenCalledWith('?q=search&page=1&per=100');
  });
});
