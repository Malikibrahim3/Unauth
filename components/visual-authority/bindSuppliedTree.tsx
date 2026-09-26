import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from 'react';

export type SuppliedTreeElement = ReactElement<{
  children?: ReactNode;
  id?: string;
  href?: string;
  role?: string;
  style?: CSSProperties;
  'aria-busy'?: boolean | 'true' | 'false';
  'aria-level'?: number;
  'data-screen-label'?: string;
  'data-visual-source'?: string;
  'data-visual-world'?: string;
  'data-desktop-required'?: boolean | '';
  'data-reference-tag'?: string;
  'data-state-id'?: string;
}>; 

export function compactSuppliedText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children)
    .map(compactSuppliedText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Replace a source text node once; never reinterpret inserted runtime values. */
export function consumeSuppliedText(value: string, queues: Map<string, string[]>): string {
  return queues.get(value)?.shift() ?? value;
}

export function bindSuppliedTree(
  node: ReactNode,
  options: {
    text?: ReadonlyMap<string, ReactNode>;
    transform?: (
      element: SuppliedTreeElement,
      compactText: string,
      boundChildren: ReactNode,
    ) => ReactNode | undefined;
  },
): ReactNode {
  if (typeof node === 'string') return options.text?.get(node) ?? node;
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  const element = node as SuppliedTreeElement;
  const compactText = compactSuppliedText(element);
  const boundChildren = Children.map(element.props.children, (child) => bindSuppliedTree(child, options));
  const transformed = options.transform?.(element, compactText, boundChildren);
  return transformed === undefined ? cloneElement(element, {}, boundChildren) : transformed;
}
