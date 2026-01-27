'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import DatasetTree from '@/components/DatasetTree';

export default function ProjectDatasetsPage() {
  const params = useParams<{ projectNumber: string }>();
  const projectNumber = Number(params.projectNumber);
  const searchParams = useSearchParams();
  const router = useRouter();

  // View mode state (table | tree)
  const viewMode = useMemo(() => searchParams.get('view') || 'table', [searchParams]);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // URL-driven parameters
  const page = useMemo(() => Number(searchParams.get('page') || 1), [searchParams]);
  const per = useMemo(() => Number(searchParams.get('per') || 10), [searchParams]);
  const qParam = useMemo(() => searchParams.get('q') || '', [searchParams]);

  // Local input state for search box with debouncing
  const [qLocal, setQLocal] = useState(qParam);
  useEffect(() => { setQLocal(qParam); }, [qParam]);

  // Debounced search - update URL after 300ms of no typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      if (qLocal) sp.set('q', qLocal); else sp.delete('q');
      sp.set('page', '1'); // Reset to page 1 on new search
      
      // Only update URL if the search term actually changed
      if (qLocal !== qParam) {
        router.push(`?${sp.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [qLocal, qParam, searchParams, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['datasets', projectNumber, { q: qParam, page, per }],
    queryFn: () => projectApi.getProjectDatasets(projectNumber, { q: qParam, page, per }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Tree data query (enabled only when tree view)
  const { data: treeData, isLoading: isTreeLoading, error: treeError } = useQuery({
    queryKey: ['datasets-tree', projectNumber],
    queryFn: () => projectApi.getProjectDatasetsTree(projectNumber),
    enabled: viewMode === 'tree',
    staleTime: 60_000,
  });

  const selectedSet = useMemo(() => {
    const sel = searchParams.get('selected');
    return new Set((sel ? sel.split(',') : []).map((s) => Number(s)));
  }, [searchParams]);

  const updateSelectedInUrl = (ids: Set<number>) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (ids.size > 0) sp.set('selected', Array.from(ids).join(',')); else sp.delete('selected');
    router.push(`?${sp.toString()}`);
  };

  const toggleSelect = (id: number) => {
    const ids = new Set(selectedSet);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    updateSelectedInUrl(ids);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is now handled by debounce, but keep form for accessibility
  };

  const onChangePer = (nextPer: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('per', String(nextPer));
    sp.set('page', '1');
    router.push(`?${sp.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(nextPage));
    router.push(`?${sp.toString()}`);
  };

  const downloadAllDatasets = async () => {
    await projectApi.getDownloadAllDatasets(projectNumber);
    alert(`Called mock getDownloadAllDataset`);
  }

  const deleteDatasets = async (datasets: number[]) => {
    alert(`Called mock deleteDatasets(${datasets})`)
  }

  if (isLoading) return (
    <div className="container mx-auto px-6 py-8">
      <div className="animate-pulse">
        {/* Title skeleton */}
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        
        {/* Search controls skeleton */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-20"></div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto">
          <div className="min-w-full border rounded-lg">
            {/* Table header skeleton */}
            <div className="bg-gray-100 border-b">
              <div className="flex">
                <div className="p-2 border-r flex-shrink-0 w-12">
                  <div className="h-4 bg-gray-300 rounded w-4 mx-auto"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-16">
                  <div className="h-4 bg-gray-300 rounded w-8"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-32">
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-24">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-20">
                  <div className="h-4 bg-gray-300 rounded w-14"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-20">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-20">
                  <div className="h-4 bg-gray-300 rounded w-14"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-16">
                  <div className="h-4 bg-gray-300 rounded w-8"></div>
                </div>
                <div className="p-2 border-r flex-1 min-w-24">
                  <div className="h-4 bg-gray-300 rounded w-14"></div>
                </div>
                <div className="p-2 flex-1 min-w-24">
                  <div className="h-4 bg-gray-300 rounded w-18"></div>
                </div>
              </div>
            </div>
            
            {/* Table rows skeleton */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex">
                  <div className="p-2 border-r flex-shrink-0 w-12">
                    <div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-16">
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-32">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-24">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-20">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-20">
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-20">
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-16">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="p-2 border-r flex-1 min-w-24">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="p-2 flex-1 min-w-24">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="container mx-auto px-6 py-8">
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-2">Failed to load datasets</div>
        <p className="text-gray-500 mb-4">There was an error loading the datasets for this project.</p>
      </div>
    </div>
  );

  const datasets = data?.datasets ?? [];
  const total = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const allIds = datasets.map((d) => d.id);
  const allSelectedOnPage = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const startIndex = (page - 1) * per + Math.min(1, total);
  const endIndex = Math.min(page * per, total);

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Project {projectNumber} - DataSets</h1>
      
      {/* Action buttons row */}
      <div className="flex gap-3 mb-4 items-center">
        {/* View toggle group */}
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => {
              const sp = new URLSearchParams(searchParams.toString());
              sp.delete('view');
              router.push(`?${sp.toString()}`);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => {
              const sp = new URLSearchParams(searchParams.toString());
              sp.set('view', 'tree');
              router.push(`?${sp.toString()}`);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === 'tree'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tree
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        <button 
          className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedSet.size === 0}
          onClick={()=>deleteDatasets(selectedSet)}
        >
          Delete selected ({selectedSet.size})
        </button>
        <button 
          className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          onClick={() => {
            downloadAllDatasets();
          }}
        >
          Download All
        </button>
      </div>

      {viewMode === 'tree' ? (
        <div>
          <div className="mb-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={treeSearchQuery}
                onChange={(e) => setTreeSearchQuery(e.target.value)}
                placeholder="Search datasets..."
                className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              />
              {treeSearchQuery && (
                <button
                  onClick={() => setTreeSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {isTreeLoading && <div className="p-6">Loading tree...</div>}
          {treeError && <div className="p-6 text-red-600">Failed to load tree</div>}
          {treeData && (
            <DatasetTree
              treeNodes={treeData.tree}
              selectedIds={selectedSet}
              onSelectionChange={updateSelectedInUrl}
              projectNumber={projectNumber}
              searchQuery={treeSearchQuery}
            />
          )}
        </div>
      ) : (
        <>
          {isLoading && <div className="p-6">Loading datasets...</div>}
          {error && <div className="p-6 text-red-600">Failed to load datasets</div>}

          {/* Search and pagination controls immediately before table */}
          <form onSubmit={onSearch} className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show</label>
              <select
                value={per}
                onChange={(e) => onChangePer(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                value={qLocal} 
                onChange={(e) => setQLocal(e.target.value)} 
                placeholder="Search name..." 
                className="border rounded px-3 py-1.5 text-sm" 
              />
              <div className="text-xs text-gray-500">Search updates automatically</div>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead style={{ backgroundColor: '#6CD3D1' }}>
                <tr>
                  <th className="px-4 py-2 border text-center w-12">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={() => {
                        const next = new Set(selectedSet);
                        if (allSelectedOnPage) {
                          allIds.forEach((id) => next.delete(id));
                        } else {
                          allIds.forEach((id) => next.add(id));
                        }
                        updateSelectedInUrl(next);
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 border text-left">ID</th>
                  <th className="px-3 py-2 border text-left">Name</th>
                  <th className="px-3 py-2 border text-left">SushiApp</th>
                  <th className="px-3 py-2 border text-left">Samples</th>
                  <th className="px-3 py-2 border text-left">ParentID</th>
                  <th className="px-3 py-2 border text-left">Children</th>
                  <th className="px-3 py-2 border text-left">Who</th>
                  <th className="px-3 py-2 border text-left">Created</th>
                  <th className="px-3 py-2 border text-left">BFabricID</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => (
                  <tr key={ds.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border text-center">
                      <input type="checkbox" checked={selectedSet.has(ds.id)} onChange={() => toggleSelect(ds.id)} />
                    </td>
                    <td className="px-3 py-2 border">{ds.id}</td>
                    <td className="px-3 py-2 border">
                      <a href={`/projects/${projectNumber}/datasets/${ds.id}`} className="text-blue-600 hover:underline text-sm">{ds.name}</a>
                    </td>
                    <td className="px-3 py-2 border text-sm">{ds.sushi_app_name || ''}</td>
                    <td className="px-3 py-2 border">{ds.completed_samples ?? 0} / {ds.samples_count ?? 0}</td>
                    <td className="px-3 py-2 border">
                      {ds.parent_id ? (
                        <a href={`/projects/${projectNumber}/datasets/${ds.parent_id}`} className="text-blue-600 hover:underline">{ds.parent_id}</a>
                      ) : ''}
                    </td>
                    <td className="px-3 py-2 border">
                      {(ds.children_ids || []).map((cid, idx) => (
                        <span key={cid}>
                          <a href={`/projects/${projectNumber}/datasets/${cid}`} className="text-blue-600 hover:underline">{cid}</a>
                          {idx < (ds.children_ids || []).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-2 border">{ds.user_login || ''}</td>
                    <td className="px-3 py-2 border">{new Date(ds.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 border">
                      {ds.bfabric_id ? (
                        <a
                          href={`https://fgcz-bfabric.uzh.ch/bfabric/dataset/show.html?id=${ds.bfabric_id}&tab=details`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {ds.bfabric_id}
                        </a>
                      ) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-600">Showing {startIndex} to {endIndex} of {total} entries</div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">Prev</button>
              <span className="text-sm">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



