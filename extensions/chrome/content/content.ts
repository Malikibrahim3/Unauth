const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const IGNORED_DOMAINS = new Set([
  'example.com',
  'email.com',
  'domain.com',
  'sentry.io',
  'wixpress.com',
]);

const BADGE_ID = 'unauth-floating-badge';

function isValidCustomerEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] ?? '';
  if (IGNORED_DOMAINS.has(domain)) return false;
  if (domain.endsWith('.png') || domain.endsWith('.jpg')) return false;
  if (lower.includes('noreply') || lower.includes('no-reply')) return false;
  return true;
}

function extractFromSelectors(): string | null {
  const selectors = [
    '[data-testid="ticket-customer-email"]',
    '.ticket-customer-email',
    '.gorgias-ticket-customer-email',
    '[data-gorgias-email]',
    '.zd-requestor-email',
    '.email[data-test-id="requester-email"]',
    '#requester_email',
    '.email-pill-value',
    '[data-customer-email]',
    '.customer-email',
    '.order-customer-email',
    'a[href^="mailto:"]',
    '.gD',
    '.go',
  ];

  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (const node of nodes) {
      const href = node.getAttribute('href');
      if (href?.startsWith('mailto:')) {
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim();
        if (isValidCustomerEmail(mail)) return mail;
      }
      const text = (node.textContent ?? '').trim();
      const match = text.match(EMAIL_RE);
      if (match?.[0] && isValidCustomerEmail(match[0])) return match[0];
    }
  }
  return null;
}

function extractBestEmail(): string | null {
  const prioritized = extractFromSelectors();
  if (prioritized) return prioritized;

  const bodyText = document.body?.innerText ?? '';
  const matches = bodyText.match(EMAIL_RE) ?? [];
  for (const candidate of matches) {
    if (isValidCustomerEmail(candidate)) return candidate;
  }
  return null;
}

function notifyEmail(email: string) {
  chrome.runtime.sendMessage({ type: 'EMAIL_DETECTED', email }).catch(() => {});
}

function removeBadge() {
  document.getElementById(BADGE_ID)?.remove();
}

function injectBadge(email: string) {
  if (document.getElementById(BADGE_ID)) return;

  chrome.storage.local.get('badgeDismissed', (data) => {
    if (data.badgeDismissed) return;

    const wrap = document.createElement('div');
    wrap.id = BADGE_ID;
    wrap.setAttribute('role', 'complementary');
    wrap.setAttribute('aria-label', 'Unauth customer check');

    Object.assign(wrap.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '2147483646',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: '#ffffff',
      color: '#18181b',
      border: '1px solid #e4e4e7',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      cursor: 'pointer',
      maxWidth: '220px',
    });

    const label = document.createElement('span');
    label.textContent = 'Check with Unauth ↗';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss');
    Object.assign(close.style, {
      border: 'none',
      background: 'transparent',
      color: '#71717a',
      cursor: 'pointer',
      fontSize: '16px',
      lineHeight: '1',
      padding: '0 2px',
    });

    close.addEventListener('click', (event) => {
      event.stopPropagation();
      removeBadge();
      chrome.runtime.sendMessage({ type: 'SET_BADGE_DISMISSED', dismissed: true });
    });

    wrap.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP', email });
    });

    wrap.append(label, close);
    document.documentElement.appendChild(wrap);
  });
}

let lastReported: string | null = null;

function scan() {
  const email = extractBestEmail();
  if (!email || email === lastReported) return;
  lastReported = email;
  notifyEmail(email);
  injectBadge(email);
}

const observer = new MutationObserver(() => {
  scan();
});

function start() {
  scan();
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
