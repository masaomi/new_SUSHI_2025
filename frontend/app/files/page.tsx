'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filesApi } from '@/lib/api';
import { FileItem } from '@/lib/types';

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
}

export default function FilesRootPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['files', ''],
    queryFn: () => filesApi.getDirectoryContents(''),
    staleTime: 30_000,
  });

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      router.push(`/files/${item.name}`);
    } else {
      // Open file in new tab on gstore
      window.open(`https://fgcz-gstore.uzh.ch/projects/${item.name}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="bg-white border rounded-lg">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3 border-b last:border-b-0">
                <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mr-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mr-6"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load files</div>
          <p className="text-gray-500">There was an error loading the file system.</p>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Files</h1>
        <p className="text-gray-500 text-sm mt-1">Browse project files and results</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full">
          <thead style={{ backgroundColor: '#6CD3D1' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider w-48">
                Last Modified
              </th>
              <th className="px-4 py-3 text-right text-xs text-gray-700 uppercase tracking-wider w-24">
                Size
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr
                key={item.name}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {item.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                    <span className="ml-3 text-sm text-gray-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {item.lastModified}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatFileSize(item.size)}
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No files available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        {items.length} item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
