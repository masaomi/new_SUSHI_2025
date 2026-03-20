'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobApi } from '@/lib/api';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';

export default function JobLogsPage() {
  const params = useParams<{ jobid: string; projectNumber?: string }>();
  const jobId = Number(params.jobid);
  const projectNumber = params.projectNumber;

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['job-logs', jobId],
    queryFn: () => jobApi.getJobLogs(jobId),
    enabled: !!jobId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="ml-3 text-gray-600">Loading logs...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load logs</div>
          <p className="text-gray-500">There was an error loading the job logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">

      <Breadcrumbs items={[
        { label: `Project ${projectNumber}`, href: `/projects/${projectNumber}` },
        { label: 'Jobs', href: `/projects/${projectNumber}/jobs` },
        { label: `Job ${jobId}` },
        { label: "Logs", active: true }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job {jobId} - Execution Logs</h1>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Execution Log</h2>
          <p className="text-sm text-gray-500">Real-time job execution output</p>
        </div>
        <div className="p-0 bg-black">
          <pre style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap'}} className="text-sm text-green-400 p-4 overflow-x-auto font-mono">
            {logs}
          </pre>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Log updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
