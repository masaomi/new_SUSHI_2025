import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import SamplesEditPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectNumber: '1001', datasetId: '1' }),
}));

// Mock EditableTable as Handsontable doesn't work in jsdom
vi.mock('./EditableTable', () => ({
  default: ({ initialSamples }: { initialSamples: unknown[] }) => (
    <div data-testid="editable-table">
      Editable Table ({initialSamples?.length ?? 0} samples)
    </div>
  ),
}));

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
    ...render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    ),
  };
}

describe('SamplesEditPage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    renderWithProviders(<SamplesEditPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays page title with dataset name after loading', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Samples - RNA-seq Analysis Dataset');
    });
  });

  it('displays breadcrumbs', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1001')).toBeInTheDocument();
    });
    expect(screen.getByText('Datasets')).toBeInTheDocument();
    expect(screen.getByText('Edit Samples')).toBeInTheDocument();
    // Dataset name appears multiple times (breadcrumb + title)
    expect(screen.getAllByText('RNA-seq Analysis Dataset').length).toBeGreaterThanOrEqual(1);
  });

  it('displays back to dataset link', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    const backLink = screen.getByRole('link', { name: '← Back to Dataset' });
    expect(backLink).toHaveAttribute('href', '/projects/1001/datasets/1');
  });

  it('displays edit samples table section', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Samples Table')).toBeInTheDocument();
    });
    expect(screen.getByText('Edit sample data directly in the table below')).toBeInTheDocument();
  });

  it('displays editable table with sample count', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByTestId('editable-table')).toBeInTheDocument();
    });
    expect(screen.getByText(/3 samples/)).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    server.use(
      http.get('*/api/v1/datasets/:datasetId', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('There was an error loading the dataset information.')).toBeInTheDocument();
  });

  it('has correct breadcrumb links', async () => {
    renderWithProviders(<SamplesEditPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const projectLink = screen.getByRole('link', { name: 'Project 1001' });
    expect(projectLink).toHaveAttribute('href', '/projects/1001');

    const datasetsLink = screen.getByRole('link', { name: 'Datasets' });
    expect(datasetsLink).toHaveAttribute('href', '/projects/1001/datasets');
  });

});
