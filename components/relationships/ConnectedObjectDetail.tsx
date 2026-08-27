import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ExternalLink, MoveRight } from 'lucide-react';
import type { ObjectFact, ObjectLink, ObjectSummary } from '@/lib/relationships/objectSummary';
import { AuditTimeline } from '@/components/ui/AuditTimeline';
import { Provenance } from '@/components/ui/Provenance';
import { Surface } from '@/components/ui/Surface';
import { UnavailableValue } from '@/components/ui/ProductValue';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailPageShell } from '@/components/workbench/DetailPageShell';
import { EvidenceSpine, type EvidenceThreadItem } from '@/components/ui/EvidenceThread';
import { formatCurrencyNullable, formatDateTime, formatNumber } from '@/lib/utils/format';
import { objectDisplayRef } from '@/lib/ui/displayRef';

function human(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
function titleFor(object: ObjectSummary) { return objectDisplayRef(object.type, object.reference, object.id); }
function surfaceId(object: ObjectSummary) { return `${object.type === 'ticket' ? 'support-ticket' : object.type}-detail`; }

// F-34: every node in the relationship map shares one geometry (padding +
// minimum height) regardless of column — only the current node is visually
// emphasised, and it is emphasised with the shared selection axis (§14.3)
// rather than an ad hoc highlight colour.
const RELATIONSHIP_NODE_STYLE: CSSProperties = { padding: '10px 12px', minHeight: 56 };
const RELATIONSHIP_NODE_SOURCE_STYLE: CSSProperties = { ...RELATIONSHIP_NODE_STYLE, borderTopColor: 'var(--uo-route-border-default)' };
const RELATIONSHIP_NODE_CURRENT_STYLE: CSSProperties = {
  ...RELATIONSHIP_NODE_STYLE,
  background: 'var(--uo-route-selection-fill)',
  borderColor: 'var(--uo-route-selection-border)',
  boxShadow: 'inset 2px 0 0 var(--uo-route-selection-border)',
};

// F-14: "paid" is a payment fact observed from the connected source, not a
// recovery outcome. StatusBadge defaults "paid" to outcome/recovered (green)
// because the same string also means a completed recovery elsewhere in the
// product; a connected-object page is never resolving a recovery, so it must
// pass the explicit source/observed override StatusBadge.tsx documents for
// this exact ambiguity, disambiguating by family (this surface), not value.
function connectedObjectStateBadgeProps(state: string | null | undefined) {
  return state === 'paid' ? ({ axis: 'source', tone: 'observed' } as const) : {};
}

const INTERNAL_RETURN_BASE = 'https://unauth.internal';
const FORBIDDEN_CONNECTED_INDEXES = new Set(['/orders', '/shipments', '/tickets', '/refunds', '/returns', '/disputes']);
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function safeInternalReturn(raw?: string): string | null {
  if (!raw || raw !== raw.trim() || !raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.includes('\\') || CONTROL_CHARACTER.test(raw)) return null;
  try {
    const parsed = new URL(raw, INTERNAL_RETURN_BASE);
    if (parsed.origin !== INTERNAL_RETURN_BASE) return null;
    const decodedPathname = decodeURIComponent(parsed.pathname);
    if (decodedPathname.includes('\\') || decodedPathname.startsWith('//') || CONTROL_CHARACTER.test(decodedPathname)) return null;
    const normalizedPathname = decodedPathname.length > 1 ? decodedPathname.replace(/\/+$/, '') : decodedPathname;
    if (FORBIDDEN_CONNECTED_INDEXES.has(normalizedPathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function objectLinkIdentity(link: ObjectLink): string {
  return link.role ? `${link.type}:${link.id}:${link.role}` : `${link.type}:${link.id}`;
}

export function uniqueObjectLinks(links: ObjectLink[]): ObjectLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const identity = objectLinkIdentity(link);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export type ConnectedObjectBackLink = { href: string; label: string };

function requestedReturnLabel(href: string): string {
  const segment = new URL(href, INTERNAL_RETURN_BASE).pathname.split('/').filter(Boolean)[0];
  if (segment === 'work') return 'Back to work';
  if (segment === 'cases') return 'Back to cases';
  if (segment === 'customers') return 'Back to customers';
  if (segment === 'financials') return 'Back to financials';
  if (segment === 'sources') return 'Back to sources';
  if (segment === 'search') return 'Back to search';
  return 'Back to previous view';
}

export function resolveConnectedObjectBackLink(object: ObjectSummary, requestedReturn?: string): ConnectedObjectBackLink {
  const safeReturn = safeInternalReturn(requestedReturn);
  if (safeReturn) return { href: safeReturn, label: requestedReturnLabel(safeReturn) };
  if (object.customer) return { href: object.customer.href, label: 'Back to customer' };
  return { href: `/search?q=${encodeURIComponent(object.reference)}`, label: 'Search workspace' };
}

function FactValue({ fact }: { fact: ObjectFact }) {
  if (fact.value == null) return <UnavailableValue reason={`${fact.label} was not supplied by the source`} />;
  if (fact.kind === 'money') return typeof fact.value === 'number' ? formatCurrencyNullable(fact.value, fact.currency) : <UnavailableValue reason="Invalid source amount" />;
  if (fact.kind === 'date') return typeof fact.value === 'string' ? formatDateTime(fact.value) : <UnavailableValue reason="Invalid source timestamp" />;
  if (fact.kind === 'boolean') return fact.value ? 'Yes' : 'No';
  if (fact.kind === 'number') return typeof fact.value === 'number' ? formatNumber(fact.value) : <UnavailableValue reason="Invalid numeric value" />;
  return String(fact.value).replaceAll('_', ' ');
}

function ConnectedRelationshipMap({
  object,
  source,
  links,
}: {
  object: ObjectSummary;
  source: string;
  links: ObjectLink[];
}) {
  const visibleLinks = links.slice(0, 4);
  const hiddenCount = Math.max(0, links.length - visibleLinks.length);

  return (
    <Surface
      structure="working"
      as="section"
      className="ua-connected-map"
      aria-labelledby="connected-map-title"
    >
      <header className="ua-working-surface__header">
        <div>
          <h2 id="connected-map-title" className="ua-text-working-title">Record relationship</h2>
          <p className="ua-text-caption-role">Source identity, this record, and canonical links remain separately addressable</p>
        </div>
        <span className="ua-text-metadata">{formatNumber(links.length)} linked</span>
      </header>
      <div className="ua-connected-map__plot" role="list" aria-label="Connected record relationships">
        <span className="ua-connected-map__node" data-node="source" role="listitem" style={RELATIONSHIP_NODE_SOURCE_STYLE}>
          <small>Source</small>
          <strong>{human(source)}</strong>
        </span>
        <MoveRight className="ua-connected-map__connector" size={16} aria-hidden="true" />
        <span className="ua-connected-map__node" data-node="current" role="listitem" style={RELATIONSHIP_NODE_CURRENT_STYLE}>
          <small>{human(object.type)}</small>
          <strong>{titleFor(object)}</strong>
        </span>
        {visibleLinks.length ? <span className="ua-connected-map__connector" data-kind="relationship" aria-hidden="true" /> : null}
        <span className="ua-connected-map__links" role="listitem">
          {visibleLinks.map((linked) => (
            <Link href={linked.href} key={objectLinkIdentity(linked)} className="ua-connected-map__node" data-node="linked" style={RELATIONSHIP_NODE_STYLE}>
              <small>{linked.role ? human(linked.role) : human(linked.type)}</small>
              <strong>{objectDisplayRef(linked.type, linked.reference, linked.id)}</strong>
            </Link>
          ))}
          {hiddenCount ? <small className="ua-connected-map__more">+{formatNumber(hiddenCount)} more in Connected records</small> : null}
          {!visibleLinks.length ? <span className="ua-connected-map__open">No canonical links recorded</span> : null}
        </span>
      </div>
    </Surface>
  );
}

export function buildOrderEvidenceSpine(object: ObjectSummary): EvidenceThreadItem[] {
  if (object.type !== 'order') return [];
  const source = object.provenance?.sourceSystem ?? object.provider ?? 'Connected source';
  const updated = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const freshness = object.provenance?.freshness === 'stale' ? 'stale' : 'known';
  return [
    {
      key: `source-${object.id}`,
      authority: 'source',
      label: 'Source order',
      value: titleFor(object),
      meta: `${human(source)} · ${updated ? formatDateTime(updated) : 'Freshness unavailable'}`,
      state: freshness,
    },
    ...object.connected
      .filter((linked) => linked.type === 'shipment' || linked.type === 'fulfilment')
      .map((linked) => ({
        key: `fulfilment-${linked.type}-${linked.id}`,
        authority: 'fact' as const,
        label: linked.type === 'shipment' ? 'Fulfilment and delivery' : 'Fulfilment',
        value: objectDisplayRef(linked.type, linked.reference, linked.id),
        meta: linked.state ? human(linked.state) : 'State unavailable',
        href: linked.href,
        state: 'recorded' as const,
      })),
    ...object.evidence.map((entry) => ({
      key: `evidence-${entry.id}`,
      authority: 'fact' as const,
      label: entry.title,
      value: entry.summary,
      meta: `${human(entry.provider)} · ${entry.occurredAt ? formatDateTime(entry.occurredAt) : 'Time unavailable'} · ${human(entry.confidence)}`,
      state: 'recorded' as const,
    })),
    ...object.payoutCases.map((linked) => ({
      key: `case-${linked.id}`,
      authority: 'fact' as const,
      label: 'Linked case',
      value: objectDisplayRef(linked.type, linked.reference, linked.id),
      meta: linked.state ? `Workflow state: ${human(linked.state)}` : 'Workflow state unavailable',
      href: linked.href,
      state: 'recorded' as const,
    })),
    ...object.connected
      .filter((linked) => linked.type === 'recovery')
      .map((linked) => ({
        key: `recovery-${linked.id}`,
        authority: 'external-action' as const,
        label: 'Linked recovery',
        value: objectDisplayRef(linked.type, linked.reference, linked.id),
        meta: linked.state ? human(linked.state) : 'Recovery state unavailable',
        href: linked.href,
        state: 'recorded' as const,
      })),
  ];
}

export function ConnectedObjectDetail({ object, returnTo }: { object: ObjectSummary; returnTo?: string }) {
  const source = object.provenance?.sourceSystem ?? object.provider ?? 'Connected source';
  const updated = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const freshness = object.provenance?.freshness === 'current' ? 'current' : object.provenance?.freshness === 'stale' ? 'stale' : 'unknown';
  const timeline = object.timeline.map((item, index) => ({ id: `${item.label}-${item.at ?? index}`, label: item.label, source, timestamp: item.at ? formatDateTime(item.at) : 'Time unavailable', detail: item.detail ? human(item.detail) : undefined }));
  const primaryConnected = object.payoutCases[0] ?? object.customer ?? object.connected[0] ?? null;
  const evidenceSpine = buildOrderEvidenceSpine(object);
  const backLink = resolveConnectedObjectBackLink(object, returnTo);
  const connectedLinks = uniqueObjectLinks([...(object.customer ? [object.customer] : []), ...object.connected, ...object.payoutCases]);

  return (
    <DetailPageShell
      backHref={backLink.href}
      backLabel={backLink.label}
      title={titleFor(object)}
      subtitle="Source-backed identity, financial context, relationships, and history."
      statusBadge={<StatusBadge family="workflowStatus" value={object.state ?? 'unknown'} {...connectedObjectStateBadgeProps(object.state)} />}
      meta={[{ value: <Provenance source={human(source)} freshness={freshness} updatedAt={updated ? formatDateTime(updated) : undefined} /> }]}
      actions={<>{primaryConnected ? <Link className="ua-button ua-button--primary ua-button--sm" href={primaryConnected.href}>Open {human(primaryConnected.type)}</Link> : null}{object.provenance?.sourceUrl ? <a className="ua-button ua-button--secondary ua-button--sm" href={object.provenance.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} aria-hidden="true" /></a> : null}</>}
    >
      <div className="ua-detail-layout" data-surface-id={surfaceId(object)} data-archetype="P7">
        <ConnectedRelationshipMap object={object} source={source} links={connectedLinks} />
        <div className="ua-detail-main">
          <Surface structure="working" as="section" aria-labelledby="record-facts">
            <header className="ua-working-surface__header"><div><h2 id="record-facts" className="ua-text-working-title">Record facts</h2><p className="ua-text-caption-role">Values exactly as available from the connected record</p></div></header>
            <dl className="ua-detail-facts">
              {object.amount != null ? <div><dt>Amount</dt><dd>{formatCurrencyNullable(object.amount, object.currency)}</dd></div> : null}
              {object.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd><FactValue fact={fact} /></dd></div>)}
              {object.facts.length === 0 && object.amount == null ? <div><dt>Source facts</dt><dd><UnavailableValue reason="No source facts were returned" /></dd></div> : null}
            </dl>
          </Surface>

          {object.type === 'ticket' ? (
            <Surface structure="working" as="section" aria-labelledby="record-conversation">
              <header className="ua-working-surface__header"><div><h2 id="record-conversation" className="ua-text-working-title">Conversation</h2><p className="ua-text-caption-role">Messages and source activity in recorded order</p></div><span className="ua-text-metadata">{formatNumber(object.conversation.length)} entries</span></header>
              {object.conversation.length ? <ol className="ua-conversation-thread">{object.conversation.map((entry) => <li key={entry.id}><div><strong>{entry.actor ?? human(entry.kind)}</strong><span>{entry.visibility ? human(entry.visibility) : 'Visibility unavailable'} · {entry.at ? formatDateTime(entry.at) : 'Time unavailable'}</span></div><p>{entry.summary ?? entry.title}</p></li>)}</ol> : <div className="ua-operational-state" data-state-id="ticket-conversation-unavailable"><p className="ua-operational-state__title">Conversation unavailable</p><p className="ua-operational-state__description">The connected helpdesk did not return message content for this ticket.</p></div>}
            </Surface>
          ) : null}

          {['order', 'refund', 'return', 'shipment'].includes(object.type) ? <Surface structure="working" as="section" aria-labelledby="record-items">
            <header className="ua-working-surface__header"><div><h2 id="record-items" className="ua-text-working-title">Items</h2><p className="ua-text-caption-role">Line-level source records</p></div><span className="ua-text-metadata">{formatNumber(object.items.length)} items</span></header>
            {object.items.length ? <ul className="ua-detail-list">{object.items.map((item) => <li key={item.id}><span><strong>{item.title}</strong><small>{item.sku ? `SKU ${item.sku}` : 'SKU unavailable'} · {item.quantity == null ? 'Quantity unavailable' : `Quantity ${formatNumber(item.quantity)}`}</small></span><span>{item.amount == null ? <UnavailableValue reason="No item amount" /> : formatCurrencyNullable(item.amount, item.currency)}</span></li>)}</ul> : <div className="ua-operational-state" data-state-id={`${object.type}-items-unavailable`}><p className="ua-operational-state__title">No item records</p><p className="ua-operational-state__description">The connected source did not provide line-level records.</p></div>}
          </Surface> : null}

          {object.evidence.length ? <Surface structure="working" as="section" aria-labelledby="record-evidence"><header className="ua-working-surface__header"><div><h2 id="record-evidence" className="ua-text-working-title">Source evidence</h2><p className="ua-text-caption-role">Connected observations, not merchant decisions</p></div></header><ul className="ua-detail-list">{object.evidence.map((entry) => <li key={entry.id}><span><strong>{entry.title}</strong><small>{human(entry.type)} · {human(entry.provider)} · {entry.occurredAt ? formatDateTime(entry.occurredAt) : 'Time unavailable'}</small></span><span className="ua-text-caption-role">{human(entry.confidence)}</span></li>)}</ul></Surface> : null}

          {object.type === 'order' ? (
            <Surface structure="working" as="section" aria-labelledby="order-evidence-spine">
              <header className="ua-working-surface__header"><div><h2 id="order-evidence-spine" className="ua-text-working-title">Evidence spine</h2><p className="ua-text-caption-role">Source order, fulfilment proof, linked case, and recovery remain distinct and traceable</p></div></header>
              <div className="ua-working-surface__body--padded">
                <EvidenceSpine
                  label="Order evidence and decision sequence"
                  items={evidenceSpine.length > 1 ? evidenceSpine : [...evidenceSpine, {
                    key: 'order-evidence-unavailable',
                    authority: 'fact',
                    label: 'Connected evidence',
                    value: 'No linked fulfilment proof, case, or recovery was returned for this record.',
                    state: 'missing',
                  }]}
                />
              </div>
            </Surface>
          ) : null}

          <Surface structure="working" as="section" aria-labelledby="record-history">
            <header className="ua-working-surface__header"><div><h2 id="record-history" className="ua-text-working-title">History</h2><p className="ua-text-caption-role">Source lifecycle events in recorded order</p></div></header>
            <div className="ua-working-surface__body--padded"><AuditTimeline items={timeline} empty={<UnavailableValue reason="No lifecycle events were returned" />} /></div>
          </Surface>
        </div>

        <aside className="ua-detail-rail" aria-label="Connected context">
          <Surface structure="working" as="section">
            <header className="ua-working-surface__header"><h2 className="ua-text-working-title">Connected records</h2></header>
            {connectedLinks.length ? <ul className="ua-connected-list">
              {connectedLinks.map((linked) => <li key={objectLinkIdentity(linked)}><Link href={linked.href}><span><small>{linked.role ? human(linked.role) : human(linked.type)}</small><strong>{objectDisplayRef(linked.type, linked.reference, linked.id)}</strong></span><MoveRight size={14} aria-hidden="true" /></Link></li>)}
            </ul> : <div className="ua-operational-state"><p className="ua-operational-state__description">No connected records are available.</p></div>}
          </Surface>
        </aside>
      </div>
    </DetailPageShell>
  );
}
