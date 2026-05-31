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

/** Duplicate distribution widgets removed — match strength breakdown is shown in the audit hero. */
export default function AuditRiskChart(_props: Props) {
  return null;
}
