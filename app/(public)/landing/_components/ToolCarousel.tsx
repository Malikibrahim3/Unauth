'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from '@/components/public/tool-carousel.module.css';

// Launch presentation only; not a runtime capability or provider registry.
// Original asset provenance: public/providers/WORDMARK_SOURCES.md.
const rows = [
  {
    label: 'Commerce',
    tools: [
      { name: 'Shopify', file: 'shopify-dark-wordmark.svg', width: 135, height: 39 },
      { name: 'WooCommerce', file: 'woo-wordmark.svg', width: 105, height: 29 },
      { name: 'BigCommerce', file: 'bigcommerce-wordmark.svg', width: 160, height: 40 },
      { name: 'Magento', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Magento_Logo.svg', width: 142, height: 48 },
      { name: 'Amazon', file: 'amazon-wordmark.svg', width: 127, height: 38 },
      { name: 'eBay', file: 'ebay-wordmark.svg', width: 104, height: 41 },
    ],
  },
  {
    label: 'Helpdesks',
    tools: [
      { name: 'Gorgias', file: 'gorgias-wordmark.svg', width: 139, height: 37 },
      { name: 'Zendesk', file: 'zendesk-wordmark.png', width: 112, height: 84 },
      { name: 'Freshdesk', file: 'freshdesk.png', width: 52, height: 52 },
      { name: 'Intercom', file: 'intercom-wordmark.svg', width: 157, height: 26 },
      { name: 'Help Scout', file: 'helpscout-wordmark.svg', width: 152, height: 30 },
    ],
  },
  {
    label: 'Carriers',
    tools: [
      { name: 'Royal Mail', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Royal_Mail_logo.svg', width: 142, height: 36 },
      { name: 'DHL', file: 'dhl-wordmark.svg', width: 137, height: 32 },
      { name: 'FedEx', file: 'fedex-wordmark.png', width: 155, height: 75 },
      { name: 'DPD', file: 'dpd-wordmark.png', width: 106, height: 50 },
      { name: 'UPS', file: 'ups.svg', width: 41, height: 49 },
      { name: 'Evri', file: 'evri-wordmark.svg', width: 103, height: 43 },
      { name: 'USPS', file: 'usps-wordmark.svg', width: 155, height: 38 },
    ],
  },
  {
    label: 'Fulfilment / 3PL',
    tools: [
      { name: 'ShipBob', file: 'shipbob-wordmark.svg', width: 150, height: 40 },
      { name: 'GXO Logistics', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/GXO_Logistics_logo.svg', width: 128, height: 45 },
      { name: 'Flexport', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flexport_logo.svg', width: 148, height: 35 },
      { name: 'DHL Supply Chain', file: 'dhl-wordmark.svg', width: 137, height: 32 },
      { name: 'CEVA Logistics', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/CEVA_Logistics_New_Logo.png', width: 148, height: 72 },
    ],
  },
];

// Interleave categories so the opening viewport shows the whole operational stack.
const tools = Array.from({ length: Math.max(...rows.map((row) => row.tools.length)) }, (_, index) =>
  rows.flatMap((row) => row.tools[index] ? [row.tools[index]] : []),
).flat();

export function ToolCarousel() {
  const section = useRef<HTMLElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const selected = rows.find((row) => row.label === category);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    setEnhanced(true);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <section
      ref={section}
      className={styles.toolRail}
      aria-labelledby="tool-rail-title"
      aria-describedby="tool-preview-note"
      data-enhanced={enhanced}
      data-category={Boolean(selected)}
      data-show-all={showAll}
      data-running={inView && pageVisible && !showAll && !selected}
      onMouseLeave={() => setCategory(null)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCategory(null); }}
      onKeyDown={(event) => { if (event.key === 'Escape') setCategory(null); }}
    >
      <div className={styles.toolRailInner}>
        <div className={styles.toolRows}>
          {selected && (
            <ul className={styles.toolCategoryMarks} aria-label={selected.label}>
              {selected.tools.map((tool) => (
                <li key={tool.name}>
                  <img src={'file' in tool ? `/providers/${tool.file}` : tool.src} alt={tool.name}
                    width={tool.width} height={tool.height} className={styles.toolMarkImage}
                    style={{ width: tool.width, height: tool.height }} />
                </li>
              ))}
            </ul>
          )}
            <div className={styles.toolRow}>
              <div className={styles.toolTrack} style={{ width: tools.length * 216 * 2 }}>
                {[false, true].map((duplicate) => (
                  <ul className={styles.toolMarks} style={{ width: tools.length * 216 }} key={String(duplicate)} aria-label={duplicate ? undefined : 'Commerce, helpdesks, carriers and fulfilment'} aria-hidden={duplicate || undefined} data-duplicate={duplicate}>
                    {tools.map((tool) => (
                      <li key={tool.name}>
                        {'file' in tool ? (
                          <Image
                            src={`/providers/${tool.file}`}
                            alt={duplicate ? '' : tool.name}
                            width={tool.width}
                            height={tool.height}
                            style={{ width: tool.width, height: tool.height }}
                            className={styles.toolMarkImage}
                            loading="eager"
                            unoptimized
                          />
                        ) : (
                          // These are direct, unmodified logo files from the company or its attributed Commons file.
                          <img
                            src={tool.src}
                            alt={duplicate ? '' : tool.name}
                            width={tool.width}
                            height={tool.height}
                            style={{ width: tool.width, height: tool.height }}
                            className={styles.toolMarkImage}
                            loading="eager"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
        </div>
        <div className={styles.toolRailHeading}>
          <div>
            <h2 id="tool-rail-title">Connect to your current tools</h2>
            <div className={styles.toolCategories} aria-label="Browse tools by category">
              {rows.map((row) => (
                <button key={row.label} type="button" aria-pressed={category === row.label}
                  onMouseEnter={() => { setShowAll(false); setCategory(row.label); }}
                  onFocus={() => { setShowAll(false); setCategory(row.label); }}
                  onClick={() => { setShowAll(false); setCategory(row.label); }}>
                  {row.label === 'Fulfilment / 3PL' ? '3PL' : row.label}
                </button>
              ))}
              {selected && <button type="button" onClick={() => setCategory(null)}>All tools</button>}
            </div>
            <p id="tool-preview-note"><strong>Pre-launch preview</strong> · Planned integration range. Not all connections are available yet.</p>
          </div>
          <button type="button" className={styles.toolMotionToggle} onClick={() => { setCategory(null); setShowAll((value) => !value); }}>
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              {showAll ? <path d="M3 1.5 10 6l-7 4.5z" /> : <path d="M2 1h3v10H2zM7 1h3v10H7z" />}
            </svg>
            {showAll ? 'Play carousel' : 'Pause and view all'}
          </button>
        </div>
      </div>
    </section>
  );
}
