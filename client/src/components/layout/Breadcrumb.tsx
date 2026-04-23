import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  items: string[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="text-gray-400 text-sm mb-6 flex items-center gap-2 font-medium">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <span className={index === items.length - 1 ? 'text-gray-800' : ''}>{item}</span>
          {index < items.length - 1 && <ChevronRight size={14} />}
        </React.Fragment>
      ))}
    </div>
  );
}
