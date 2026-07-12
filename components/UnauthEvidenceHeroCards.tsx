'use client';

import styles from './UnauthEvidenceHeroCards.module.css';

const tickets = [
  {
    initials: 'MC',
    avatar: 'avatarBlue',
    title: 'Item not received — package never arrived',
    meta: 'GOR-DEMO-INR-9001  ·  Order AU-DEMO-008842',
    desc: 'Customer says tracking shows delivered but nothing arrived. £84.20 at risk.',
    status: 'Open',
    time: '3m ago',
    dot: 'dotBlue',
  },
  {
    initials: 'AP',
    avatar: 'avatarGreen',
    title: 'Refund request — Duplicate charge',
    meta: '#12346  ·  Order #B5678',
    desc: 'Customer says they were charged twice for the same order.',
    status: 'Open',
    time: '12m ago',
    dot: 'dotBlue',
  },
  {
    initials: 'LM',
    avatar: 'avatarSlate',
    title: 'Refund request — Item not as described',
    meta: '#12347  ·  Order #C9101',
    desc: 'Customer says the item received does not match the product listing.',
    status: 'Pending',
    time: '27m ago',
    dot: 'dotYellow',
  },
  {
    initials: 'MR',
    avatar: 'avatarPink',
    title: 'Refund request — Missing items',
    meta: '#12348  ·  Order #D1121',
    desc: 'Customer says the parcel arrived, but one item was missing from the box.',
    status: 'Open',
    time: '45m ago',
    dot: 'dotBlue',
  },
  {
    initials: 'SK',
    avatar: 'avatarCyan',
    title: 'Refund request — Late delivery',
    meta: '#12349  ·  Order #E3141',
    desc: 'Customer says the order arrived after the expected delivery window.',
    status: 'Pending',
    time: '1h ago',
    dot: 'dotYellow',
  },
] as const;

const rows = [
  {
    icon: 'bag',
    signal: 'Refund claim',
    store: 'Order #A1234',
    network: 'Similar pattern at 12 merchants',
    value: '$129.99',
    ruleUse: 'Matched',
    date: '2d ago',
    color: 'purple',
  },
  {
    icon: 'card',
    signal: 'Chargeback',
    store: 'Order #B5678',
    network: 'Similar pattern at 8 merchants',
    value: '$249.99',
    ruleUse: 'Matched',
    date: '5d ago',
    color: 'green',
  },
  {
    icon: 'coin',
    signal: 'Refund claim',
    store: 'Order #C9101',
    network: 'Similar pattern at 7 merchants',
    value: '$189.00',
    ruleUse: 'Matched',
    date: '1w ago',
    color: 'yellow',
  },
  {
    icon: 'grid',
    signal: 'Chargeback',
    store: 'Order #D1121',
    network: 'Similar pattern at 15 merchants',
    value: '$129.50',
    ruleUse: 'Matched',
    date: '1w ago',
    color: 'blue',
  },
  {
    icon: 'rule',
    signal: 'Rule fired',
    store: 'Serial claim review',
    network: 'Merchant-defined logic',
    value: 'Manual Review',
    ruleUse: 'Active',
    date: 'Now',
    color: 'pink',
  },
] as const;

function rowIconGlyph(icon: string) {
  if (icon === 'bag') return '▣';
  if (icon === 'card') return '▤';
  if (icon === 'coin') return '◉';
  if (icon === 'grid') return '▦';
  if (icon === 'rule') return '◎';
  return '◆';
}

