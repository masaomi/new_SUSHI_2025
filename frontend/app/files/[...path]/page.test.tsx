import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FilesPage from './page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useParams: () => ({ path: ['p1001'] }),
  useRouter: () => mockRouter,
}));

// Mock the filesApi
vi.mock('@/lib/api', () => ({
  filesApi: {
    getDirectoryContents: vi.fn(),
  },
}));

import { filesApi } from '@/lib/api';

const mockDirectoryContents = {
  currentPath: 'p1001',
  parentPath: '',
  totalItems: 3,
  items: [
    { name: 'FastQC_2024-01-15', type: 'folder', lastModified: '2024-01-15 09:30:00', size: null },
    { name: 'RNAseq_Results', type: 'folder', lastModified: '2024-01-20 14:45:00', size: null },
    { name: 'README.txt', type: 'file', lastModified: '2024-01-10 08:00:00', size: 1240 },
  ],
};

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

describe('FilesPage (nested path)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('renders loading skeleton initially', () => {
    vi.mocked(filesApi.getDirectoryContents).mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<FilesPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays breadcrumbs', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('Files')).toBeInTheDocument();
    });
    expect(screen.getByText('p1001')).toBeInTheDocument();
  });

  it('displays table headers', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Last Modified')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
  });

  it('displays parent directory row', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('..')).toBeInTheDocument();
    });
  });

  it('displays folder and file items', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('FastQC_2024-01-15')).toBeInTheDocument();
    });
    expect(screen.getByText('RNAseq_Results')).toBeInTheDocument();
    expect(screen.getByText('README.txt')).toBeInTheDocument();
  });

  it('displays item count', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });
  });

  it('navigates to subfolder on click', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    const { user } = renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('FastQC_2024-01-15')).toBeInTheDocument();
    });
    await user.click(screen.getByText('FastQC_2024-01-15'));
    expect(mockPush).toHaveBeenCalledWith('/files/p1001/FastQC_2024-01-15');
  });

  it('navigates to parent on .. click', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    const { user } = renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('..')).toBeInTheDocument();
    });
    await user.click(screen.getByText('..'));
    expect(mockPush).toHaveBeenCalledWith('/files');
  });

  it('displays error state when API fails', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockRejectedValue(new Error('Path not found'));
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load directory')).toBeInTheDocument();
    });
    expect(screen.getByText('The requested path could not be found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to root' })).toHaveAttribute('href', '/files');
  });

  it('displays empty state when folder is empty', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue({
      ...mockDirectoryContents,
      items: [],
      totalItems: 0,
    });
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  it('displays file sizes correctly', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('README.txt')).toBeInTheDocument();
    });
    expect(screen.getByText('1.2 KB')).toBeInTheDocument();
  });

  it('has breadcrumb link to Files root', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockDirectoryContents);
    renderWithProviders(<FilesPage />);
    await waitFor(() => {
      expect(screen.getByText('Files')).toBeInTheDocument();
    });
    const filesLink = screen.getByRole('link', { name: 'Files' });
    expect(filesLink).toHaveAttribute('href', '/files');
  });

});
