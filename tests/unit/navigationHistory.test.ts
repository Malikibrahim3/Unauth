/**
 * @jest-environment jsdom
 */
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';

describe('replaceHistoryUrlIfChanged', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/cases');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips a URL that is semantically unchanged', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState');

    replaceHistoryUrlIfChanged('/cases?');

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('updates the URL when its path, query, or hash changes', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState');

    replaceHistoryUrlIfChanged('/cases?selected=case-a#preview');

    expect(replaceState).toHaveBeenCalledWith(null, '', '/cases?selected=case-a#preview');
    expect(window.location.pathname).toBe('/cases');
    expect(window.location.search).toBe('?selected=case-a');
    expect(window.location.hash).toBe('#preview');
  });

  it('ignores a cross-origin URL', () => {
    const replaceState = jest.spyOn(window.history, 'replaceState');

    replaceHistoryUrlIfChanged('https://example.test/cases');

    expect(replaceState).not.toHaveBeenCalled();
  });
});
