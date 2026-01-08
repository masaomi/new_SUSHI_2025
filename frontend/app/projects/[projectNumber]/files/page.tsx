'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FilesRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectNumber = params.projectNumber;

  useEffect(() => {
    // Redirect to /projects/{projectNumber}/files/p{projectNumber}
    router.replace(`/projects/${projectNumber}/files/p${projectNumber}`);
  }, [projectNumber, router]);

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to files...</p>
      </div>
    </div>
  );
}