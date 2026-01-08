'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';
import { useDatasetBase } from '@/lib/hooks';
import DatasetApps from './DatasetApps';
import DatasetTree from './DatasetTree';
import DatasetSamples from './DatasetSamples';
import DatasetInfoCard from './DatasetInfoCard';
import TreeArboristWrapper from './TreeArboristWrapper';

export default function DatasetDetailPage() {
  const params = useParams<{ projectNumber: string; datasetId: string }>();
  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);

  const { dataset, isLoading: isDatasetLoading, error: datasetError, notFound: datasetNotFound } = useDatasetBase(datasetId);

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
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Comment
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Rename
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Download
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Scripts
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Merge
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Parameters
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Update Size
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          B-Fabric ID
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Announce
        </button>
        <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          GEO-uploader
        </button>
        <button className="px-2 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50">
          Delete
        </button>
      </div>

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


