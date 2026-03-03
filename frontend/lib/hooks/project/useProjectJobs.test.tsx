import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectJobs } from './useProjectJobs';
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

describe('useProjectJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.jobs).toEqual([]);
  });

  it('fetches jobs for project', async () => {
    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.jobs.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('calculates totalPages correctly', async () => {
    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001, per: 2 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(Math.ceil(result.current.total / 2));
  });

  it('returns isEmpty true when no jobs', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/jobs', () => {
        return HttpResponse.json({
          jobs: [],
          total_count: 0,
          page: 1,
          per: 50,
        });
      })
    );

    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 9999 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
  });

  it('handles error state', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/jobs', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isEmpty).toBe(false);
  });

  it('passes pagination params correctly', async () => {
    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001, page: 3, per: 20 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.perPage).toBe(20);
  });

  it('returns minimum 1 for totalPages when no jobs', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/jobs', () => {
        return HttpResponse.json({
          jobs: [],
          total_count: 0,
          page: 1,
          per: 50,
        });
      })
    );

    const { result } = renderHook(
      () => useProjectJobs({ projectNumber: 1001 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(1);
  });
});
