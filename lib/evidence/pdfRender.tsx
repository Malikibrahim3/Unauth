import React from 'react';
import type { EvidencePackage } from './types';
import EvidenceDocument from './pdfDocumentView';

const LEGACY_ELEMENT_SYMBOL = Symbol.for('react.element');

interface ElementLike {
  type: unknown;
  props: Record<string, unknown> | null;
  key: string | null;
}

function isReactElement(node: unknown): node is ElementLike {
  return (
    node != null &&
    typeof node === 'object' &&
    (node as { $$typeof?: unknown }).$$typeof != null
  );
}

function toLegacyElement(node: unknown): unknown {
  if (node == null || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return node;
  if (Array.isArray(node)) return node.map(toLegacyElement);
  if (!isReactElement(node)) return node;

  const { type, props, key } = node;

  if (typeof type === 'function') {
    const rendered = (type as (p: Record<string, unknown>) => unknown)(props ?? {});
    return toLegacyElement(rendered);
  }

  const { children, ...rest } = props ?? {};
  const newChildren = toLegacyElement(children);
  return {
    $$typeof: LEGACY_ELEMENT_SYMBOL,
    type,
    key: key ?? null,
    ref: null,
    props: { ...rest, children: newChildren },
    _owner: null,
  };
}

export async function renderEvidencePDF(
  pkg: EvidencePackage,
  narrative: string,
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const tree = toLegacyElement(<EvidenceDocument pkg={pkg} narrative={narrative} />);
  const buffer = await renderToBuffer(tree as React.ReactElement);
  return Buffer.from(buffer);
}
