import Link from 'next/link';
import { DatasetAppCategory } from '@/lib/types';

interface DatasetAppsProps {
  runnableApps: DatasetAppCategory[];
  datasetId: number;
  projectNumber: number;
}

export default function DatasetApps({runnableApps, datasetId, projectNumber }: DatasetAppsProps) {
  // TODO: Move this to when loading the datasetInfo
  // if (isRunnableAppsLoading && !runnableApps) {
  //   return (
  //     <div className="animate-pulse space-y-4">
  //       <div className="bg-gray-200 rounded-lg p-4">
  //         <div className="h-5 bg-gray-300 rounded w-24 mb-3"></div>
  //         <div className="flex space-x-2">
  //           <div className="h-8 bg-gray-300 rounded w-20"></div>
  //           <div className="h-8 bg-gray-300 rounded w-16"></div>
  //           <div className="h-8 bg-gray-300 rounded w-18"></div>
  //         </div>
  //       </div>
  //       <div className="bg-gray-200 rounded-lg p-4">
  //         <div className="h-5 bg-gray-300 rounded w-20 mb-3"></div>
  //         <div className="flex space-x-2">
  //           <div className="h-8 bg-gray-300 rounded w-16"></div>
  //           <div className="h-8 bg-gray-300 rounded w-12"></div>
  //           <div className="h-8 bg-gray-300 rounded w-14"></div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  if (runnableApps.length == 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-gray-400 text-lg mb-2">⚙️</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">No runnable applications found</h4>
        <p className="text-gray-500 text-sm mb-4">There are no applications available to run on this dataset.</p>
        <p className="text-gray-400 text-xs">Available applications will appear here based on the dataset type and configuration.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="space-y-4">
        {runnableApps.map((category: DatasetAppCategory, index: number) => (
          <div key={index} className="flex items-center mb-3" style={{ gap: '1rem' }}>
            <h4 className="text-md font-medium text-gray-800 capitalize whitespace-nowrap">
              {category.category}
            </h4>
            <div className="flex overflow-x-auto" style={{ gap: '0.25rem' }}>
              {category.apps.map((app) => (
                <Link
                  key={app.class_name}
                  href={`/projects/${projectNumber}/datasets/${datasetId}/run-application/${app.class_name}`}
                  className="px-3 py-1.5 text-white rounded text-sm font-medium whitespace-nowrap transition-colors duration-200"
                  style={{ backgroundColor: '#5bc0de' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#46a5c4'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5bc0de'}
                >
                  {app.class_name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
