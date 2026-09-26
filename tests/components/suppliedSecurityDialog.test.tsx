/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SuppliedSecurityDialog } from '@/components/visual-authority/SuppliedSecurityDialog';

describe('supplied security dialog frame', () => {
  it('retains the source frame and close SVG while exposing dialog semantics', async () => {
    const close = jest.fn();
    render(<SuppliedSecurityDialog title="Transfer ownership" description="Confirm the access change." overlayId="security-test" onClose={close} footer={<button>Confirm</button>}><input aria-label="Confirmation" /></SuppliedSecurityDialog>);
    const dialog = await screen.findByRole('dialog', { name: 'Transfer ownership' });
    expect(dialog).toHaveStyle({ width: '620px', borderRadius: '14px' });
    expect(dialog.parentElement).toHaveStyle({ padding: '40px', background: 'rgba(34,29,23,.30)' });
    const closeControl = screen.getByRole('button', { name: 'Close dialog' });
    expect(closeControl.tagName.toLowerCase()).toBe('button');
    expect(closeControl).toHaveStyle({ width: '32px', height: '32px' });
    expect(closeControl.querySelector('path')).toHaveAttribute('d', 'M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4');
    fireEvent.click(closeControl);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss an in-flight security mutation through escape, backdrop or close control', async () => {
    const close = jest.fn();
    render(<SuppliedSecurityDialog title="Revoke key" description="Immediate revocation." overlayId="security-test" onClose={close} busy footer={<button disabled>Revoking…</button>}>Pending</SuppliedSecurityDialog>);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(dialog.parentElement!);
    fireEvent.click(screen.getByRole('button', { name: 'Close unavailable while saving' }));
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(close).not.toHaveBeenCalled();
  });
});
