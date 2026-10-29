import { describe, expect, it } from 'vitest';
import { noteCopy, unrecordedCopies, unrecordedCopyWarning, type LoadedCopies } from '../src/load-guard';

// The card loads twice when an old /local/ Lovelace resource is left beside the integration's copy.

const served = { version: '1.0.0+aaaa1111', url: 'http://ha:8123/infinassistant/infinassistant-watchface.js?v=0123' };
const manual = { version: '1.0.0+bbbb2222', url: 'http://ha:8123/local/infinassistant-watchface.js' };

describe('noteCopy', () => {
  it('says nothing for the first copy, which defines the card and is used', () => {
    const loaded: LoadedCopies = { copies: [] };
    expect(noteCopy(loaded, served, false)).toBeNull();
    expect(loaded.copies).toEqual([served]);
  });

  it('names both versions when a second, different copy loads', () => {
    const loaded: LoadedCopies = { copies: [] };
    noteCopy(loaded, served, false);
    const warning = noteCopy(loaded, manual, true);
    expect(warning).toContain(`${served.version} (${served.url}) is in use`);
    expect(warning).toContain(`${manual.version} (${manual.url}) is not`);
    expect(warning).toContain('/local/infinassistant-watchface.js');
    expect(loaded.copies).toEqual([served, manual]);
  });

  it('says nothing when the second copy is the same version', () => {
    const loaded: LoadedCopies = { copies: [] };
    noteCopy(loaded, served, false);
    expect(noteCopy(loaded, { ...served, url: manual.url }, true)).toBeNull();
  });

  it('names an older copy that defined the card without recording itself', () => {
    const warning = noteCopy({ copies: [] }, served, true);
    expect(warning).toContain('an older copy');
    expect(warning).toContain(`${served.version} (${served.url}) is not`);
  });
});

describe('unrecordedCopies', () => {
  it('finds the scripts that load the bundle and are no recorded copy', () => {
    const loaded: LoadedCopies = { copies: [served] };
    const scripts = [
      served.url,
      manual.url,
      manual.url,
      'http://ha:8123/frontend_latest/app.js',
      'http://ha:8123/local/infinassistant-watchface.js.bak',
      'not a url',
    ];
    expect(unrecordedCopies(loaded, scripts, 'infinassistant-watchface.js')).toEqual([manual.url]);
  });

  it('leaves out a copy that recorded itself, which warns on its own', () => {
    const loaded: LoadedCopies = { copies: [served, manual] };
    expect(unrecordedCopies(loaded, [served.url, manual.url], 'infinassistant-watchface.js')).toEqual([]);
  });

  it('names the copy in use and the other script', () => {
    const warning = unrecordedCopyWarning(served, manual.url);
    expect(warning).toContain(`another copy is also loaded, from ${manual.url}`);
    expect(warning).toContain(`${served.version} (${served.url}) is in use`);
  });
});
