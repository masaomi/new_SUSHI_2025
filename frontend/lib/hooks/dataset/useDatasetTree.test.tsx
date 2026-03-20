import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDatasetTree } from './useDatasetTree';
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

describe('useDatasetTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(
      () => useDatasetTree(1),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.datasetTree).toBeUndefined();
  });

  it('fetches dataset tree', async () => {
    const { result } = renderHook(
      () => useDatasetTree(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.datasetTree).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('returns isEmpty true when tree is empty', async () => {
    server.use(
      http.get('*/api/v1/datasets/:datasetId/tree', () => {
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(
      () => useDatasetTree(999),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
  });

  it('handles error state', async () => {
    server.use(
      http.get('*/api/v1/datasets/:datasetId/tree', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(
      () => useDatasetTree(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isEmpty).toBe(false);
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(
      () => useDatasetTree(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