export default function UnauthEvidenceHeroCards() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.stage}>
        <aside className={`${styles.ticketCard} ${styles.card}`}>
          <div className={styles.ticketHead}>
            <div className={styles.spark}>✣</div>
            <strong>Claims</strong>
            <span>#refunds</span>
          </div>
          <div className={styles.ticketList}>
            {tickets.map((ticket) => (
              <div className={styles.ticket} key={ticket.meta}>
                <div className={styles[ticket.avatar]}>{ticket.initials}</div>
                <div className={styles.ticketBody}>
                  <h3>{ticket.title}</h3>
                  <p className={styles.meta}>{ticket.meta}</p>
                  <p className={styles.desc}>{ticket.desc}</p>
                  <p className={styles.status}>
                    <span className={`${styles.statusDot} ${styles[ticket.dot]}`} />
                    <b>{ticket.status}</b>
                    <span>·</span>
                    <span>{ticket.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className={`${styles.profileCard} ${styles.card}`}>
          <div className={styles.profileTop}>
            <div>
              <span className={styles.caseId}>UNAUTH-8873</span>
              <span className={styles.certaintyBadge}>Merchant rule matched</span>
            </div>
            <div className={styles.count}>
              <span>01 / 15</span>
              <span>⌃</span>
              <span>⌄</span>
            </div>
          </div>
          <div className={styles.profileInner}>
            <header className={styles.profileHeader}>
              <h1>Evidence &amp; Rule Overview</h1>
              <p>
                Claim history, identity context, and the merchant rule that produced this
                recommendation.
              </p>
            </header>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryPanel}>
                <h2>Your Store</h2>
                <div className={styles.stats}>
                  <div>
                    <p>Refund claims</p>
                    <strong>23</strong>
                  </div>
                  <div>
                    <p>Chargebacks</p>
                    <strong>11</strong>
                  </div>
                  <div>
                    <p>Total refunded</p>
                    <strong>$2,318.40</strong>
                  </div>
                </div>
                <div className={styles.firstSeen}>
                  <span>First seen</span>
                  <b>Feb 14, 2024</b>
                </div>
              </div>
              <div className={styles.summaryPanel}>
                <h2>Network Context</h2>
                <div className={styles.stats}>
                  <div>
                    <p>Refund claims</p>
                    <strong>87</strong>
                  </div>
                  <div>
                    <p>Chargebacks</p>
                    <strong>42</strong>
                  </div>
                  <div>
                    <p>Total refunded</p>
                    <strong>$8,742.18</strong>
                  </div>
                </div>
                <div className={styles.firstSeen}>
                  <span>First seen</span>
                  <b>Jan 03, 2023</b>
                </div>
              </div>
            </div>

            <section className={styles.activity}>
              <div className={styles.activityTitle}>
                <h2>Evidence Summary</h2>
                <p>Signals used by your configured rules for this claim review.</p>
              </div>
              <div className={styles.activityGrid}>
                <Metric
                  icon="▢"
                  tone="blueTone"
                  label="Claim rate"
                  sub="(claims / orders)"
                  left="9.2%"
                  leftLabel="Your store"
                  right="11.6%"
                  rightLabel="network pattern"
                />
                <Metric
                  icon="▣"
                  tone="orangeTone"
                  label="Chargeback rate"
                  sub="(chargebacks / orders)"
                  left="4.4%"
                  leftLabel="Your store"
                  right="6.3%"
                  rightLabel="network pattern"
                />
                <Metric
                  icon="⌁"
                  tone="greenTone"
                  label="Total orders"
                  left="249"
                  leftLabel="Your store"
                  right="750+"
                  rightLabel="network orders"
                />
                <Metric
                  icon="◎"
                  tone="orangeTone"
                  label="Rule result"
                  left="Manual Review"
                  leftLabel="Your store"
                  right="—"
                  rightLabel="Based on merchant rules"
                />
              </div>
            </section>

            <section className={styles.recent}>
              <div className={styles.recentHead}>
                <h2>Matched Evidence</h2>
                <a>View all activity →</a>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>At Your Store</th>
                    <th>Network Context</th>
                    <th>Value</th>
                    <th>Rule Use</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.signal}-${row.store}`}>
                      <td>
                        <span className={`${styles.rowIcon} ${styles[row.color]}`}>
                          {rowIconGlyph(row.icon)}
                        </span>
                        {row.signal}
                      </td>
                      <td>{row.store}</td>
                      <td>{row.network}</td>
                      <td>{row.value}</td>
                      <td>
                        <span className={styles.outcome}>{row.ruleUse}</span>
                      </td>
                      <td>{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.meta}>
                Recommendation shown from your configured rules. No action is taken automatically.
              </p>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon,
  tone,
  label,
  sub,
  left,
  leftLabel,
  right,
  rightLabel,
}: {
  icon: string;
  tone: 'blueTone' | 'orangeTone' | 'greenTone';
  label: string;
  sub?: string;
  left: string;
  leftLabel: string;
  right: string;
  rightLabel: string;
}) {
  return (
    <div className={styles.metric}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>
      <div className={styles.metricLabel}>
        <strong>{label}</strong>
        {sub && <span>{sub}</span>}
      </div>
      <div className={styles.metricValue}>
        <strong>{left}</strong>
        <span>{leftLabel}</span>
      </div>
      <div className={styles.metricValue}>
        <strong>{right}</strong>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
