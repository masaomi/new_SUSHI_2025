import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FilesRootPage from './page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock the filesApi
vi.mock('@/lib/api', () => ({
  filesApi: {
    getDirectoryContents: vi.fn(),
  },
}));

import { filesApi } from '@/lib/api';

const mockFiles = {
  currentPath: '/',
  parentPath: null,
  totalItems: 2,
  items: [
    { name: 'p1001', type: 'folder', lastModified: '2024-01-27 10:30:00', size: null },
    { name: 'p2220', type: 'folder', lastModified: '2024-01-26 14:15:00', size: null },
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

describe('FilesRootPage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('renders loading skeleton initially', () => {
    vi.mocked(filesApi.getDirectoryContents).mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<FilesRootPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays page title after loading', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('Files')).toBeInTheDocument();
    });
    expect(screen.getByText('Browse project files and results')).toBeInTheDocument();
  });

  it('displays table headers', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Last Modified')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
  });

  it('displays folder items', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('p1001')).toBeInTheDocument();
    });
    expect(screen.getByText('p2220')).toBeInTheDocument();
  });

  it('displays last modified dates', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('2024-01-27 10:30:00')).toBeInTheDocument();
    });
    expect(screen.getByText('2024-01-26 14:15:00')).toBeInTheDocument();
  });

  it('displays item count', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  it('navigates to folder on click', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue(mockFiles);
    const { user } = renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('p1001')).toBeInTheDocument();
    });
    await user.click(screen.getByText('p1001'));
    expect(mockPush).toHaveBeenCalledWith('/files/p1001');
  });

  it('displays error state when API fails', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load files')).toBeInTheDocument();
    });
    expect(screen.getByText('There was an error loading the file system.')).toBeInTheDocument();
  });

  it('displays empty state when no files', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue({
      ...mockFiles,
      items: [],
      totalItems: 0,
    });
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('No files available')).toBeInTheDocument();
    });
  });

  it('displays files with sizes', async () => {
    vi.mocked(filesApi.getDirectoryContents).mockResolvedValue({
      currentPath: '/',
      parentPath: null,
      totalItems: 1,
      items: [
        { name: 'README.txt', type: 'file', lastModified: '2024-01-10 08:00:00', size: 1240 },
      ],
    });
    renderWithProviders(<FilesRootPage />);
    await waitFor(() => {
      expect(screen.getByText('README.txt')).toBeInTheDocument();
    });
    expect(screen.getByText('1.2 KB')).toBeInTheDocument();
  });

});
