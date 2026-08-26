'use client';

import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props }, ref,
) {
  return (
    <span className="ua-select-wrap">
      <select ref={ref} className={cn('ua-form-control ua-select', className)} {...props} />
      <ChevronDown aria-hidden="true" size={14} />
    </span>
  );
});
