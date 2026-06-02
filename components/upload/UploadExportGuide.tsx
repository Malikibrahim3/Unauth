'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { uploadMutedTextStyle, uploadSubtleBorderStyle, uploadTextStyle } from '@/components/upload/uploadClientStyles';

type UploadExportGuideProps = {
  open: boolean;
  onToggle: () => void;
};

export function UploadExportGuide({ open, onToggle }: UploadExportGuideProps) {
  return (
    <div className="rounded-lg overflow-hidden border" style={uploadSubtleBorderStyle}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors ${open ? 'bg-[var(--bg-subtle)]' : ''} hover:bg-[var(--bg-subtle)]`}
        style={uploadTextStyle}
      >
        {open ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
        How do I export this from your platform?
      </button>
      {open && (
        <div
          className="px-5 pb-5 pt-1 text-sm space-y-1.5"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              In your store admin (e.g., Shopify), go to <strong>Orders</strong>.
            </li>
            <li>
              Click <strong>Export</strong> in the top right.
            </li>
            <li>
              Choose <strong>Orders by date</strong> - last 6 months.
            </li>
            <li>
              Choose <strong>Plain CSV file</strong> and click <strong>Export orders</strong>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
