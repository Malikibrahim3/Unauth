/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ApiIntegrationsAdvancedSection from '@/components/settings/ApiIntegrationsAdvancedSection';

const mockUseFetchJson = jest.fn();

jest.mock('@/lib/react/useFetchJson', () => ({
  useFetchJson: (...args: unknown[]) => mockUseFetchJson(...args),
}));

describe('API access commercial entitlement', () => {
  beforeEach(() => {
    mockUseFetchJson.mockReturnValue({
      data: null,
      loading: false,
      reload: jest.fn(),
      error: null,
    });
  });

  it('shows no key creation control when durable machine access is disabled', () => {
    render(<ApiIntegrationsAdvancedSection machineAccessEnabled={false} />);

    expect(screen.getByText('Enterprise API access is not enabled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a key' })).not.toBeInTheDocument();
    expect(mockUseFetchJson).toHaveBeenCalledWith(
      '/api/settings/api-keys',
      expect.objectContaining({ enabled: false }),
    );
  });

  it('renders the scoped key lifecycle only when durable access is enabled', () => {
    render(<ApiIntegrationsAdvancedSection machineAccessEnabled />);

    expect(screen.getByRole('button', { name: 'Create a key' })).toBeInTheDocument();
    expect(mockUseFetchJson).toHaveBeenCalledWith(
      '/api/settings/api-keys',
      expect.objectContaining({ enabled: true }),
    );
  });
});
