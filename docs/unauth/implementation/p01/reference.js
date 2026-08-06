const params = new URLSearchParams(window.location.search);
const surfaceId = params.get('surface') || 'hero_overview';
const state = params.get('state') || 'normal';
const mode = params.get('mode') || 'viewport';
document.documentElement.dataset.mode = mode;

const fixture = await fetch('/docs/unauth/implementation/p00/reference-fixture.normal.json').then((response) => {
  if (!response.ok) throw new Error('Frozen P00 fixture unavailable');
  return response.json();
});
const supplement = await fetch('/docs/unauth/implementation/p01/display-supplement.json').then((response) => {
  if (!response.ok) throw new Error('P01 v1.2 display supplement unavailable');
  return response.json();
});
const deferred = Object.fromEntries(supplement.p12_owned_structures.map((record) => [record.id, record]));
const surfaceFixture = fixture.surfaces.find((surface) => surface.surface_id === surfaceId);
if (!surfaceFixture) throw new Error(`Unknown surface ${surfaceId}`);
const records = Object.fromEntries(surfaceFixture.normal.map((record) => [record.id, record]));
const alt = state === 'normal' ? null : surfaceFixture.alternate_states.find((entry) => entry.state === state);
if (state !== 'normal' && !alt) throw new Error(`Unknown state ${state}`);

const titles = {
  hero_overview: ['Overview', 'Payout position, ledger outcome and the next exception requiring action.'],
  cases_workbench: ['Case CASE-24017', 'Evidence, recommendation and merchant authority remain visibly separate.'],
  recovery_portfolio: ['Recovery', 'Track approved amounts through ledger-confirmed receipt without implying a funnel.'],
  reconciliation_command_centre: ['Reconciliation', 'Resolve source-to-ledger differences without hiding opposing exceptions.'],
  rule_impact_proof: ['Rule impact', 'Compare live and draft recommendations without predicting merchant decisions.'],
};
const navBySurface = {
  hero_overview: 'Overview', cases_workbench: 'Cases', recovery_portfolio: 'Financials',
  reconciliation_command_centre: 'Financials', rule_impact_proof: 'Controls',
};

function nav() {
  return ['Overview', 'Work', 'Cases', 'Financials', 'Customers', 'Controls', 'Sources'].map((label) =>
    `<div class="nav-item ${navBySurface[surfaceId] === label ? 'current' : ''}"><i class="nav-icon" aria-hidden="true"></i><span>${label}</span></div>`
  ).join('');
}

function stateNotice() {
  if (!alt) return '';
  const symbol = state === 'error' ? '!' : state === 'permission' ? '×' : state === 'stale' ? '◷' : 'i';
  return `<div class="state-notice" role="status"><span class="state-symbol">${symbol}</span><span><strong>${alt.display}</strong> · ${alt.qualifier}</span><span class="meta">${alt.permission_label}</span></div>`;
}

function shell(content, action) {
  const [title, context] = titles[surfaceId];
  return `<div class="app state-${state}">
    <aside class="sidebar"><div class="brand"><i class="brand-mark" aria-hidden="true"></i><span>Unauth</span></div><nav class="nav" aria-label="Primary">${nav()}</nav><div class="sidebar-foot">Demo workspace<br>Europe/London · GBP</div></aside>
    <header class="utility"><div class="crumb"><span class="crumb-root">Unauth / </span><span class="crumb-title">${title}</span></div><div class="utility-actions"><div class="utility-chip">Search</div><div class="utility-chip"><i class="utility-dot"></i>Data health</div><div class="avatar">MI</div></div></header>
    <main class="main"><div class="page"><div class="page-head"><div><h1 class="page-title">${title}</h1><p class="page-context">${context}</p></div><button class="primary-action">${action}</button></div>${stateNotice()}${content}</div></main>
  </div>`;
}

