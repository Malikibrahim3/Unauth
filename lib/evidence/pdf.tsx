// lib/evidence/pdf.tsx
// Renders the chargeback evidence package as a polished A4 PDF.
// Uses @react-pdf/renderer — Helvetica only (embedded, works on Vercel).
//
// CONTENT RULES:
//   - The word "fraud" never appears in any text node
//   - No other merchant is named
//   - CE3.0 referenced explicitly and professionally when eligible

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { EvidencePackage } from './types'
import { CE3_SIGNAL_LABELS } from './ce3'

// =============================================================================
// Palette
// =============================================================================

const C = {
  text:        '#111827',
  muted:       '#667085',
  accent:      '#2563EB',
  tableBg:     '#F5F2EE',
  border:      '#DED7CC',
  green:       '#067647',
  amber:       '#B54708',
  red:         '#B42318',
  ce3Bg:       '#EFF6FF',
  ce3Border:   '#2563EB',
  amberBg:     '#FFFAEB',
  amberBorder: '#FEDF89',
  subtleBg:    '#F5F2EE',
  darkText:    '#344054',
}

// =============================================================================
// Styles
// =============================================================================

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    paddingTop: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },
  header:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft:    { flexDirection: 'column' },
  headerRight:   { flexDirection: 'column', alignItems: 'flex-end' },
  brandName:     { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.accent },
  brandSub:      { fontSize: 9, color: C.muted, marginTop: 2 },
  headerMeta:    { fontSize: 8, color: C.muted, marginTop: 2 },
  rule:          { borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 12, marginTop: 4 },
  sectionLabel:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.accent, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  sectionSubhead:{ fontSize: 8, color: C.muted, marginBottom: 6 },
  narrative:     { fontSize: 9, color: C.text, lineHeight: 1.6 },
  table:         { marginBottom: 4 },
  tableHeader:   { flexDirection: 'row', backgroundColor: C.tableBg, borderWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  tableRow:      { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  tableRowDisputed: { flexDirection: 'row', borderLeftWidth: 3, borderLeftColor: C.red, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  tableRowCE3:   { flexDirection: 'row', borderLeftWidth: 3, borderLeftColor: C.green, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted },
  tableCell:     { fontSize: 8, color: C.text },
  tableCellMuted:{ fontSize: 8, color: C.muted },
  ce3Box:        { backgroundColor: C.ce3Bg, borderLeftWidth: 3, borderLeftColor: C.ce3Border, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.ce3Border, padding: 10, marginBottom: 8 },
  ce3Title:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.accent, marginBottom: 3 },
  ce3Text:       { fontSize: 9, color: C.darkText, lineHeight: 1.5 },
  infoBox:       { backgroundColor: C.subtleBg, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  infoTitle:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted, marginBottom: 3 },
  infoText:      { fontSize: 9, color: C.muted },
  amberBox:      { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBorder, padding: 10, marginBottom: 8 },
  amberText:     { fontSize: 9, color: C.darkText, lineHeight: 1.5 },
  assessRow:     { flexDirection: 'row', marginBottom: 4 },
  assessLabel:   { fontSize: 8, color: C.muted, width: 160 },
  assessValue:   { fontSize: 8, color: C.text, flex: 1 },
  assessValueGreen: { fontSize: 8, color: C.green, fontFamily: 'Helvetica-Bold', flex: 1 },
  actionNote:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.darkText, marginTop: 8 },
  footer:        { position: 'absolute', bottom: 28, left: 56, right: 56, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  footerRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  footerText:    { fontSize: 7, color: C.muted },
  footerNote:    { fontSize: 7, color: C.muted, lineHeight: 1.4 },
  noteItalic:    { fontSize: 8, color: C.muted, marginTop: 4 },
})

// =============================================================================
// Helpers
// =============================================================================

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

function fmtCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

// =============================================================================
// Sub-components (JSX)
// =============================================================================

function PDFHeader({ pkg }: { pkg: EvidencePackage }) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Text style={s.brandName}>UNAUTH</Text>
        <Text style={s.brandSub}>Identity Verification Report</Text>
      </View>
      <View style={s.headerRight}>
        <Text style={s.headerMeta}>Reference: {pkg.referenceNumber}</Text>
        <Text style={s.headerMeta}>Generated: {fmt(pkg.generatedAt)} UTC</Text>
        <Text style={s.headerMeta}>Prepared for: {pkg.merchant.name}</Text>
        <Text style={s.headerMeta}>Order in dispute: {pkg.disputedOrder.orderId}</Text>
      </View>
    </View>
  )
}

function PDFCe3Banner({ pkg }: { pkg: EvidencePackage }) {
  if (!pkg.ce3.eligible) return null
  return (
    <View style={s.ce3Box}>
      <Text style={s.ce3Title}>VISA COMPELLING EVIDENCE 3.0 — ELIGIBLE</Text>
      <Text style={s.ce3Text}>
        This submission satisfies the criteria for Visa CE3.0 (Reason Code 10.4). Two qualifying prior transactions have been identified. Present this package to your acquirer via Visa Resolve Online (VROL) within the representment window (30 days from chargeback notification).
      </Text>
    </View>
  )
}

