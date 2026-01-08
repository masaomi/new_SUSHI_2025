import { useDatasetTree } from '@/lib/hooks';
import TreeArborist from './TreeArborist';

interface TreeArboristWrapperProps {
  datasetId: number;
  projectNumber: number;
}

export default function TreeArboristWrapper({ datasetId, projectNumber }: TreeArboristWrapperProps) {
  const { datasetTree, isLoading, error, isEmpty } = useDatasetTree(datasetId);

  if (isLoading && !datasetTree) {
    return (
      <div className="h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 border rounded-lg bg-red-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load tree data</div>
      </div>
    );
  }

  if (!datasetTree || isEmpty) {
    return (
      <div className="h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">No tree data available</div>
      </div>
    );
  }

  return <TreeArborist datasetTree={datasetTree} datasetId={datasetId} projectNumber={projectNumber} />;
}