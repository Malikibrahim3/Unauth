// lib/evidence/pdf.tsx
// Renders the identity evidence package as a polished A4 PDF.
// Uses @react-pdf/renderer — Helvetica only (embedded, works on Vercel).
//
// CONTENT RULES:
//   - The word "fraud" never appears in any text node
//   - No other merchant is named
//   - Neutral identity-match framing only (no card-network compliance claims)

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
  text:        '#141821',
  muted:       '#78889C',
  accent:      '#2563EB',
  tableBg:     '#FAF6EF',
  border:      '#E5DECE',
  green:       '#2F6B43',
  amber:       '#8B6A14',
  red:         '#9F1D1D',
  highlightBg: '#EEF3FE',
  highlightBorder: '#2563EB',
  amberBg:     '#F7F0DA',
  amberBorder: '#CDB258',
  subtleBg:    '#FAF6EF',
  darkText:    '#2E3947',
}

const EXPORT_DISCLAIMER =
  'This report presents cross-merchant identity match data. Merchants may use this information to support chargeback dispute processes at their discretion.'

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
  tableRowMatched:   { flexDirection: 'row', borderLeftWidth: 3, borderLeftColor: C.green, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted },
  tableCell:     { fontSize: 8, color: C.text },
  tableCellMuted:{ fontSize: 8, color: C.muted },
  highlightBox:        { backgroundColor: C.highlightBg, borderLeftWidth: 3, borderLeftColor: C.highlightBorder, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.highlightBorder, padding: 10, marginBottom: 8 },
  highlightTitle:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.accent, marginBottom: 3 },
  highlightText:       { fontSize: 9, color: C.darkText, lineHeight: 1.5 },
  infoBox:       { backgroundColor: C.subtleBg, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 8 },
  infoTitle:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted, marginBottom: 3 },
  infoText:      { fontSize: 9, color: C.muted },
  amberBox:      { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBorder, padding: 10, marginBottom: 8 },
  amberText:     { fontSize: 9, color: C.darkText, lineHeight: 1.5 },
  assessRow:     { flexDirection: 'row', marginBottom: 4 },
  assessLabel:   { fontSize: 8, color: C.muted, width: 160 },
  assessValue:   { fontSize: 8, color: C.text, flex: 1 },
  assessValueGreen: { fontSize: 8, color: C.green, fontFamily: 'Helvetica-Bold', flex: 1 },
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
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

