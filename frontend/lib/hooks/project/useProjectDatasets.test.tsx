import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectDatasets } from './useProjectDatasets';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import React from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
}

function createWrapper() {
  const client = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useProjectDatasets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.datasets).toEqual([]);
  });

  it('fetches datasets for project', async () => {
    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.datasets.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('calculates totalPages correctly', async () => {
    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001, per: 2 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // totalPages = ceil(total / per)
    expect(result.current.totalPages).toBe(Math.ceil(result.current.total / 2));
  });

  it('returns isEmpty true when no datasets', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/datasets', () => {
        return HttpResponse.json({
          datasets: [],
          total_count: 0,
          page: 1,
          per: 50,
        });
      })
    );

    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 9999 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
  });

  it('handles error state', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/datasets', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isEmpty).toBe(false);
  });

  it('passes pagination params correctly', async () => {
    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001, page: 2, per: 25 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.perPage).toBe(25);
  });

  it('returns minimum 1 for totalPages', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/datasets', () => {
        return HttpResponse.json({
          datasets: [],
          total_count: 0,
          page: 1,
          per: 50,
        });
      })
    );

    const { result } = renderHook(
      () => useProjectDatasets({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(1);
  });
});
