import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface JobsFilters {
  status: string;
  from_date: string;
  to_date: string;
}

interface UseJobsFiltersReturn {
  // URL-synced filter values
  filters: JobsFilters;
  // Local state for immediate UI updates
  localFilters: JobsFilters;
  // Individual setters for local state
  setStatusLocal: (status: string) => void;
  setFromDateLocal: (date: string) => void;
  setToDateLocal: (date: string) => void;
  // Clear all filters
  clearFilters: () => void;
}

/**
 * Hook to manage multiple job filters with debounced URL updates
 * 
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Object containing filter state and handlers
 */
export function useJobsFilters(debounceMs: number = 300): UseJobsFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL-driven filter parameters
  const filters = useMemo((): JobsFilters => ({
    status: searchParams.get('status') || '',
    from_date: searchParams.get('from_date') || '',
    to_date: searchParams.get('to_date') || ''
  }), [searchParams]);
  
  // Local input state for immediate UI updates
  const [localFilters, setLocalFilters] = useState<JobsFilters>(filters);
  
  // Sync local state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Individual setters for local state
  const setStatusLocal = (status: string) => {
    setLocalFilters(prev => ({ ...prev, status }));
  };
  
  const setFromDateLocal = (from_date: string) => {
    setLocalFilters(prev => ({ ...prev, from_date }));
  };
  
  const setToDateLocal = (to_date: string) => {
    setLocalFilters(prev => ({ ...prev, to_date }));
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: JobsFilters = { status: '', from_date: '', to_date: '' };
    setLocalFilters(clearedFilters);
  };

  // Debounced URL update for all filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Check if any filter actually changed
      const filtersChanged = 
        localFilters.status !== filters.status ||
        localFilters.from_date !== filters.from_date ||
        localFilters.to_date !== filters.to_date;
      
      if (filtersChanged) {
        const sp = new URLSearchParams(searchParams.toString());
        
        // Update all filter parameters
        if (localFilters.status.trim()) {
          sp.set('status', localFilters.status.trim());
        } else {
          sp.delete('status');
        }
        
        if (localFilters.from_date.trim()) {
          sp.set('from_date', localFilters.from_date.trim());
        } else {
          sp.delete('from_date');
        }
        
        if (localFilters.to_date.trim()) {
          sp.set('to_date', localFilters.to_date.trim());
        } else {
          sp.delete('to_date');
        }
        
        // Reset to page 1 when filters change
        sp.set('page', '1');
        
        router.push(`?${sp.toString()}`);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localFilters, filters, searchParams, router, debounceMs]);

  return {
    filters,
    localFilters,
    setStatusLocal,
    setFromDateLocal,
    setToDateLocal,
    clearFilters
  };
}