/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelpCentre } from '@/components/help/HelpCentre';

describe('Phase 23 notifications and help', () => {
  it('searches anchored in-page guidance and retains only real destinations', () => {
    render(<HelpCentre />);

    fireEvent.change(screen.getByRole('textbox', { name: /search help/i }), { target: { value: 'recovery' } });

    expect(screen.getByRole('link', { name: /follow a recovery.*read/i })).toHaveAttribute('href', '#follow-a-recovery');
    expect(screen.getByRole('link', { name: 'Open recovery board' })).toHaveAttribute('href', '/recoveries');
    expect(screen.getByRole('link', { name: 'Email support' })).toHaveAttribute('href', 'mailto:support@unauth.app');
  });
});
