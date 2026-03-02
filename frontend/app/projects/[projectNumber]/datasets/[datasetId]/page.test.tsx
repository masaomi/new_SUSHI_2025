import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import DatasetDetailPage from './page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectNumber: '1001', datasetId: '1' }),
  useRouter: () => mockRouter,
}));

vi.stubGlobal('alert', vi.fn());
vi.stubGlobal('open', vi.fn());

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

function renderWithProviders(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return {
    client,
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    ),
  };
}

describe('DatasetDetailPage', () => {

  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(alert).mockClear();
  });

  it('renders loading skeleton initially', () => {
    renderWithProviders(<DatasetDetailPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    server.use(
      http.get('*/api/v1/datasets/:datasetId', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load dataset')).toBeInTheDocument();
    });
  });

  it('displays dataset name and breadcrumbs after loading', async () => {
    renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('Project 1001')).toBeInTheDocument();
    expect(screen.getByText('Datasets')).toBeInTheDocument();
  });

  it('displays dataset action buttons', async () => {
    renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  // it('displays quick action buttons in header', async () => {
  //   renderWithProviders(<DatasetDetailPage />);
  //   await waitFor(() => {
  //     expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
  //   });
  //   expect(screen.getAllByRole('button', { name: 'Data Folder' }).length).toBeGreaterThan(0);
  //   expect(screen.getByRole('button', { name: 'Edit Samples' })).toBeInTheDocument();
  //   expect(screen.getAllByRole('button', { name: 'Jobs' }).length).toBeGreaterThan(0);
  // });

  it('shows expandable input when Comment button clicked', async () => {
    const { user } = renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Comment' }));
    expect(screen.getByPlaceholderText('Enter comment...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('displays samples section', async () => {
    renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('Sample_A1')).toBeInTheDocument();
    expect(screen.getByText('Sample_A2')).toBeInTheDocument();
  });

  it('displays runnable applications section', async () => {
    renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('Runnable Applications')).toBeInTheDocument();
  });

  it('navigates to edit samples page when Edit Samples clicked', async () => {
    const { user } = renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Edit Samples' }));
    expect(mockPush).toHaveBeenCalledWith('/projects/1001/datasets/1/samples/edit');
  });

  it('navigates to jobs page when Jobs button clicked', async () => {
    const { user } = renderWithProviders(<DatasetDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    const jobButtons = screen.getAllByRole('button', { name: 'Jobs' });
    await user.click(jobButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/projects/1001/datasets/1/jobs');
  });

});