function overview() {
  const exposure = records['overview.exposure'];
  const recovered = records['overview.recovered'];
  const modelled = records['overview.modelled'];
  const realised = records['overview.realised'];
  const net = records['overview.net_loss'];
  const estimated = records['overview.estimated'];
  const monthly = supplement.actual_money_over_time;
  const monthlyDescription = monthly.buckets.map((bucket) => `${bucket.label}: realised loss ${bucket.realised_loss}, recovered applied ${bucket.recovered_applied}, net loss ${bucket.net_loss}`).join('; ');
  return shell(`
    <section class="kpi-strip" aria-label="Overview key positions">
      <div class="kpi"><div class="kpi-label">Payout exposure</div><div class="kpi-value money">${exposure.display}</div><div class="kpi-note">Qualified actual · locked scope</div></div>
      <div class="kpi"><div class="kpi-label">Recovered</div><div class="kpi-value money">${recovered.display}</div><div class="kpi-note">Ledger-confirmed · position</div></div>
      <div class="kpi"><div class="kpi-label">Modelled avoided</div><div class="kpi-value money">${modelled.display}</div><div class="kpi-note">${modelled.bounds.lower_display}–${modelled.bounds.upper_display} · v1.0</div></div>
      <div class="kpi"><div class="kpi-label">Realised loss</div><div class="kpi-value money">${realised.display}</div><div class="kpi-note">Reconciled actual · period flow</div></div>
    </section>
    <div class="overview-grid">
      <section class="surface bridge-trend">
        <div class="bridge"><div class="chart-title-row"><div><h3>Net loss bridge</h3><p>How gross loss becomes net loss</p></div><span class="meta">GBP · locked period</span></div>
          <div class="bridge-plot" role="img" aria-label="Gross realised loss £164,800, recovered applied negative £118,400, net loss £46,400">
            <div class="bridge-col"><span class="bridge-amount money">£164,800</span><i class="bridge-bar gross"></i><span class="bridge-label">Gross loss</span></div>
            <div class="bridge-col"><span class="bridge-amount money">−£118,400</span><i class="bridge-bar recovery"></i><span class="bridge-label">Recovered applied</span></div>
            <div class="bridge-col"><span class="bridge-amount money">${net.display}</span><i class="bridge-bar net"></i><span class="bridge-label">Net loss</span></div>
          </div><div class="qualifier">Excess recovery £0.00 · reconciled actual · as-of ${fixture.as_of}</div>
        </div>
        <div class="trend"><div class="chart-title-row"><div><h3>Actual money over time</h3><p>Are realised losses closing with recovery?</p></div><span class="status ledger">Reconciled</span></div>
          <div class="line-chart" role="img" aria-label="${monthlyDescription}"><svg viewBox="0 0 520 160" preserveAspectRatio="none" aria-hidden="true"><polyline points="8,70 106,49 204,40 302,56 400,66 512,40" fill="none" stroke="#1d2939" stroke-width="3"/><polyline points="8,112 106,95 204,87 302,79 400,87 512,66" fill="none" stroke="#067647" stroke-width="3"/><polyline points="8,126 106,122 204,126 302,142 400,147 512,147" fill="none" stroke="#4338ca" stroke-width="3"/></svg></div><div class="axis-labels">${monthly.buckets.map((bucket) => `<span>${bucket.label}</span>`).join('')}</div><div class="legend"><span><i class="swatch actual"></i>Realised loss</span><span><i class="swatch recovered"></i>Recovered applied</span><span><i class="swatch" style="background:#4338ca"></i>Net loss</span></div><div class="sr-only">${monthly.buckets.map((bucket) => `<span>${bucket.label}: ${bucket.realised_loss}; ${bucket.recovered_applied}; ${bucket.net_loss}</span>`).join('')}</div>
        </div>
      </section>
      <div class="uncertainty-stack">
        <section class="surface range-panel"><div><div class="chart-title-row"><div><h3>Estimated realised loss</h3><p>Observed gap range</p></div><span class="status validation">Estimated</span></div><div class="range-value money">${estimated.display}</div><div class="range-track"><i class="range-band"></i><i class="range-point"></i></div></div><div class="qualifier">${estimated.bounds.lower_display}–${estimated.bounds.upper_display} · confidence 0.80 · gap-observation-v1</div></section>
        <section class="surface range-panel"><div><div class="chart-title-row"><div><h3>Modelled avoided exposure</h3><p>Counterfactual, never actual</p></div><span class="status">Modelled</span></div><div class="range-value money">${modelled.display}</div><div class="range-track"><i class="range-band modelled"></i><i class="range-point modelled"></i></div></div><div class="qualifier">${modelled.bounds.lower_display}–${modelled.bounds.upper_display} · no-control-v1 · version 1.0</div></section>
      </div>
      <section class="surface trust-queue">
        <div class="trust-strip" aria-label="Trust strip"><div class="trust-cell"><span class="trust-label">Coverage</span><strong class="trust-value">Locked scope</strong><span class="qualifier">P00 fixture</span></div><div class="trust-cell"><span class="trust-label">Freshness</span><strong class="trust-value">As-of locked</strong><span class="qualifier">${fixture.as_of}</span></div><div class="trust-cell"><span class="trust-label">Reconciliation</span><strong class="trust-value">Per measure</strong><span class="qualifier">No inferred closure</span></div><div class="trust-cell"><span class="trust-label">Decision-safe</span><strong class="trust-value">Explicit</strong><span class="qualifier">Actor scope</span></div></div>
        <div class="queue" aria-label="Needs attention"><div class="queue-row"><span class="queue-id">CASE-24017</span><span class="queue-reason">Carrier proof incomplete</span><span class="queue-action">Request carrier proof</span></div>${['REC-1042', 'RECON-882', 'SRC-09', 'RULE-DRAFT-17'].map((id) => `<div class="queue-row"><span class="queue-id">${id}</span><span class="queue-reason">Detail deferred to P12 shared data sheet</span><span class="queue-action">Unavailable</span></div>`).join('')}</div>
      </section>
    </div>`, 'Review attention');
}

