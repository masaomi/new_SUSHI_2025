'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';
import { useDatasetBase } from '@/lib/hooks';
import { datasetApi } from '@/lib/api';
import DatasetApps from './DatasetApps';
import DatasetTree from './DatasetTree';
import DatasetSamples from './DatasetSamples';
import DatasetInfoCard from './DatasetInfoCard';
import TreeArboristWrapper from './TreeArboristWrapper';

export default function DatasetDetailPage() {
  const params = useParams<{ projectNumber: string; datasetId: string }>();
  const router = useRouter();
  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);

  const { dataset, isLoading: isDatasetLoading, error: datasetError, notFound: datasetNotFound } = useDatasetBase(datasetId);

  // State for expandable input actions
  const [activeAction, setActiveAction] = useState<'comment' | 'rename' | 'bfabricId' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleActionSubmit = async () => {
    if (!inputValue.trim()) return;
    if (activeAction === 'comment') {
      await datasetApi.addComment(datasetId, inputValue);
    } else if (activeAction === 'rename') {
      await datasetApi.renameDataset(datasetId, inputValue);
    } else if (activeAction === 'bfabricId') {
      await datasetApi.setBFabricId(datasetId, inputValue);
    }
    alert('Mock call api');
    setActiveAction(null);
    setInputValue('');
  };

  const handleActionCancel = () => {
    setActiveAction(null);
    setInputValue('');
  };

  if (isDatasetLoading) return (
    <div className="container mx-auto px-6 py-8">
      <div className="animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
        
        {/* Title skeleton */}
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        
        {/* Card skeleton */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  if (datasetError) return (
    <div className="container mx-auto px-6 py-8">
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-2">Failed to load dataset</div>
        <p className="text-gray-500 mb-4">There was an error loading the dataset information.</p>
        <Link href={`/projects/${projectNumber}/datasets`} className="text-blue-600 hover:underline">
          ← Back to Datasets
        </Link>
      </div>
    </div>
  );

  if (datasetNotFound || !dataset) {
    return (
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Dataset Not Found</h1>
        <p className="text-gray-700 mb-6">Dataset {datasetId} was not found in project {projectNumber}.</p>
        <Link href={`/projects/${projectNumber}/datasets`} className="text-blue-600 hover:underline">← Back to Datasets</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">

      <Breadcrumbs items={[
        { label: `Project ${projectNumber}`, href: `/projects/${projectNumber}` },
        { label: 'Datasets', href: `/projects/${projectNumber}/datasets` },
        { label: dataset.name, active: true }
      ]} />

      {/* Dataset Actions */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          className={`px-2 py-1 text-xs font-medium rounded ${activeAction === 'comment' ? 'bg-blue-600 text-white border border-blue-600' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
          onClick={() => { setActiveAction(activeAction === 'comment' ? null : 'comment'); setInputValue(''); }}
        >
          Comment
        </button>
        <button
          className={`px-2 py-1 text-xs font-medium rounded ${activeAction === 'rename' ? 'bg-blue-600 text-white border border-blue-600' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
          onClick={() => { setActiveAction(activeAction === 'rename' ? null : 'rename'); setInputValue(activeAction === 'rename' ? '' : dataset.name); }}
        >
          Rename
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={async () => { await datasetApi.downloadDataset(datasetId); alert('Mock call api'); }}
        >
          Download
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={() => router.push(`/projects/${projectNumber}/datasets/${datasetId}/jobs`)}
        >
          Job Scripts
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={async () => { await datasetApi.mergeDataset(datasetId); alert('Mock call api'); }}
        >
          Merge with another dataset
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={() => router.push(`/projects/${projectNumber}/datasets/${datasetId}/parameters`)}
        >
          Parameters
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={async () => {
            const { appName } = await datasetApi.getResubmitData(datasetId);
            router.push(`/projects/${projectNumber}/datasets/${datasetId}/run-application/${appName}?resubmit=true`);
          }}
        >
          Resubmit
        </button>
        <button
          className={`px-2 py-1 text-xs font-medium rounded ${activeAction === 'bfabricId' ? 'bg-blue-600 text-white border border-blue-600' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
          onClick={() => { setActiveAction(activeAction === 'bfabricId' ? null : 'bfabricId'); setInputValue(''); }}
        >
          B-Fabric ID
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={() => window.open(`https://geo-uploader.fgcz.uzh.ch/sessions/new/datasets/${datasetId}`, '_blank')}
        >
          GEO-uploader
        </button>
        <button
          className="px-2 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
          onClick={async () => { await datasetApi.deleteDataset(datasetId); alert('Mock call api'); }}
        >
          Delete
        </button>
      </div>

      {/* Expandable input field for Comment/Rename/B-Fabric ID */}
      {activeAction && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 min-w-24">
              {activeAction === 'comment' ? 'Comment:' : activeAction === 'rename' ? 'New name:' : 'B-Fabric ID:'}
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={activeAction === 'comment' ? 'Enter comment...' : activeAction === 'rename' ? 'Enter new name...' : 'Enter B-Fabric ID...'}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleActionSubmit();
                if (e.key === 'Escape') handleActionCancel();
              }}
            />
            <button
              onClick={handleActionSubmit}
              disabled={!inputValue.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
            <button
              onClick={handleActionCancel}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main layout with tree on left and info on right */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left side - Tree (70%) */}
        <div className="lg:col-span-7">
          <TreeArboristWrapper datasetId={datasetId} projectNumber={projectNumber} />
        </div>
        
        {/* Right side - Dataset Information (30%) */}
        <div className="lg:col-span-3" style={{ height: '400px' }}>
          <DatasetInfoCard dataset={dataset} />
        </div>
      </div>
      
      <div className="bg-white border rounded-lg overflow-hidden mt-6">
        <div className="p-6">
          <DatasetSamples samples={dataset.samples} datasetId={datasetId} projectNumber={projectNumber} />

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Runnable Applications</h3>
            <DatasetApps runnableApps={dataset.applications} datasetId={datasetId} projectNumber={projectNumber} />
          </div>
        </div>
      </div>
    </div>
  );
}


