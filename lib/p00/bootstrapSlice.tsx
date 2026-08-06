import React from 'react';
import {
  decodeP00BootstrapResponse,
  P00_BOOTSTRAP_CONTRACT_VERSION,
  type P00BootstrapResponse,
} from './generated/bootstrapContract';

export type P00SliceTelemetry = {
  event: 'p00.slice.ready' | 'p00.slice.contract_error';
  contractVersion: string;
  traceId?: string;
};

export function createP00BootstrapServerResponse(): P00BootstrapResponse {
  return {
    contractVersion: P00_BOOTSTRAP_CONTRACT_VERSION,
    status: 'ready',
    evidenceClass: 'P00_ACCEPTANCE',
    traceId: 'p00-6f746f6c6f63',
  };
}

export function P00BootstrapPanel({
  response,
  track,
}: {
  response: unknown;
  track: (event: P00SliceTelemetry) => void;
}) {
  const decoded = decodeP00BootstrapResponse(response);
  React.useEffect(() => {
    track({
      event: 'p00.slice.ready',
      contractVersion: decoded.contractVersion,
      traceId: decoded.traceId,
    });
  }, [decoded.contractVersion, decoded.traceId, track]);

  return (
    <section aria-labelledby="p00-slice-title" data-contract={decoded.contractVersion}>
      <h1 id="p00-slice-title">P00 technical slice</h1>
      <p>Generated contract decoded successfully.</p>
      <output aria-label="Slice status">Ready</output>
    </section>
  );
}

type BoundaryProps = {
  children: React.ReactNode;
  track: (event: P00SliceTelemetry) => void;
};

type BoundaryState = { error: boolean };

export class P00RouteErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: false };
  private focusTarget = React.createRef<HTMLButtonElement>();

  static getDerivedStateFromError(): BoundaryState {
    return { error: true };
  }

  componentDidCatch(): void {
    this.props.track({
      event: 'p00.slice.contract_error',
      contractVersion: P00_BOOTSTRAP_CONTRACT_VERSION,
    });
    this.focusTarget.current?.focus();
  }

  render() {
    if (this.state.error) {
      return (
        <section role="alert" aria-labelledby="p00-error-title">
          <h1 id="p00-error-title">Technical slice unavailable</h1>
          <p>The response did not match the registered contract.</p>
          <button ref={this.focusTarget} type="button">Try again</button>
        </section>
      );
    }
    return this.props.children;
  }
}