function cases() {
  return shell(`<section class="workbench">
    <aside class="case-context"><div class="case-id">CASE-24017</div><span class="status attention">Needs evidence</span><div class="amount-display money">£18,400.00</div><div class="qualifier">Payout exposure · known atomic · GBP</div><div class="fact-list"><div class="fact"><div class="fact-label">Evidence status</div><div class="fact-value">Carrier proof incomplete</div></div><div class="fact"><div class="fact-label">Recommendation</div><div class="fact-value">Request evidence</div></div><div class="fact"><div class="fact-label">Merchant decision</div><div class="fact-value">No decision</div></div><div class="fact"><div class="fact-label">As of</div><div class="fact-value">${fixture.as_of}</div></div></div></aside>
    <div class="evidence-main"><div class="chart-title-row"><div><h3>Evidence spine</h3><p>Source facts → finding → recommendation → merchant decision</p></div><span class="meta">P00 fixture facts</span></div><div class="evidence-spine"><div class="evidence-node"><i class="node-mark done">✓</i><div><div class="node-title">Case identity</div><div class="node-copy">CASE-24017 is the selected work item.</div></div><div class="node-source">P00 fixture</div></div><div class="evidence-node"><i class="node-mark done">✓</i><div><div class="node-title">Payout exposure</div><div class="node-copy">Known atomic exposure is £18,400.00 GBP.</div></div><div class="node-source">P00 fixture</div></div><div class="evidence-node"><i class="node-mark missing">!</i><div><div class="node-title">Carrier proof</div><div class="node-copy">The evidence node is incomplete.</div></div><div class="node-source">Incomplete</div></div><div class="evidence-node"><i class="node-mark">→</i><div><div class="node-title">Safe next action</div><div class="node-copy">Request carrier proof; do not decide yet.</div></div><div class="node-source">P00 fixture</div></div></div></div>
    <aside class="case-decision"><div class="decision-zone recommend"><h3>Recommendation</h3><strong>Request evidence</strong><p>Evidence is insufficient for a merchant payout decision.</p></div><div class="decision-zone"><h3>Merchant decision</h3><strong>No decision</strong><p>Only an authorised merchant operator can decide. Recommendation never approves, denies or pays.</p></div><div class="safe-action"><div class="qualifier">Permitted action · audit receipt on send</div><button>Request carrier proof</button></div></aside>
  </section>`, 'Request carrier proof');
}

