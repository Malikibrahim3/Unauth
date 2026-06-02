'use client';

import { useReducer } from 'react';
import { STATUS_LABELS, STATUS_OPTIONS, statusStyle } from '@/lib/utils/investigationStatus';
import {
  profileInvestigationStatus,
  type DrawerProfile,
} from '@/components/customers/customerIntelligenceDrawerUtils';
import {
  reviewStatusReducer,
  type ReviewStatusState,
} from '@/components/customers/customerIntelligenceDrawerReviewReducer';

export function CustomerIntelligenceDrawerReviewStatus({ profile }: { profile: DrawerProfile }) {
  const initial: ReviewStatusState = {
    status: profileInvestigationStatus(profile),
    saving: false,
  };
  const [state, dispatch] = useReducer(reviewStatusReducer, initial);

  async function handleStatusChange(newStatus: string) {
    const prev = state.status;
    dispatch({ type: 'set_status', status: newStatus });
    dispatch({ type: 'set_saving', saving: true });
    const res = await fetch(`/api/customers/${profile.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      dispatch({ type: 'rollback', status: prev });
      return;
    }
    dispatch({ type: 'set_saving', saving: false });
  }

  return (
    <div className="cid-review-row">
      <span className="cid-detail-label">Review status</span>
      <select
        value={state.status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={state.saving}
        className="cid-status-select"
        style={statusStyle(state.status)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
