'use client';

import { ADVANCED_INTEGRATIONS } from '@/components/upload/uploadClientConstants';
import { uploadSubtleBorderStyle, uploadSubtleTextStyle, uploadTextStyle } from '@/components/upload/uploadClientStyles';

export function UploadAdvancedIntegrations() {
  return (
    <div className="rounded-lg p-5 space-y-4 border" style={uploadSubtleBorderStyle}>
      <div>
        <h3 className="text-sm font-semibold mb-0.5" style={uploadTextStyle}>
          Advanced Integrations
        </h3>
        <p className="text-xs" style={uploadSubtleTextStyle}>
          These signals go beyond what a CSV export can provide. Connect a data source to unlock deeper identity match
          analysis.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADVANCED_INTEGRATIONS.map((integration) => (
          <div
            key={integration.title}
            className="flex items-start gap-3 rounded-lg px-4 py-3 border"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}
          >
            <span className="text-lg flex-shrink-0">{integration.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={uploadTextStyle}>
                {integration.title}
              </p>
              <p className="text-xs mt-0.5" style={uploadSubtleTextStyle}>
                {integration.description}
              </p>
              <span
                className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded font-semibold"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Planned integration
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
