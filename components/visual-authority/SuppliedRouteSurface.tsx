import { Children, createElement, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { bindSuppliedTree } from './bindSuppliedTree';

type SuppliedRoot = ReactElement<{ children?: ReactNode; 'data-screen-label'?: string; 'data-surface-id'?: string }>;

/** Adds route identity and registered legal-table semantics, preserving presentation. */
export default function SuppliedRouteSurface({
  source,
  surfaceId,
}: {
  source: () => ReactElement;
  surfaceId: string;
}) {
  const legalTableNames: Record<string, Record<string, string>> = {
    'privacy-policy': { 'Data Why Kept for': 'What is collected' },
    'data-handling-explainer': { 'Stage What happens Reversible': 'The chain a record travels' },
    'data-processing-addendum': { 'Category Examples Subjects': 'Personal data categories' },
  };
  const original = source();
  const supplied = (legalTableNames[surfaceId] ? bindSuppliedTree(original, {
    transform: (element, text, children) => {
      const tableName = Object.entries(legalTableNames[surfaceId] ?? {}).find(([header]) => text.startsWith(header))?.[1];
      if (!tableName || element.type !== 'div' || element.props.style?.margin !== '6px 0 20px') return undefined;
      return <div {...element.props} role="table" aria-label={tableName}>
        {Children.map(children, (row) => {
          if (!isValidElement<HTMLAttributes<HTMLDivElement>>(row) || row.type !== 'div') return row;
          const header = row.props.style?.padding === '9px 0';
          return <div {...row.props} role="row">{Children.map(row.props.children, (cell) => {
            if (!isValidElement<HTMLAttributes<HTMLSpanElement>>(cell) || cell.type !== 'span') return cell;
            return <span {...cell.props} role={header ? 'columnheader' : 'cell'} />;
          })}</div>;
        })}
      </div>;
    },
  }) : original) as SuppliedRoot;
  const label = supplied.props['data-screen-label']?.trim() || 'Unauth';
  return createElement('main', { ...supplied.props, 'data-reference-tag': 'div', 'data-surface-id': surfaceId },
    <h1 style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{label}</h1>,
    supplied.props.children,
  );
}
