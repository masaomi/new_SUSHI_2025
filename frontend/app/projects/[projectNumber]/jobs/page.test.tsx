import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import ProjectJobsPage from './page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectNumber: '1001' }),
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/1001/jobs',
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

describe('ProjectJobsPage', () => {

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders loading skeleton initially', () => {
    renderWithProviders(<ProjectJobsPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/jobs', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
    });
  });

  it('displays page title and back button after loading', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1001 - Jobs')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '← Back to Project' })).toBeInTheDocument();
  });

  it('displays jobs table with correct headers', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1001 - Jobs')).toBeInTheDocument();
    });
    expect(screen.getByText('Job ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Next Dataset')).toBeInTheDocument();
    expect(screen.getByText('Script')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
  });

  it('displays jobs data in table rows', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });
    // Check job IDs
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.getByText('103')).toBeInTheDocument();
    // Check statuses (use getAllByText since COMPLETED appears twice)
    expect(screen.getAllByText('COMPLETED').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    // Check users (alice appears twice)
    expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('displays dataset links for jobs with datasets', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });
    // Check that dataset names are displayed as links
    const rnaSeqLink = screen.getByRole('link', { name: /RNA-seq Analysis Dataset/ });
    expect(rnaSeqLink).toHaveAttribute('href', '/projects/1001/datasets/1');
  });

  it('displays Show Script and Show Logs buttons for each job', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });
    const scriptLinks = screen.getAllByRole('link', { name: 'Show Script' });
    const logsLinks = screen.getAllByRole('link', { name: 'Show Logs' });
    expect(scriptLinks.length).toBeGreaterThan(0);
    expect(logsLinks.length).toBeGreaterThan(0);
    // Check first job's links
    expect(scriptLinks[0]).toHaveAttribute('href', '/jobs/101/script');
    expect(logsLinks[0]).toHaveAttribute('href', '/jobs/101/logs');
  });

  it('displays Filters', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1001 - Jobs')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Filter by user...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    // The select element contains status options
    const allOption = screen.getByRole('option', { name: 'All' });
    expect(allOption).toBeInTheDocument();
  });

  it('displays pagination controls', async () => {
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });
    expect(screen.getByText(/Showing \d+ to \d+ of \d+ entries/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prev' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('shows empty state when no jobs match filters', async () => {
    server.use(
      http.get('*/api/v1/projects/:projectId/jobs', () => {
        return HttpResponse.json({
          jobs: [],
          total_count: 0,
          page: 1,
          per: 50,
          project_id: 1001,
        });
      })
    );
    renderWithProviders(<ProjectJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('No jobs found')).toBeInTheDocument();
    });
    expect(screen.getByText('There are no jobs for this project yet.')).toBeInTheDocument();
  });

});
