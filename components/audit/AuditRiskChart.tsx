"use client";

import React from 'react';
import AuditCharts from './AuditCharts';

interface Counts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Props {
  counts: Counts;
  totalRows?: number;
  totalFlagged?: number;
}

export default function AuditRiskChart({ counts, totalRows, totalFlagged }: Props) {
  const summed = counts.critical + counts.high + counts.medium + counts.low;
  const finalTotalFlagged = typeof totalFlagged === 'number' ? totalFlagged : summed;
  const finalTotalRows = typeof totalRows === 'number' ? totalRows : finalTotalFlagged;

  return (
    <AuditCharts counts={counts} totalRows={finalTotalRows} totalFlagged={finalTotalFlagged} />
  );
}
