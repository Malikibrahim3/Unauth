import { SIGNAL_COPY, signalCopy } from '@/lib/copy/signals';

describe('signal copy — context-only notes', () => {
  it('uses contextNote field, not recommended', () => {
    const copy = signalCopy('inrAbuse');
    expect(copy.contextNote).toBeTruthy();
    expect('recommended' in copy).toBe(false);
    expect(copy.contextNote.toLowerCase()).not.toContain('before deciding');
    expect(copy.contextNote.toLowerCase()).not.toContain('recommended action');
  });

  it('all catalogued signals have neutral context notes', () => {
    for (const [key, entry] of Object.entries(SIGNAL_COPY)) {
      expect(entry.contextNote.length).toBeGreaterThan(10);
      expect(entry.contextNote.toLowerCase()).not.toMatch(/\b(before deciding|recommended action|suggested action)\b/);
      void key;
    }
  });
});
