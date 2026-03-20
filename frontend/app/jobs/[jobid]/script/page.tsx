'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobApi, projectApi } from '@/lib/api';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';

export default function JobScriptPage() {
  const params = useParams<{ jobid: string }>();
  const jobId = Number(params.jobid);

  const { data: script, isLoading: scriptLoading, error: scriptError } = useQuery({
    queryKey: ['job-script', jobId],
    queryFn: () => jobApi.getJobScript(jobId),
    enabled: !!jobId,
    staleTime: 30_000,
  });

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['job-project', jobId],
    queryFn: () => projectApi.getProjectIdFromJob(jobId),
    enabled: !!jobId,
    staleTime: 30_000,
  });

  const isLoading = scriptLoading || projectLoading;
  const error = scriptError;
  const projectId = projectData?.projectId ?? null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="ml-3 text-gray-600">Loading script...</span>
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
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load script</div>
          <p className="text-gray-500">There was an error loading the job script.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Breadcrumbs items={[
        { label: `Project ${projectId}`, href: `/projects/${projectId}` },
        { label: 'Jobs', href: `/projects/${projectId}/jobs` },
        { label: `Job ${jobId}` },
        { label: "Script", active: true }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job {jobId} - Script</h1>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Script Content</h2>
          <p className="text-sm text-gray-500">data_processing.py</p>
        </div>
        <div className="p-0">
          <pre style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap'}} className="text-sm text-gray-900 p-4 overflow-x-auto">
            {script}
          </pre>
        </div>
      </div>
    </div>
  );
}