function PDFIdentityEvidenceTable({ pkg }: { pkg: EvidencePackage }) {
  const colWidths = [120, 130, 60, 40, 70]
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {(['Identifier Type', 'Value (masked)', 'First Seen', 'Orders', 'CE3.0 Accepted'] as const).map((h, i) => (
          <Text key={h} style={[s.tableHeaderCell, { flex: colWidths[i] }]}>{h}</Text>
        ))}
      </View>
      {pkg.identityEvidence.map((ev, i) => (
        <View key={i} style={s.tableRow}>
          <Text style={[s.tableCell, { flex: colWidths[0] }]}>{ev.identifierType}</Text>
          <Text style={[s.tableCell, { flex: colWidths[1] }]}>{ev.maskedValue}</Text>
          <Text style={[s.tableCellMuted, { flex: colWidths[2] }]}>{fmt(ev.firstSeen)}</Text>
          <Text style={[s.tableCellMuted, { flex: colWidths[3] }]}>{ev.orderCount}</Text>
          <Text style={[s.tableCell, { flex: colWidths[4], color: ev.ce3Accepted ? C.green : C.muted }]}>
            {ev.ce3Accepted ? '✓ Yes' : '—'}
          </Text>
        </View>
      ))}
    </View>
  )
}

function PDFOrderHistoryTable({ pkg }: { pkg: EvidencePackage }) {
  const colWidths = [60, 100, 60, 65, 65, 90]
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {(['Date', 'Order ID', 'Value', 'Outcome', 'Time to Claim', 'CE3.0 Role'] as const).map((h, i) => (
          <Text key={h} style={[s.tableHeaderCell, { flex: colWidths[i] }]}>{h}</Text>
        ))}
      </View>
      {pkg.orderHistory.map((order, i) => {
        const rowStyle = order.isDisputedOrder
          ? s.tableRowDisputed
          : order.isCE3QualifyingTransaction
            ? s.tableRowCE3
            : s.tableRow
        let ce3Role = ''
        let ce3Color = C.muted
        if (order.isDisputedOrder) { ce3Role = 'Disputed order'; ce3Color = C.red }
        else if (order.isCE3QualifyingTransaction) { ce3Role = 'Qualifying prior \u2713'; ce3Color = C.green }
        return (
          <View key={i} style={rowStyle}>
            <Text style={[s.tableCellMuted, { flex: colWidths[0] }]}>{fmt(order.date)}</Text>
            <Text style={[s.tableCell, { flex: colWidths[1] }]}>{order.orderId}</Text>
            <Text style={[s.tableCell, { flex: colWidths[2] }]}>{fmtCurrency(order.value, pkg.disputedOrder.currency)}</Text>
            <Text style={[s.tableCellMuted, { flex: colWidths[3] }]}>{order.outcome}</Text>
            <Text style={[s.tableCellMuted, { flex: colWidths[4] }]}>{order.timeToClaim ?? '—'}</Text>
            <Text style={[s.tableCell, { flex: colWidths[5], color: ce3Color }]}>{ce3Role}</Text>
          </View>
        )
      })}
    </View>
  )
}

function PDFCe3Assessment({ pkg }: { pkg: EvidencePackage }) {
  const { ce3 } = pkg
  if (ce3.eligible) {
    const p1 = ce3.priorTransactions[0]
    const p2 = ce3.priorTransactions[1]
    const sigList = ce3.qualifyingSignals.map(s => CE3_SIGNAL_LABELS[s] ?? s).join(', ')
    const priorTxText = p1 && p2
      ? `${p1.orderId} (${fmt(p1.orderDate)}), ${p2.orderId} (${fmt(p2.orderDate)})`
      : p1 ? `${p1.orderId} (${fmt(p1.orderDate)})` : 'See order history'
    const daysText = p1 && p2
      ? `${p1.daysPriorToDispute} days, ${p2.daysPriorToDispute} days (minimum 120 required)`
      : 'See order history'

    return (
      <View style={s.ce3Box}>
        {([
          ['Framework', 'Visa Compelling Evidence 3.0 (CE3.0)', false],
          ['Applicable reason code', '10.4 — Other Fraud: Card Absent Environment', false],
          ['Eligibility', 'ELIGIBLE', true],
          ['Qualifying prior transactions', priorTxText, false],
          ['Matching signals per transaction', sigList || '—', false],
          ['Days prior to dispute', daysText, false],
        ] as [string, string, boolean][]).map(([label, value, isGreen]) => (
          <View key={label} style={s.assessRow}>
            <Text style={s.assessLabel}>{label}</Text>
            <Text style={isGreen ? s.assessValueGreen : s.assessValue}>{value}</Text>
          </View>
        ))}
        <Text style={s.actionNote}>
          NEXT STEP: Submit this package to your acquirer and request presentment via Visa Resolve Online (VROL). Your acquirer will submit the CE3.0 evidence on your behalf. Response window: 30 days from chargeback notification.
        </Text>
      </View>
    )
  }

  return (
    <View style={s.infoBox}>
      <Text style={s.infoTitle}>CE3.0 Eligibility: NOT MET</Text>
      <Text style={s.infoText}>{ce3.disqualifyingFactors[0] ?? ce3.reason}</Text>
      <Text style={[s.infoText, { marginTop: 6 }]}>
        This package remains valid as supporting evidence for a standard representment submission under both Visa and Mastercard dispute guidelines. Identity pattern evidence and purchase history are accepted evidence types under both networks&apos; representment frameworks.
      </Text>
    </View>
  )
}