function fmtCurrency(amount: number, _currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function priorMatchStrength(pkg: EvidencePackage): 'Strong' | 'Partial' | 'None' {
  const { ce3 } = pkg
  const signalCount = pkg.identityEvidence.length
  if (ce3.eligible && signalCount >= 3 && ce3.priorTransactions.length >= 2) return 'Strong'
  if (ce3.eligible || ce3.priorTransactions.length > 0 || signalCount >= 2) return 'Partial'
  return 'None'
}

// =============================================================================
// Sub-components (JSX)
// =============================================================================

function PDFHeader({ pkg }: { pkg: EvidencePackage }) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Text style={s.brandName}>UNAUTH</Text>
        <Text style={s.brandSub}>Identity Evidence Report</Text>
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

function PDFPriorMatchBanner({ pkg }: { pkg: EvidencePackage }) {
  const strength = priorMatchStrength(pkg)
  if (strength === 'None') return null
  return (
    <View style={s.highlightBox}>
      <Text style={s.highlightTitle}>
        {strength === 'Strong' ? 'STRONG PRIOR IDENTITY MATCH' : 'PARTIAL PRIOR IDENTITY MATCH'}
      </Text>
      <Text style={s.highlightText}>
        {strength === 'Strong'
          ? `Prior orders in your records share multiple identity signals with the disputed transaction (${pkg.ce3.priorTransactions.length} matched prior${pkg.ce3.priorTransactions.length === 1 ? '' : 's'} identified).`
          : 'Some prior orders or identity signals align with the disputed transaction. Review the match matrix and order history below.'}
      </Text>
    </View>
  )
}

function PDFIdentityEvidenceTable({ pkg }: { pkg: EvidencePackage }) {
  const colWidths = [120, 130, 60, 40, 70]
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {(['Identifier Type', 'Value (masked)', 'First Seen', 'Orders', 'Core signal'] as const).map((h, i) => (
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
        {(['Date', 'Order ID', 'Value', 'Outcome', 'Time to Claim', 'Match role'] as const).map((h, i) => (
          <Text key={h} style={[s.tableHeaderCell, { flex: colWidths[i] }]}>{h}</Text>
        ))}
      </View>
      {pkg.orderHistory.map((order, i) => {
        const rowStyle = order.isDisputedOrder
          ? s.tableRowDisputed
          : order.isCE3QualifyingTransaction
            ? s.tableRowMatched
            : s.tableRow
        let matchRole = ''
        let matchColor = C.muted
        if (order.isDisputedOrder) { matchRole = 'Disputed order'; matchColor = C.red }
        else if (order.isCE3QualifyingTransaction) { matchRole = 'Matched prior'; matchColor = C.green }
        return (
          <View key={i} style={rowStyle}>
            <Text style={[s.tableCellMuted, { flex: colWidths[0] }]}>{fmt(order.date)}</Text>
            <Text style={[s.tableCell, { flex: colWidths[1] }]}>{order.orderId}</Text>
            <Text style={[s.tableCell, { flex: colWidths[2] }]}>{fmtCurrency(order.value, pkg.disputedOrder.currency)}</Text>
            <Text style={[s.tableCellMuted, { flex: colWidths[3] }]}>{order.outcome}</Text>
            <Text style={[s.tableCellMuted, { flex: colWidths[4] }]}>{order.timeToClaim ?? '—'}</Text>
            <Text style={[s.tableCell, { flex: colWidths[5], color: matchColor }]}>{matchRole}</Text>
          </View>
        )
      })}
    </View>
  )
}

function PDFIdentityMatchMatrix({ pkg }: { pkg: EvidencePackage }) {
  const { ce3 } = pkg
  const priors = ce3.priorTransactions
  const labelW = 150
  const dataW = Math.max(60, Math.floor((360 - labelW) / (priors.length + 1)))

  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { width: labelW }]}>Identity signal</Text>
        <Text style={[s.tableHeaderCell, { width: dataW, textAlign: 'center' }]}>Disputed</Text>
        {priors.map((p, i) => (
          <Text key={p.orderId} style={[s.tableHeaderCell, { width: dataW, textAlign: 'center' }]}>
            {`Prior ${i + 1}`}
          </Text>
        ))}
      </View>
      {ce3.matchMatrix.map((row) => (
        <View key={row.element} style={s.tableRow}>
          <Text style={[s.tableCell, { width: labelW }]}>
            {row.label}{row.isMandatory ? ' \u2020' : ''}
          </Text>
          <Text
            style={[
              s.tableCell,
              { width: dataW, textAlign: 'center', color: row.disputedPresent ? C.green : C.muted },
            ]}
          >
            {row.disputedPresent ? '\u2713' : '\u2014'}
          </Text>
          {row.priorMatches.map((matched, i) => (
            <Text
              key={priors[i]?.orderId ?? i}
              style={[
                s.tableCell,
                { width: dataW, textAlign: 'center', color: matched ? C.green : C.muted },
              ]}
            >
              {matched ? '\u2713' : '\u2014'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function PDFPriorMatchAssessment({ pkg }: { pkg: EvidencePackage }) {
  const { ce3 } = pkg
  const priors = ce3.priorTransactions
  const strength = priorMatchStrength(pkg)

  const credentialText =
    ce3.paymentCredential === 'verified'
      ? 'Same payment credential observed across compared transactions'
      : ce3.paymentCredential === 'mismatch'
        ? 'Payment credential differs between compared transactions'
        : 'Not captured in source data'

  const priorRows: [string, string, boolean][] = priors.map((p, i) => {
    const windowNote = p.withinWindow
      ? `within ${ce3.windowDays.min}\u2013${ce3.windowDays.max} day lookback`
      : p.daysPriorToDispute > ce3.windowDays.max
        ? `outside ${ce3.windowDays.max}-day lookback`
        : `under ${ce3.windowDays.min}-day lookback`
    const matched = p.matchingSignals.map(sig => CE3_SIGNAL_LABELS[sig] ?? sig).join(', ') || 'none'
    return [
      `Prior ${i + 1} — ${p.orderId}`,
      `${fmt(p.orderDate)} · ${p.daysPriorToDispute} days prior (${windowNote}) · signals: ${matched}`,
      p.withinWindow && p.hasMandatoryElement && p.matchingSignals.length >= 2,
    ]
  })

  const headerRows: [string, string, boolean][] = [
    ['Prior identity match', strength, strength === 'Strong'],
    ['Matched prior orders', priors.length > 0 ? String(priors.length) : 'None identified', priors.length >= 2],
    ['Lookback window', `${ce3.windowDays.min}–${ce3.windowDays.max} days before disputed order`, false],
    [
      'IP or device overlap',
      ce3.mandatorySatisfied ? 'Present on matched priors' : 'Not confirmed',
      ce3.mandatorySatisfied,
    ],
    ['Payment credential', credentialText, ce3.paymentCredential === 'verified'],
  ]

  return (
    <View style={strength === 'Strong' ? s.highlightBox : s.infoBox}>
      {headerRows.map(([label, value, isGreen]) => (
        <View key={label} style={s.assessRow}>
          <Text style={s.assessLabel}>{label}</Text>
          <Text style={isGreen ? s.assessValueGreen : s.assessValue}>{value}</Text>
        </View>
      ))}

      {priors.length > 0 && (
        <>
          <Text style={[s.sectionSubhead, { marginTop: 8, marginBottom: 4 }]}>
            IDENTITY SIGNAL MATCH MATRIX
          </Text>
          <PDFIdentityMatchMatrix pkg={pkg} />
          <Text style={s.noteItalic}>
            {'\u2020'} Signals marked mandatory require IP address or device ID overlap on matched priors.
          </Text>
        </>
      )}

      {priorRows.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {priorRows.map(([label, value, ok]) => (
            <View key={label} style={s.assessRow}>
              <Text style={[s.assessLabel, { color: ok ? C.green : C.muted }]}>{label}</Text>
              <Text style={s.assessValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {ce3.disqualifyingFactors.length > 0 && strength !== 'Strong' && (
        <View style={{ marginTop: 6 }}>
          {ce3.disqualifyingFactors.map((f, i) => (
            <Text key={i} style={s.infoText}>• {f}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function PDFCrossMerchantSection({ pkg }: { pkg: EvidencePackage }) {
  const { crossMerchant, merchant } = pkg
  if (crossMerchant.satisfied && crossMerchant.merchantCount != null) {
    return (
      <View style={s.amberBox}>
        <Text style={s.amberText}>
          {`This customer's identity has been observed at ${crossMerchant.merchantCount} other merchant${crossMerchant.merchantCount === 1 ? '' : 's'} in the Unauth network. No merchant names, customer details, or order data from other merchants are disclosed. This cross-merchant match data may provide additional context alongside your store-level evidence.`}
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
        {`This report was generated by Unauth on behalf of ${pkg.merchant.name}. Identifiers are pseudonymised using HMAC-SHA256. Engine version: ${pkg.engineVersion}. ${EXPORT_DISCLAIMER}`}
      </Text>
    </View>
  )
}

function EvidenceDocument({ pkg, narrative }: { pkg: EvidencePackage; narrative: string }) {
  return (
    <Document title={`Identity Evidence ${pkg.referenceNumber}`} author="Unauth">
      <Page size="A4" style={s.page}>
        <PDFHeader pkg={pkg} />
        <View style={s.rule} />
        <PDFPriorMatchBanner pkg={pkg} />
        <Text style={s.sectionLabel}>SUMMARY</Text>
        <Text style={s.narrative}>{narrative}</Text>
        <Text style={s.sectionLabel}>IDENTITY EVIDENCE</Text>
        <Text style={s.sectionSubhead}>
          The following identifying details were observed across multiple orders at {pkg.merchant.name}.
        </Text>
        <PDFIdentityEvidenceTable pkg={pkg} />
        <Text style={s.noteItalic}>
          Core signals are identity data points used for prior-order matching in this report.
        </Text>
        <PDFFooter pkg={pkg} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.sectionLabel}>ORDER HISTORY</Text>
        <Text style={s.sectionSubhead}>
          All orders from this customer at {pkg.merchant.name}, chronological.
        </Text>
        <PDFOrderHistoryTable pkg={pkg} />
        {pkg.ce3.priorTransactions.length > 0 && (
          <Text style={s.noteItalic}>
            Orders marked &apos;Matched prior&apos; share identity signals with the disputed order within the lookback window.
          </Text>
        )}
        <Text style={s.sectionLabel}>PRIOR ORDER IDENTITY MATCH</Text>
        <PDFPriorMatchAssessment pkg={pkg} />
        <Text style={s.sectionLabel}>CROSS-MERCHANT PATTERN</Text>
        <PDFCrossMerchantSection pkg={pkg} />
        {pkg.merchantNotes && (
          <View>
            <Text style={s.sectionLabel}>MERCHANT NOTES</Text>
            <Text style={s.narrative}>{pkg.merchantNotes}</Text>
          </View>
        )}
        <Text style={[s.noteItalic, { marginTop: 10 }]}>{EXPORT_DISCLAIMER}</Text>
        <PDFFooter pkg={pkg} />
      </Page>
    </Document>
  )
}

// =============================================================================
// Public export
// =============================================================================

const LEGACY_ELEMENT_SYMBOL = Symbol.for('react.element')

interface ElementLike {
  type: unknown
  props: Record<string, unknown> | null
  key: string | null
}

function isReactElement(node: unknown): node is ElementLike {
  return (
    node != null &&
    typeof node === 'object' &&
    (node as { $$typeof?: unknown }).$$typeof != null
  )
}

function toLegacyElement(node: unknown): unknown {
  if (node == null || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return node
  if (Array.isArray(node)) return node.map(toLegacyElement)
  if (!isReactElement(node)) return node

  const { type, props, key } = node

  if (typeof type === 'function') {
    const rendered = (type as (p: Record<string, unknown>) => unknown)(props ?? {})
    return toLegacyElement(rendered)
  }

  const { children, ...rest } = props ?? {}
  const newChildren = toLegacyElement(children)
  return {
    $$typeof: LEGACY_ELEMENT_SYMBOL,
    type,
    key: key ?? null,
    ref: null,
    props: { ...rest, children: newChildren },
    _owner: null,
  }
}

export async function renderEvidencePDF(
  pkg: EvidencePackage,
  narrative: string
): Promise<Buffer> {
  const tree = toLegacyElement(<EvidenceDocument pkg={pkg} narrative={narrative} />)
  const buffer = await renderToBuffer(tree as React.ReactElement)
  return Buffer.from(buffer)
}
