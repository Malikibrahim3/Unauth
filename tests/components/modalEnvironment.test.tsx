/** @jest-environment jsdom */
import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { acquireModalEnvironment } from '@/lib/design/overlayStack';
import { Modal } from '@/components/ui/Modal';

describe('shared modal background isolation', () => {
  const releases: Array<() => void> = [];
  function acquire() {
    const release = acquireModalEnvironment();
    releases.push(release);
    return release;
  }
  afterEach(() => {
    cleanup();
    releases.splice(0).forEach(release => release());
    document.body.replaceChildren();
    document.body.style.overflow = '';
  });

  it.each(['public', 'authenticated'])('locks the %s page but keeps its portal operable', shell => {
    const page = document.createElement('main');
    if (shell === 'authenticated') page.dataset.uiVersion = 'supplied-package';
    const host = document.createElement('div');
    host.id = 'full-app-overlay-root';
    host.dataset.overlayHost = 'true';
    document.body.append(page, host);
    const release = acquire();
    expect(page).toHaveAttribute('inert');
    expect(host).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    release();
    expect(page).not.toHaveAttribute('inert');
    expect(page).not.toHaveAttribute('data-overlay-inert');
    expect(document.body.style.overflow).toBe('');
  });

  it('restores existing locks and scroll only after the last modal releases', () => {
    const page = document.createElement('main');
    page.setAttribute('inert', 'existing-readiness-lock');
    page.dataset.overlayInert = 'existing-owner';
    document.body.append(page);
    document.body.style.overflow = 'scroll';
    const releaseFirst = acquire();
    const releaseSecond = acquire();
    releaseFirst();
    releaseFirst();
    expect(page).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    releaseSecond();
    expect(page).toHaveAttribute('inert', 'existing-readiness-lock');
    expect(page).toHaveAttribute('data-overlay-inert', 'existing-owner');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('locks late page roots and stops observing after dismissal', async () => {
    const release = acquire();
    const latePage = document.createElement('main');
    const host = document.createElement('div');
    host.id = 'full-app-overlay-root';
    host.dataset.overlayHost = 'true';
    document.body.append(latePage, host);
    await waitFor(() => expect(latePage).toHaveAttribute('inert'));
    expect(host).not.toHaveAttribute('inert');
    release();
    const nextPage = document.createElement('main');
    document.body.append(nextPage);
    await Promise.resolve();
    expect(latePage).not.toHaveAttribute('inert');
    expect(nextPage).not.toHaveAttribute('inert');
  });

  it('cancels a public review, releases its page and restores focus', async () => {
    function PublicReview() {
      const [open, setOpen] = useState(false);
      return <main><button onClick={() => setOpen(true)}>Review choice</button>
        <Modal open={open} onClose={() => setOpen(false)} title="Review choice"><button>Confirm</button></Modal>
      </main>;
    }
    const { container } = render(<PublicReview />);
    const trigger = screen.getByRole('button', { name: 'Review choice' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Review choice' });
    expect(container).toHaveAttribute('inert');
    expect(dialog.closest('[inert]')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(container).not.toHaveAttribute('inert'));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
