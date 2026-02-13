import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import { JobMinimal } from '@/lib/types/job';

interface UseProjectJobsParams {
  projectNumber: number;
  user?: string;
  page?: number;
  per?: number;
}

interface UseProjectJobsReturn {
  jobs: JobMinimal[];
  total: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}

/**
 * Hook to fetch paginated jobs for a project with search functionality
 * 
 * @param params - Query parameters including projectNumber, search query, page, and per-page count
 * @returns Object containing jobs data, pagination info, loading state, and error state
 */
export function useProjectJobs({ 
  projectNumber, 
  user = '',
  page = 1, 
  per = 50 
}: UseProjectJobsParams): UseProjectJobsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', projectNumber, { user, page, per }],
    queryFn: () => projectApi.getProjectJobs(projectNumber, { user, page, per }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const isEmpty = !isLoading && !error && jobs.length === 0;

  return {
    jobs,
    total,
    currentPage: page,
    perPage: per,
    totalPages,
    isLoading,
    error,
    isEmpty
  };
}
