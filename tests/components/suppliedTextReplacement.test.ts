import { consumeSuppliedText } from '@/components/visual-authority/bindSuppliedTree';

it('does not replace digits inside inserted runtime counts or money', () => {
  const queues = new Map([
    ['23 of 218 · £10,006.00 needs action', ['174 of 609 · £17,721,518.42 needs action']],
    ['6', ['174']],
    ['14', ['32']],
  ]);
  expect(consumeSuppliedText('23 of 218 · £10,006.00 needs action', queues)).toBe('174 of 609 · £17,721,518.42 needs action');
  expect(consumeSuppliedText('6', queues)).toBe('174');
  expect(consumeSuppliedText('14', queues)).toBe('32');
  expect(consumeSuppliedText('CASE-614', queues)).toBe('CASE-614');
});

it('consumes repeated source labels in order without touching surrounding text', () => {
  const queues = new Map([['Open', ['Waiting', 'Closed']]]);
  expect(consumeSuppliedText('Open record', queues)).toBe('Open record');
  expect(consumeSuppliedText('Open', queues)).toBe('Waiting');
  expect(consumeSuppliedText('Open', queues)).toBe('Closed');
  expect(consumeSuppliedText('Open', queues)).toBe('Open');
});
