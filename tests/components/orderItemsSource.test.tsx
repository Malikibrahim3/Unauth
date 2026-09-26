/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectedObjectDetail } from '@/components/relationships/ConnectedObjectDetail';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Order-Detail-Clean';
import type { ObjectSummary } from '@/lib/relationships/objectSummary';

jest.mock('@/components/layout/SetBreadcrumbLabel', () => ({ SetBreadcrumbLabel: () => null }));
jest.mock('@/components/navigation/AppNavLink', () => ({ __esModule: true, default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }));

const object: ObjectSummary = {
  id: 'order-1', type: 'order', reference: 'AS-88214', sourceId: null, provider: 'shopify', state: 'paid', updatedAt: null,
  amount: 2890, currency: 'GBP', sourceOrderId: null, customer: null, connected: [], facts: [], timeline: [], conversation: [], evidence: [], payoutCases: [], provenance: null,
  items: [{ id: 'line-1', title: 'Lumen Field Jacket, olive, M', sku: 'LF-JKT-OLV-M', quantity: 1, amount: 2890, currency: 'GBP', unitPriceMinor: 289000, state: 'shipped' }],
};
function row(container: HTMLElement) {
  return [...container.querySelectorAll('div')].find((node) => node.children.length === 6 && node.children[0].textContent === object.items[0].title)!;
}
function signature(node: Element) {
  return [node, ...node.children].map((entry) => [entry.tagName, entry.getAttribute('style'), entry === node ? null : entry.textContent]);
}

it('preserves the order-line values and the unchanged financial cells', () => {
  const source = render(<SuppliedVisualBody />);
  const expected = signature(row(source.container)).slice(2);
  source.unmount();
  const actual = render(<ConnectedObjectDetail object={object} />);
  expect(signature(row(actual.container)).slice(2)).toEqual(expected);
  expect(row(actual.container).children[0]).toHaveTextContent(object.items[0].title);
  expect(row(actual.container).children[0].querySelector('img')).toBeNull();
  expect(screen.getByText('UNIT')).toBeInTheDocument();
  expect(screen.getByText('STATUS')).toBeInTheDocument();
});

it('shows only an exact retained order-line image and removes it if the image fails', () => {
  const actual = render(<ConnectedObjectDetail object={{ ...object, items: [{ ...object.items[0], imageUrl: 'https://cdn.example.com/jacket.jpg' }] }} />);
  const image = row(actual.container).children[0].querySelector('img')!;
  expect(image).toHaveAttribute('src', 'https://cdn.example.com/jacket.jpg');
  expect(image).toHaveAttribute('alt', '');
  expect(image).toHaveAttribute('width', '44');
  fireEvent.error(image);
  expect(row(actual.container).children[0].querySelector('img')).toBeNull();
  expect(row(actual.container).children[0]).toHaveTextContent(object.items[0].title);
});

it('does not infer unit prices or shipment states when the source did not provide them', () => {
  const actual = render(<ConnectedObjectDetail object={{ ...object, items: [{ ...object.items[0], unitPriceMinor: null, state: null }] }} />);
  const cells = row(actual.container).children;
  expect(cells[3]).toHaveTextContent('—');
  expect(cells[5]).toHaveTextContent('Unavailable');
});