function PDFCrossMerchantSection({ pkg }: { pkg: EvidencePackage }) {
  const { crossMerchant, merchant } = pkg
  if (crossMerchant.satisfied && crossMerchant.merchantCount != null) {
    return (
      <View style={s.amberBox}>
        <Text style={s.amberText}>
          {`This customer's identity has been observed at ${crossMerchant.merchantCount} other merchant${crossMerchant.merchantCount === 1 ? '' : 's'} in the Unauth network. No merchant names, customer details, or order data from other merchants are disclosed. This indicator may be cited as additional context in representment submissions, though it falls outside CE3.0's specific single-merchant framework.`}
        </Text>
        {crossMerchant.networkOrderCount != null && (
          <View style={{ marginTop: 6 }}>
            <Text style={s.amberText}>Total orders across network: {crossMerchant.networkOrderCount}</Text>
            {crossMerchant.networkRefundRate != null && (
              <Text style={s.amberText}>Refund rate across network: {crossMerchant.networkRefundRate}%</Text>
            )}
          </View>
        )}
      </View>
    )
  }
  return (
    <View style={s.infoBox}>
      <Text style={s.infoText}>
        Cross-merchant pattern data is not available for this customer at this time. Evidence is based solely on activity at {merchant.name}.
      </Text>
    </View>
  )
}

function PDFFooter({ pkg }: { pkg: EvidencePackage }) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRow}>
        <Text style={s.footerText}>Reference: {pkg.referenceNumber} | Generated: {fmt(pkg.generatedAt)}</Text>
        <Text style={s.footerText}>Unauth — https://unauth.co</Text>
      </View>
      <Text style={s.footerNote}>
        {`This report was generated by Unauth on behalf of ${pkg.merchant.name}. Identifiers are pseudonymised using HMAC-SHA256. Engine version: ${pkg.engineVersion}. This document is provided as supporting evidence only. Unauth does not guarantee dispute outcomes. Follow your acquirer's submission guidelines.`}
      </Text>
    </View>
  )
}

function EvidenceDocument({ pkg, narrative }: { pkg: EvidencePackage; narrative: string }) {
  return (
    <Document title={`Evidence Package ${pkg.referenceNumber}`} author="Unauth">
      {/* Page 1 — Summary + Identity Evidence */}
      <Page size="A4" style={s.page}>
        <PDFHeader pkg={pkg} />
        <View style={s.rule} />
        <PDFCe3Banner pkg={pkg} />
        <Text style={s.sectionLabel}>SUMMARY</Text>
        <Text style={s.narrative}>{narrative}</Text>
        <Text style={s.sectionLabel}>IDENTITY EVIDENCE</Text>
        <Text style={s.sectionSubhead}>
          The following identifying details were observed across multiple orders at {pkg.merchant.name}.
        </Text>
        <PDFIdentityEvidenceTable pkg={pkg} />
        <Text style={s.noteItalic}>
          CE3.0 Accepted signals are those formally recognised by Visa under Compelling Evidence 3.0 as valid identity matching data points.
        </Text>
        <PDFFooter pkg={pkg} />
      </Page>

      {/* Page 2 — Order History + Assessment */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionLabel}>ORDER HISTORY</Text>
        <Text style={s.sectionSubhead}>
          All orders from this customer at {pkg.merchant.name}, chronological.
        </Text>
        <PDFOrderHistoryTable pkg={pkg} />
        {pkg.ce3.eligible && (
          <Text style={s.noteItalic}>
            Orders marked &apos;Qualifying prior ✓&apos; satisfy Visa CE3.0 requirements: each shares at least two accepted identity signals with the disputed order and occurred more than 120 days prior to the dispute.
          </Text>
        )}
        <Text style={s.sectionLabel}>COMPELLING EVIDENCE 3.0 ASSESSMENT</Text>
        <PDFCe3Assessment pkg={pkg} />
        <Text style={s.sectionLabel}>CROSS-MERCHANT PATTERN</Text>
        <PDFCrossMerchantSection pkg={pkg} />
        {pkg.merchantNotes && (
          <>
            <Text style={s.sectionLabel}>MERCHANT NOTES</Text>
            <Text style={s.narrative}>{pkg.merchantNotes}</Text>
          </>
        )}
        <PDFFooter pkg={pkg} />
      </Page>
    </Document>
  )
}

// =============================================================================
// Public export
// =============================================================================

export async function renderEvidencePDF(
  pkg: EvidencePackage,
  narrative: string
): Promise<Buffer> {
  const buffer = await renderToBuffer(<EvidenceDocument pkg={pkg} narrative={narrative} />)
  return Buffer.from(buffer)
}