function recovery() {
  return shell(`<div class="analysis-table"><section class="surface recovery-analysis">
    <div class="analysis-cell"><div class="chart-title-row"><div><h3>Recovery position</h3><p>Where approved value stands now</p></div><span class="meta">GBP · position</span></div><div class="position-bars">
      <div class="position-row"><span class="position-label">Sought</span><i class="position-track"><i class="position-fill sought"></i></i><strong class="position-value money">£246,000</strong></div><div class="position-row"><span class="position-label">Approved</span><i class="position-track"><i class="position-fill approved"></i></i><strong class="position-value money">£190,000</strong></div><div class="position-row"><span class="position-label">Pending receipt</span><i class="position-track"><i class="position-fill pending"></i></i><strong class="position-value money">£71,600</strong></div><div class="position-row"><span class="position-label">Recovered</span><i class="position-track"><i class="position-fill recovered"></i></i><strong class="position-value money">£118,400</strong></div><div class="position-row"><span class="position-label">Outstanding</span><i class="position-track"><i class="position-fill outstanding"></i></i><strong class="position-value money">£71,600</strong></div>
    </div><div class="qualifier" style="margin-top:12px">Not a funnel · Outstanding is a residual · Approved is not received</div></div>
    <div class="analysis-cell"><div class="chart-title-row"><div><h3>Ledger-confirmed recovery</h3><p>How receipt accumulates over time</p></div><span class="status ledger">Recovered</span></div><div class="fixture-gap" role="status"><strong>${deferred['recovery.cumulative_recovered_v02'].display}</strong><span>${deferred['recovery.cumulative_recovered_v02'].qualifier}</span></div><div class="qualifier">No trend is inferred from a point-in-time aggregate.</div></div>
    <div class="analysis-cell"><div class="chart-title-row"><div><h3>Outstanding ageing</h3><p>Which approved amounts wait longest?</p></div><span class="meta">V07 · whole days</span></div><div class="fixture-gap" role="status"><strong>${deferred['recovery.outstanding_age_v07'].display}</strong><span>${deferred['recovery.outstanding_age_v07'].qualifier}</span></div><div class="qualifier">No amount or count is invented.</div></div>
  </section><section class="surface data-table portfolio-table"><div class="table-head"><span>Recovery</span><span>State / evidence</span><span>Qualified value</span><span>Owner</span><span>Next action</span></div><div class="table-gap"><strong>${deferred['recovery.portfolio_rows'].display}</strong><span>${deferred['recovery.portfolio_rows'].qualifier}</span></div></section></div>`, 'Review receipts');
}

function reconciliation() {
  return shell(`<section class="recon-workbench"><aside class="exception-queue"><div class="surface-head"><div><h2>Exceptions</h2><p>4 active · £1,750 gross</p></div></div><div class="fixture-gap compact" role="status"><strong>${deferred['reconciliation.exception_rows'].display}</strong><span>${deferred['reconciliation.exception_rows'].qualifier}</span></div></aside>
    <div class="recon-main"><div class="chart-title-row"><div><h3>Source to ledger bridge</h3><p>Why do identical scopes differ by £750?</p></div><span class="status attention">Open</span></div><div class="recon-bridge" role="img" aria-label="Source £1,284,500, documented adjustments negative £2,100, unresolved residual negative £750, ledger £1,281,650"><div class="recon-step"><strong class="recon-value money">£1,284,500</strong><i class="recon-bar source"></i><span class="recon-label">Source</span></div><div class="recon-step"><strong class="recon-value money">−£2,100</strong><i class="recon-bar adjust"></i><span class="recon-label">Documented adjustments</span></div><div class="recon-step"><strong class="recon-value money">−£750</strong><i class="recon-bar residual"></i><span class="recon-label">Unresolved residual</span></div><div class="recon-step"><strong class="recon-value money">£1,281,650</strong><i class="recon-bar ledger"></i><span class="recon-label">Ledger</span></div></div><div class="exception-metrics"><div class="exception-metric"><span>Positive</span><strong class="money">£1,250</strong></div><div class="exception-metric"><span>Negative</span><strong class="money">£500</strong></div><div class="exception-metric"><span>Gross</span><strong class="money">£1,750</strong></div><div class="exception-metric"><span>Net</span><strong class="money">£750</strong></div><div class="exception-metric"><span>Count</span><strong>4</strong></div></div><div class="qualifier" style="margin-top:10px">One active exception set · residual is server-authored and never an adjustment</div></div>
    <aside class="resolution-rail"><div><h3 class="section-title">Resolution boundary</h3><p class="section-copy">Compare exact records before selecting a resolution.</p></div><div class="compare-box"><strong style="font-size:11px">${deferred['reconciliation.candidate_comparison'].display}</strong><p>${deferred['reconciliation.candidate_comparison'].qualifier}. Confidence and resolution are not inferred.</p></div><div class="ageing-frame"><div class="chart-title-row"><div><h3>Unresolved ageing</h3><p>How long have active differences remained unresolved?</p></div><span class="meta">V07 · whole days</span></div><div class="fixture-gap compact" role="status"><strong>${deferred['reconciliation.unresolved_age_v07'].display}</strong><span>${deferred['reconciliation.unresolved_age_v07'].qualifier}</span></div></div><div class="resolution-options"><div class="option selected">Await exact records</div><div class="option">Escalate fixture gap</div></div><div class="close-proof">Period close blocked · difference and 4 active exceptions must be resolved or approved with proof.</div></aside>
  </section>`, 'Review resolution');
}

