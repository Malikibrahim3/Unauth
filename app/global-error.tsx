'use client';

import { Children, cloneElement, isValidElement, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import GlobalErrorVisual from '@/components/visual-authority/generated/Global-Error-Clean';
import { DesktopRequiredBoundary } from '@/components/system/DesktopRequiredBoundary';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  function bindReload(node: ReactNode): ReactNode {
    if (!isValidElement<{ children?: ReactNode }>(node)) return node;
    const children = Children.map(node.props.children, bindReload);
    const text = Children.toArray(node.props.children).filter((child) => typeof child === 'string').join('').trim();
    if (text === 'Reload') return cloneElement(node as ReactElement<Record<string, unknown>>, {
      role: 'button',
      tabIndex: 0,
      onClick: reset,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        reset();
      },
    }, children);
    return cloneElement(node, {}, children);
  }
  const visual = GlobalErrorVisual();
  const bound = bindReload(cloneElement(visual as ReactElement<Record<string, unknown>>, {
    'data-surface-id': 'root-global-error',
    'data-state-id': 'root-global-error',
  }));
  return <html lang="en">
    <head>
      <style>{`
        @font-face{font-family:'Inter';src:url('/fonts/inter-latin-variable.woff2') format('woff2');font-style:normal;font-weight:100 900;font-display:block}
        @font-face{font-family:'IBM Plex Mono';src:url('/fonts/ibm-plex-mono-latin-400.woff2') format('woff2');font-style:normal;font-weight:400;font-display:block}
        @font-face{font-family:'IBM Plex Mono';src:url('/fonts/ibm-plex-mono-latin-500.woff2') format('woff2');font-style:normal;font-weight:500;font-display:block}
        body{margin:0;background:#eae8e5;font-family:'Inter',system-ui,sans-serif;font-variant-numeric:tabular-nums;text-wrap:pretty;-webkit-font-smoothing:antialiased}
        a{color:#9b470d;text-decoration:none}a:hover{color:#8a3905}
      `}</style>
    </head>
    <body style={{ margin: 0 }}><DesktopRequiredBoundary>{bound}</DesktopRequiredBoundary></body>
  </html>;
}
