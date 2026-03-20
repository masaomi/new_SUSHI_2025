import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import ProjectDatasetsPage from './page';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectNumber: '1001' }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    ),
  };
}

describe('ProjectDatasetsPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams.delete('view');
    mockSearchParams.delete('q');
  });

  it('renders loading skeleton initially', () => {
    renderWithProviders(<ProjectDatasetsPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays datasets in table after loading', async () => {
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('Quality Control Report')).toBeInTheDocument();
    expect(screen.getByText('Differential Expression')).toBeInTheDocument();
    expect(screen.getByText('Pathway Analysis')).toBeInTheDocument();
    expect(screen.getByText('Proteomics Dataset')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/datasets', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load datasets')).toBeInTheDocument();
    });
  });

  it('displays correct page title with project number', async () => {
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1001 - DataSets')).toBeInTheDocument();
    });
  });

  it('shows dataset metadata in table columns', async () => {
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('RNASeqAnalysis')).toBeInTheDocument();
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
  });

  it('allows selecting datasets with checkboxes', async () => {
    const { user } = renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1]; // Skip header row
    const checkbox = within(firstDataRow).getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Delete (1)')).toBeInTheDocument();
  });

  it('has view toggle buttons and Downloal All button', async () => {
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download All' })).toBeInTheDocument();
  });

  it('shows pagination info and has per-page selector with options', async () => {
    renderWithProviders(<ProjectDatasetsPage />);
    await waitFor(() => {
      expect(screen.getByText('RNA-seq Analysis Dataset')).toBeInTheDocument();
    });
    expect(screen.getByText('Showing 1 to 5 of 5 entries')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map(o => o.textContent)).toEqual(['10', '25', '50', '100']);
  });
});