function rules() {
  return shell(`<div class="rule-layout"><section class="surface rule-definition"><div class="rule-identity"><strong style="font-size:13px">RULE-DRAFT-17</strong><div class="qualifier">Live v4 · Draft v5</div><span class="status attention" style="margin-top:8px">Draft review</span></div><div class="rule-clause"><span class="clause-label">When</span><div class="clause-value">A post-purchase case enters evidence review</div></div><div class="rule-clause"><span class="clause-label">If</span><div class="clause-value">Carrier proof is missing and payout exposure is known</div></div><div class="rule-clause"><span class="clause-label">Recommend</span><div class="clause-value">Request evidence before merchant decision</div></div><div class="rule-authority">The rule recommends; it never approves, denies or pays.</div></section>
    <div class="impact-panels"><section class="surface impact-panel"><div class="chart-title-row"><div><h3>Recommendation counts</h3><p>How does draft distribution differ?</p></div><div class="legend"><span><i class="swatch actual"></i>Live</span><span><i class="swatch" style="background:#4338ca"></i>Draft</span></div></div><div class="comparison-bars"><div class="comparison-row"><span class="comparison-name">Request evidence</span><div class="double-bar"><i class="bar-track"><i class="bar-live" style="display:block;width:89%"></i></i><i class="bar-track"><i class="bar-draft" style="display:block;width:60%"></i></i></div><span class="comparison-value">80 / 55</span></div><div class="comparison-row"><span class="comparison-name">Pursue recovery</span><div class="double-bar"><i class="bar-track"><i class="bar-live" style="display:block;width:76%"></i></i><i class="bar-track"><i class="bar-draft" style="display:block;width:100%"></i></i></div><span class="comparison-value">70 / 92</span></div><div class="comparison-row"><span class="comparison-name">Manual review</span><div class="double-bar"><i class="bar-track"><i class="bar-live" style="display:block;width:65%"></i></i><i class="bar-track"><i class="bar-draft" style="display:block;width:63%"></i></i></div><span class="comparison-value">60 / 58</span></div><div class="comparison-row"><span class="comparison-name">No action</span><div class="double-bar"><i class="bar-track"><i class="bar-live" style="display:block;width:43%"></i></i><i class="bar-track"><i class="bar-draft" style="display:block;width:49%"></i></i></div><span class="comparison-value">40 / 45</span></div></div><div class="qualifier" style="margin-top:12px">Both columns total 250 · identical fixture and snapshot</div></section>
      <section class="surface impact-panel"><div class="chart-title-row"><div><h3>Changed-case exposure</h3><p>Current reconciled actual by transition</p></div><span class="meta">GBP · £83,000 total</span></div><div class="comparison-bars"><div class="comparison-row"><span class="comparison-name">Evidence → Recovery</span><div class="bar-track"><i class="bar-draft" style="display:block;width:100%"></i></div><span class="comparison-value money">£48,200</span></div><div class="comparison-row"><span class="comparison-name">Manual → Recovery</span><div class="bar-track"><i class="bar-draft" style="display:block;width:41%"></i></div><span class="comparison-value money">£19,600</span></div><div class="comparison-row"><span class="comparison-name">Recovery → Manual</span><div class="bar-track"><i class="bar-draft" style="display:block;width:17%"></i></div><span class="comparison-value money">£8,400</span></div><div class="comparison-row"><span class="comparison-name">None → Evidence</span><div class="bar-track"><i class="bar-draft" style="display:block;width:14%"></i></div><span class="comparison-value money">£6,800</span></div></div><div class="qualifier" style="margin-top:12px">Current exposure, not predicted approval, payment or modelled benefit</div></section></div>
    <div class="rule-tables"><section class="surface data-table rule-table"><div class="table-head"><span>Affected case</span><span>Live → draft</span><span>Exposure</span></div><div class="table-gap"><strong>${deferred['rule.affected_case_rows'].display}</strong><span>${deferred['rule.affected_case_rows'].qualifier}</span></div></section><section class="surface data-table rule-table"><div class="table-head"><span>Fixture result</span><span>Live</span><span>Draft</span></div><div class="table-gap"><strong>${deferred['rule.fixture_result_rows'].display}</strong><span>${deferred['rule.fixture_result_rows'].qualifier}</span></div></section></div>
  </div>`, 'Review draft');
}

const renderers = { hero_overview: overview, cases_workbench: cases, recovery_portfolio: recovery, reconciliation_command_centre: reconciliation, rule_impact_proof: rules };
document.getElementById('reference-root').innerHTML = renderers[surfaceId]();
document.body.dataset.ready = 'true';
