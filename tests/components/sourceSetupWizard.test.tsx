/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SourceSetupWizard } from '@/components/sources/SourceSetupWizard';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const base = {
  providerId: 'bigcommerce',
  providerName: 'BigCommerce',
  configuration: 'not_configured' as const,
  operational: 'unknown' as const,
  badge: 'disconnected' as const,
  connectionNote: null,
  stage: 'partial',
  description: 'Commerce records from BigCommerce.',
  capabilities: [{ id: 'orders.read', description: 'Read orders', support: 'supported' }],
  deliveryModel: 'webhook',
  connectEnabled: true,
  canManage: true,
  returnTo: '/sources/bigcommerce',
};

describe('SourceSetupWizard truth boundary', () => {
  it('keeps the complete seven-step setup sequence with activation last', () => {
    render(<SourceSetupWizard {...base} initialStep="provider" />);

    const progress = screen.getByRole('list', { name: 'BigCommerce setup stages' });
    expect(progress).toHaveTextContent('Provider');
    expect(progress).toHaveTextContent('Permissions');
    expect(progress).toHaveTextContent('Mapping');
    expect(progress).toHaveTextContent('History');
    expect(progress).toHaveTextContent('Schedule');
    expect(progress).toHaveTextContent('Review');
    expect(progress).toHaveTextContent('Activate');
    expect(screen.queryByText('Connection controls')).not.toBeInTheDocument();
  });

  it('shows adapter-owned mappings without collecting a cosmetic draft', () => {
    render(<SourceSetupWizard {...base} initialStep="mapping" />);

    expect(screen.getByRole('heading', { name: 'Field mapping' })).toBeInTheDocument();
    expect(screen.getByText('Supported')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not claim a local configuration test verified provider credentials', () => {
    render(<SourceSetupWizard {...base} initialStep="verify" />);

    expect(screen.getByText(/declared adapter support, recorded configuration and measured health are separate/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run configuration checks/i })).not.toBeInTheDocument();
  });
});


it('does not turn subscription support or viewed steps into granted reads', () => {
  const { container } = render(<SourceSetupWizard {...base} initialStep="permissions" capabilities={[
    { id: 'orders.subscribe', level: 'subscribe', description: 'Order events', support: 'supported' },
    { id: 'case.link', level: 'link', description: 'Case handoff', support: 'partial' },
  ]} />);
  expect(screen.getByText('Receive provider events')).toBeInTheDocument();
  expect(screen.getByText('Open a manual handoff')).toBeInTheDocument();
  expect(screen.queryByText('Requested')).not.toBeInTheDocument();
  expect(container.querySelector('[data-state="complete"]')).toBeNull();
});
