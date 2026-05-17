'use client';

import { useState } from 'react';
import { JsonHighlight } from './LandingAnimations';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

const TABS = ['cURL', 'Node.js', 'Python'] as const;
type Tab = typeof TABS[number];

const REQUESTS: Record<Tab, string> = {
  'cURL': `curl -X POST https://api.unauth.app/v1/score \\
  -H "Authorization: Bearer sk_live_••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORD-77241",
    "merchant_id": "mrc_murmuraudio"
  }'`,

  'Node.js': `import { Unauth } from '@unauth/node';

const unauth = new Unauth({
  apiKey: process.env.UNAUTH_SECRET_KEY,
});

const result = await unauth.score({
  orderId:    'ORD-77241',
  merchantId: 'mrc_murmuraudio',
});

console.log(result.riskScore); // 0.92`,

  'Python': `from unauth import Unauth
import os

client = Unauth(
  api_key=os.environ["UNAUTH_SECRET_KEY"]
)

result = client.score(
  order_id="ORD-77241",
  merchant_id="mrc_murmuraudio",
)

print(result.risk_score)  # 0.92`,
};

const RESPONSE = `{
  "order_id": "ORD-77241",
  "risk_score": 0.92,
  "cluster_id": "u_kessler.07",
  "confidence_grade": "DEFINITE",
  "signals_fired": [
    "refund_rate_over_60pct",
    "cross_merchant_inr_pattern",
    "shipping_address_variant",
    "denial_then_chargeback"
  ],
  "merchants_seen_at": 7,
  "evidence_packet_eligible": true
}`;

export function CodeTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('cURL');
  const [copied,    setCopied]    = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(REQUESTS[activeTab]).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      style={{
        background: '#EDE8DE',
        border: '1px solid #D8D0BD',
        borderRadius: '12px',
        boxShadow:
          '0 0 0 1px rgba(26,24,20,0.03),' +
          '0 4px 8px -2px rgba(26,24,20,0.05),' +
          '0 16px 40px -6px rgba(26,24,20,0.09)',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid #D8D0BD',
          background: '#F4F0E8',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...MONO,
              fontSize: '11px',
              letterSpacing: '0.06em',
              color: activeTab === tab ? '#1A1814' : '#8A8472',
              background: activeTab === tab ? '#EDE8DE' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab
                ? '2px solid #7B2D26'
                : '2px solid transparent',
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopy}
          style={{
            ...MONO,
            fontSize: '10px',
            letterSpacing: '0.09em',
            color: copied ? '#6B9E82' : '#8A8472',
            background: 'transparent',
            border: 'none',
            padding: '10px 16px',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            textTransform: 'uppercase',
          }}
        >
          {copied ? 'COPIED ✓' : 'COPY'}
        </button>
      </div>

      {/* Request block */}
      <div>
        <div
          style={{
            padding: '7px 16px',
            borderBottom: '1px solid rgba(216,208,189,0.45)',
            background: 'rgba(244,240,232,0.35)',
          }}
        >
          <span
            style={{
              ...MONO,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#8A8472',
            }}
          >
            REQUEST
          </span>
        </div>
        <pre
          style={{
            ...MONO,
            fontSize: '12px',
            lineHeight: 1.85,
            padding: '20px 24px',
            margin: 0,
            overflowX: 'auto',
            background: 'transparent',
            color: '#4A4640',
          }}
        >
          {REQUESTS[activeTab]}
        </pre>
      </div>

      {/* Response block */}
      <div style={{ borderTop: '1px solid #D8D0BD' }}>
        <div
          style={{
            padding: '7px 16px',
            borderBottom: '1px solid rgba(216,208,189,0.45)',
            background: 'rgba(244,240,232,0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              ...MONO,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#8A8472',
            }}
          >
            RESPONSE
          </span>
          <span style={{ ...MONO, fontSize: '10px', color: '#8A8472' }}>
            <span style={{ color: '#6B9E82', fontWeight: 600 }}>200</span> OK · 38ms
          </span>
        </div>
        <pre
          style={{
            ...MONO,
            fontSize: '12px',
            lineHeight: 1.85,
            padding: '20px 24px',
            margin: 0,
            overflowX: 'auto',
            background: 'transparent',
          }}
        >
          <JsonHighlight code={RESPONSE} />
        </pre>
      </div>
    </div>
  );
}
