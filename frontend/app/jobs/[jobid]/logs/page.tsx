'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { jobApi } from '@/lib/api';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';

export default function JobLogsPage() {
  const params = useParams<{ jobid: string; projectNumber?: string }>();
  const jobId = params.jobid;
  const projectNumber = params.projectNumber;
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const logsContent = await jobApi.getJobLogs(Number(jobId));
        setLogs(logsContent);
      } catch (err) {
        setError('Failed to load logs content');
        console.error('Error loading job logs:', err);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadLogs();
    }
  }, [jobId]);

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
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading logs...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-600">
              <p>{error}</p>
            </div>
          ) : (
           <pre style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap'}} className="text-sm text-green-400 p-4 overflow-x-auto font-mono">
              {logs}
            </pre>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Log updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
