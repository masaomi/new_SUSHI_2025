import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import ImportDatasetPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectNumber: '1001' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
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

describe('ImportDatasetPage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and description', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByRole('heading', { name: 'Import Dataset' })).toBeInTheDocument();
    expect(screen.getByText(/Import a new dataset into project 1001/)).toBeInTheDocument();
  });

  it('renders file upload area', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByText(/Click or drag to upload/)).toBeInTheDocument();
  });

  it('renders dataset name input', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByText('Dataset Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter dataset name')).toBeInTheDocument();
  });

  it('renders parent dataset ID input', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByText('Parent Dataset ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter ID or select below')).toBeInTheDocument();
  });

  it('renders no parent checkbox', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByText('No parent')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', async () => {
    renderWithProviders(<ImportDatasetPage />);
    expect(screen.getByRole('button', { name: 'Import Dataset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders parent dataset selector when no parent is unchecked', async () => {
    const { user } = renderWithProviders(<ImportDatasetPage />);
    // "No parent" is checked by default, so tree selector is hidden
    expect(screen.queryByText('Select Parent Dataset')).not.toBeInTheDocument();

    // Uncheck "No parent" to show tree selector
    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(screen.getByText('Select Parent Dataset')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search datasets...')).toBeInTheDocument();
  });

  it('allows typing in dataset name field', async () => {
    const { user } = renderWithProviders(<ImportDatasetPage />);
    const nameInput = screen.getByPlaceholderText('Enter dataset name');
    await user.type(nameInput, 'My New Dataset');
    expect(nameInput).toHaveValue('My New Dataset');
  });

  it('toggles parent ID input disabled state based on no parent checkbox', async () => {
    const { user } = renderWithProviders(<ImportDatasetPage />);
    const checkbox = screen.getByRole('checkbox');
    const parentInput = screen.getByPlaceholderText('Enter ID or select below');

    // "No parent" is checked by default, so input is disabled
    expect(checkbox).toBeChecked();
    expect(parentInput).toBeDisabled();

    // Uncheck to enable input
    await user.click(checkbox);
    expect(parentInput).not.toBeDisabled();

    // Check again to disable
    await user.click(checkbox);
    expect(parentInput).toBeDisabled();
  });

  it('hides tree selector when no parent is checked', async () => {
    const { user } = renderWithProviders(<ImportDatasetPage />);
    const checkbox = screen.getByRole('checkbox');

    // Tree selector is hidden by default (no parent checked)
    expect(screen.queryByText('Select Parent Dataset')).not.toBeInTheDocument();

    // Uncheck no parent to show tree selector
    await user.click(checkbox);
    await waitFor(() => {
      expect(screen.getByText('Select Parent Dataset')).toBeInTheDocument();
    });

    // Check no parent again to hide tree selector
    await user.click(checkbox);
    expect(screen.queryByText('Select Parent Dataset')).not.toBeInTheDocument();
  });

});
