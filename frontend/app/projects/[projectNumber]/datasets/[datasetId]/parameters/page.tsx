'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Breadcrumbs from '@/lib/ui/Breadcrumbs';
import { datasetApi } from '@/lib/api';

export default function DatasetParametersPage() {
  const params = useParams<{ projectNumber: string; datasetId: string }>();
  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);

  const { data: parameters, isLoading, error } = useQuery({
    queryKey: ['dataset-parameters', datasetId],
    queryFn: () => datasetApi.getDatasetParameters(datasetId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white border rounded-lg p-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex py-2 border-b last:border-b-0">
                <div className="h-4 bg-gray-200 rounded w-32 mr-4"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
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
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load parameters</div>
          <p className="text-gray-500 mb-4">There was an error loading the dataset parameters.</p>
          <Link href={`/projects/${projectNumber}/datasets/${datasetId}`} className="text-blue-600 hover:underline">
            Back to Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Breadcrumbs items={[
        { label: `Project ${projectNumber}`, href: `/projects/${projectNumber}` },
        { label: 'Datasets', href: `/projects/${projectNumber}/datasets` },
        { label: `Dataset ${datasetId}`, href: `/projects/${projectNumber}/datasets/${datasetId}` },
        { label: 'Parameters', active: true }
      ]} />

      <h1 className="text-2xl font-bold mb-6">Parameters of Dataset: {datasetId}</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead style={{ backgroundColor: '#6CD3D1' }}>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Parameter</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {parameters && Object.entries(parameters).map(([key, value], index) => (
              <tr key={key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-t">{key}</td>
                <td className="px-4 py-3 text-sm text-gray-900 border-t">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
