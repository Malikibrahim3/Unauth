'use client';

import { useState } from 'react';
import styles from './product-thumbnail.module.css';

/** The adjacent item name supplies the accessible identity. */
export function ProductThumbnail({ src, size = 44 }: { src: string | null | undefined; size?: 44 | 48 }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;

  return <span className={styles.frame} style={{ width: size, height: size }}>
    {/* These are already tiny catalogue assets or an exact retained source URL. */}
    <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
  </span>;
}
