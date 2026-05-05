"use client";

import React from 'react';
import AuditCharts from './AuditCharts';

interface Counts {
  definite: number;
  probable: number;
  possible: number;
  weak: number;
}

interface Props {
  counts: Counts;
  totalRows?: number;
  totalFlagged?: number;
}

export default function AuditRiskChart({ counts, totalRows, totalFlagged }: Props) {
  const summed = counts.definite + counts.probable + counts.possible + counts.weak;
  const finalTotalFlagged = typeof totalFlagged === 'number' ? totalFlagged : summed;
  const finalTotalRows = typeof totalRows === 'number' ? totalRows : finalTotalFlagged;

  return (
    <AuditCharts counts={counts} totalRows={finalTotalRows} totalFlagged={finalTotalFlagged} />
  );
}
