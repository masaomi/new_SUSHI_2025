'use client';

import { useParams } from 'next/navigation';

export default function ListGStoreFilesPage() {
  const params = useParams();
  const pathSegments = params.path.join('/');

  return (
    <div className="container mx-auto px-6 py-10">
      Hello world {pathSegments}
    </div>
  );
}
