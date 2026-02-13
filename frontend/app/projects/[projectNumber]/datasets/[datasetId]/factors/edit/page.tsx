'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import FactorsEditableTable from './FactorsEditableTable';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';
import { useDatasetBase } from '@/lib/hooks';
import DatasetInfoCard from '../../DatasetInfoCard';

export default function FactorsEditPage() {
  const params = useParams<{ projectNumber: string; datasetId: string }>();
  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);

  const { dataset, isLoading: isDatasetLoading, error: datasetError, notFound: datasetNotFound } = useDatasetBase(datasetId);

  if (isDatasetLoading) {
    return <FactorsEditPageSkeleton />;
  }

  if (datasetError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load dataset</div>
          <p className="text-gray-500 mb-4">There was an error loading the dataset information.</p>
          <Link href={`/projects/${projectNumber}/datasets/${datasetId}`} className="text-blue-600 hover:underline">
            ← Back to Dataset
          </Link>
        </div>
      </div>
    );
  }

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
        { label: dataset.name, href: `/projects/${projectNumber}/datasets/${datasetId}` },
        { label: "Edit Factors", active: true }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Factors - {dataset.name}</h1>
        <Link
          href={`/projects/${projectNumber}/datasets/${datasetId}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Back to Dataset
        </Link>
      </div>

      <div className="space-y-6">
        {/* Dataset Details Section - Read Only */}
        <DatasetInfoCard dataset={dataset} />

        {/* Editable Factors Section */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold">Edit Factors Table</h2>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>Please enter values in the factor column to group replicates.</p>
              <p>Samples with the same string in the experimental factor are considered as replicates.</p>
              <p>The strings should be short and informative and must not contain spaces or special characters.</p>
              <p className="text-gray-500">Examples: "KO" and "WT"; "treated" and "ctrl", ...</p>
            </div>
          </div>
          <div className="p-6">
            <FactorsEditableTable
              initialSamples={dataset.samples}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FactorsEditPageSkeleton() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-gray-200 rounded w-64 mb-6"></div>

        {/* Title and back button skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-72"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Dataset info card skeleton */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="p-6">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 border-b">
                <div className="flex gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-300 rounded w-24"></div>
                  ))}
                </div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 border-b last:border-b-0">
                  <div className="flex gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded w-24"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
