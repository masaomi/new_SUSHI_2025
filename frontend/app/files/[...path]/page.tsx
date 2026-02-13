'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filesApi } from '@/lib/api';
import { FileItem } from '@/lib/types';
import Link from 'next/link';

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

function ParentFolderIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export default function FilesPage() {
  const params = useParams();
  const router = useRouter();
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path];
  const currentPath = pathSegments.join('/');

  const { data, isLoading, error } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => filesApi.getDirectoryContents(currentPath),
    staleTime: 30_000,
  });

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      router.push(`/files/${currentPath}/${item.name}`);
    } else {
      // Open file in new tab on gstore
      const filePath = `${currentPath}/${item.name}`;
      window.open(`https://fgcz-gstore.uzh.ch/projects/${filePath}`, '_blank');
    }
  };

  const breadcrumbs = ['Files', ...pathSegments];

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-6"></div>
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
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load directory</div>
          <p className="text-gray-500">The requested path could not be found.</p>
          <Link href="/files" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to root
          </Link>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  const parentPath = data?.parentPath;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4">
        <ol className="flex items-center text-sm text-gray-500">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-900">{crumb}</span>
              ) : index === 0 ? (
                <Link href="/files" className="hover:text-blue-600">
                  {crumb}
                </Link>
              ) : (
                <Link
                  href={`/files/${pathSegments.slice(0, index).join('/')}`}
                  className="hover:text-blue-600"
                >
                  {crumb}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* File table */}
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
            {/* Parent directory row */}
            {parentPath !== null && (
              <tr
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(parentPath === '' ? '/files' : `/files/${parentPath}`)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <ParentFolderIcon />
                    <span className="ml-3 text-sm text-gray-600">..</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
              </tr>
            )}

            {/* File/folder items */}
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

            {/* Empty state */}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  This folder is empty
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
