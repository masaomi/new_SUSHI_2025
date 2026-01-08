import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const elements: JSX.Element[] = [];
  
  items.forEach((item, index) => {
    if (index > 0) {
      elements.push(
        <li key={`sep-${index}`} className="text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </li>
      );
    }
    
    elements.push(
      <li key={`item-${index}`}>
        {item.href && !item.active ? (
          <Link 
            href={item.href} 
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors font-medium"
          >
            {item.label}
          </Link>
        ) : (
          <span className="text-gray-700 font-semibold bg-gray-100 px-2 py-1 rounded">
            {item.label}
          </span>
        )}
      </li>
    );
  });

  return (
    <nav className="mb-6">
      <ol className="flex items-center space-x-1 text-sm">
        {elements}
      </ol>
    </nav>
  );
}

export type { BreadcrumbItem, BreadcrumbsProps };
