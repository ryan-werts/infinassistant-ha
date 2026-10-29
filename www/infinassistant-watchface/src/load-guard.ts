/**
 * The card can be loaded twice: from the integration, which serves it, and from a /local/
 * Lovelace resource left over from installing it by hand. The first copy defines the elements and
 * is the one used, the others define nothing; these say so in the console, naming the copies, so
 * that the old resource gets removed.
 */

export interface CardCopy {
  version: string;
  url: string;
}

/** The copies that have loaded, the one in use first: shared by all of them through `window`. */
export interface LoadedCopies {
  copies: CardCopy[];
}

const describe = (copy: CardCopy): string => `${copy.version} (${copy.url})`;

const REMEDY = 'Remove the Lovelace resource that adds the card by hand, such as /local/infinassistant-watchface.js: ' +
  'the InfinAssistant integration serves the card itself.';

/**
 * Records [self] among the loaded copies. [defined] says whether the card's element exists
 * already, which a copy built before copies recorded themselves leaves without a record. Returns
 * the warning when [self] is not the copy in use and is another version, else null.
 */
export function noteCopy(loaded: LoadedCopies, self: CardCopy, defined: boolean): string | null {
  const inUse = loaded.copies[0];
  loaded.copies.push(self);
  if (!defined) return null;
  if (inUse === undefined) {
    return `InfinAssistant watch face card: an older copy, which does not record its version, was loaded first ` +
      `and is in use; ${describe(self)} is not. ${REMEDY}`;
  }
  if (inUse.version === self.version) return null;
  return `InfinAssistant watch face card: two versions are loaded. ${describe(inUse)} is in use; ` +
    `${describe(self)} is not. ${REMEDY}`;
}

/**
 * The page's scripts that load the bundle ([bundle] is its file name) and are no recorded copy:
 * copies built before copies recorded themselves, or ones still loading. By the time a card is on
 * a dashboard, Lovelace has added its resources' scripts.
 */
export function unrecordedCopies(loaded: LoadedCopies, scriptUrls: readonly string[], bundle: string): string[] {
  const recorded = new Set(loaded.copies.map((c) => c.url));
  return [...new Set(scriptUrls)].filter((url) => {
    if (recorded.has(url)) return false;
    try {
      return new URL(url).pathname.endsWith(`/${bundle}`);
    } catch {
      return false;
    }
  });
}

/** The warning for another copy found by its script, which the copy in use, [self], logs. */
export function unrecordedCopyWarning(self: CardCopy, url: string): string {
  return `InfinAssistant watch face card: another copy is also loaded, from ${url}; ${describe(self)} is in use. ${REMEDY}`;
}
