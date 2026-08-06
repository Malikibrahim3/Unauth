/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  createP00BootstrapServerResponse,
  P00BootstrapPanel,
  P00RouteErrorBoundary,
  type P00SliceTelemetry,
} from '@/lib/p00/bootstrapSlice';

describe('P00 minimal vertical slice', () => {
  it('passes a server response through runtime decode, focus-safe UI, telemetry and DOM regression', async () => {
    const events: P00SliceTelemetry[] = [];
    const { container } = render(
      <P00RouteErrorBoundary track={(event) => events.push(event)}>
        <P00BootstrapPanel
          response={createP00BootstrapServerResponse()}
          track={(event) => events.push(event)}
        />
      </P00RouteErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'P00 technical slice' }).isConnected).toBe(true);
    expect(screen.getByLabelText('Slice status').textContent).toBe('Ready');
    await waitFor(() => expect(events).toEqual([
      {
        event: 'p00.slice.ready',
        contractVersion: 'p00-bootstrap.v1',
        traceId: 'p00-6f746f6c6f63',
      },
    ]));
    expect(container.innerHTML).toMatchInlineSnapshot(`"<section aria-labelledby=\"p00-slice-title\" data-contract=\"p00-bootstrap.v1\"><h1 id=\"p00-slice-title\">P00 technical slice</h1><p>Generated contract decoded successfully.</p><output aria-label=\"Slice status\">Ready</output></section>"`);
  });

  it('fails closed through the route boundary, moves focus and emits redacted telemetry', async () => {
    const events: P00SliceTelemetry[] = [];
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <P00RouteErrorBoundary track={(event) => events.push(event)}>
        <P00BootstrapPanel response={{ status: 'ready' }} track={(event) => events.push(event)} />
      </P00RouteErrorBoundary>,
    );

    const retry = await screen.findByRole('button', { name: 'Try again' });
    await waitFor(() => expect(document.activeElement).toBe(retry));
    expect(screen.getByRole('alert').textContent).toContain('did not match the registered contract');
    expect(events).toEqual([{
      event: 'p00.slice.contract_error',
      contractVersion: 'p00-bootstrap.v1',
    }]);
    expect(JSON.stringify(events)).not.toMatch(/amount|currency|customer|merchant|secret/i);
    consoleError.mockRestore();
  });
});
