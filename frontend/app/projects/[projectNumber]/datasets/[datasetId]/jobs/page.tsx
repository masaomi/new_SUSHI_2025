'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';
import { projectApi } from '@/lib/api';

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyles = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED+':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const formatDuration = (startTime: string, endTime?: string) => {
  if (!endTime) return 'Running...';

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffSeconds = Math.floor((diffMs % 60000) / 1000);

  if (diffMinutes > 0) {
    return `${diffMinutes}m ${diffSeconds}s`;
  }
  return `${diffSeconds}s`;
};

export default function DatasetJobsPage() {
  const params = useParams<{ projectNumber: string; datasetId: string }>();
  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dataset-jobs', projectNumber, datasetId],
    queryFn: () => projectApi.getProjectJobs(projectNumber, { dataset_id: datasetId }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white border rounded-lg p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex py-3 border-b last:border-b-0">
                <div className="h-4 bg-gray-200 rounded w-16 mr-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mr-4"></div>
                <div className="h-4 bg-gray-200 rounded w-24 mr-4"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
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
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load jobs</div>
          <p className="text-gray-500 mb-4">There was an error loading the jobs for this dataset.</p>
          <Link href={`/projects/${projectNumber}/datasets/${datasetId}`} className="text-blue-600 hover:underline">
            Back to Dataset
          </Link>
        </div>
      </div>
    );
  }

  const jobs = data?.jobs ?? [];

  return (
    <div className="container mx-auto px-6 py-8">
      <Breadcrumbs items={[
        { label: `Project ${projectNumber}`, href: `/projects/${projectNumber}` },
        { label: 'Datasets', href: `/projects/${projectNumber}/datasets` },
        { label: `Dataset ${datasetId}`, href: `/projects/${projectNumber}/datasets/${datasetId}` },
        { label: 'Jobs', active: true }
      ]} />

      <h1 className="text-2xl font-bold mb-6">Jobs for Dataset: {datasetId}</h1>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 text-lg mb-2">📋</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h4>
          <p className="text-gray-500 text-sm">No jobs have been run on this dataset yet.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full border border-gray-200">
            <thead style={{ backgroundColor: '#6CD3D1' }}>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">Job ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">User</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">Script</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">Logs</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">Duration</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Started</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-sm font-medium text-gray-900 border-r">{job.id}</td>
                  <td className="px-3 py-1.5 text-sm border-r">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-3 py-1.5 text-sm text-gray-900 border-r">{job.user || '-'}</td>
                  <td className="px-3 py-1.5 text-sm border-r text-center">
                    <Link
                      href={`/jobs/${job.id}/script`}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200"
                    >
                      Show Script
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-sm border-r text-center">
                    <Link
                      href={`/jobs/${job.id}/logs`}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
                    >
                      Show Logs
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-sm text-gray-900 border-r">
                    {job.time ? formatDuration(job.time.start_time, job.time.end_time) : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-sm text-gray-900">
                    {job.time ? formatDateTime(job.time.start_time) : formatDateTime(job.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link
          href={`/projects/${projectNumber}/datasets/${datasetId}`}
          className="text-blue-600 hover:underline text-sm"
        >
          Back to Dataset
        </Link>
      </div>
    </div>
  );
}
