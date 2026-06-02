'use client';

import { UPLOAD_STEP_LABELS } from '@/components/upload/uploadClientConstants';
import { uploadStepBarStyle, uploadStepLabelStyle } from '@/components/upload/uploadClientStyles';

type UploadStepIndicatorProps = {
  stepIndex: number;
};

export function UploadStepIndicator({ stepIndex }: UploadStepIndicatorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {UPLOAD_STEP_LABELS.map((label, index) => (
          <div key={label}>
            <div className="h-1 rounded-sm" style={uploadStepBarStyle(index, stepIndex)} />
            <p className="t-label mt-2 whitespace-nowrap" style={uploadStepLabelStyle(index, stepIndex)}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
