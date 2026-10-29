import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const BUNDLE = 'infinassistant-watchface.js';
/** Written next to the bundle: the hashes check_bundle.py compares with the sources and the bundle. */
const RECORD = 'infinassistant-watchface.build.json';
/** The integration serves the card from here (custom_components/infinassistant/card.py). */
const INTEGRATION_FRONTEND = resolve(__dirname, '../../custom_components/infinassistant/frontend');

/** Every file under [dir], as paths relative to this directory, sorted. */
function filesUnder(dir: string): string[] {
  return readdirSync(resolve(__dirname, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesUnder(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
    .sort();
}

/**
 * A hash of what the bundle is built from: the package, the lockfile, the build config and src/.
 * Line endings are hashed as LF, as git stores them, so every checkout builds the same bundle.
 * check_bundle.py repeats this hash and must stay identical to it.
 */
function inputsHash(): string {
  const hash = createHash('sha256');
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', ...filesUnder('src')]) {
    hash.update(`${file}\0`);
    hash.update(asLf(readFileSync(resolve(__dirname, file))));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** The bytes with every CR LF turned into LF. Raw bytes, never decoded, so any file hashes the same as in check_bundle.py. */
function asLf(data: Buffer): Buffer {
  const out = Buffer.alloc(data.length);
  let n = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x0d && data[i + 1] === 0x0a) continue;
    out[n++] = data[i];
  }
  return out.subarray(0, n);
}

const INPUTS_HASH = inputsHash();

/**
 * The card's version: the package's, then the start of the inputs hash, so that two builds that
 * differ never share one (package.json's version is seldom bumped).
 */
function cardVersion(): string {
  const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
  return `${version}+${INPUTS_HASH.slice(0, 8)}`;
}

/**
 * Copies the built bundle into the integration, so the copy it serves is never stale, and records the
 * hashes of the inputs and of the bundle next to it, so a stale bundle can be found without node.
 */
function copyToIntegration(): Plugin {
  return {
    name: 'copy-to-integration',
    apply: 'build',
    writeBundle() {
      mkdirSync(INTEGRATION_FRONTEND, { recursive: true });
      copyFileSync(resolve(__dirname, 'dist', BUNDLE), resolve(INTEGRATION_FRONTEND, BUNDLE));
      const bundleHash = createHash('sha256').update(readFileSync(resolve(__dirname, 'dist', BUNDLE))).digest('hex');
      writeFileSync(
        resolve(__dirname, 'dist', RECORD),
        `${JSON.stringify({ bundle_sha256: bundleHash, inputs_sha256: INPUTS_HASH }, null, 2)}\n`,
      );
    },
  };
}

export default defineConfig({
  plugins: [copyToIntegration()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/infinassistant-watchface-card.ts'),
      name: 'InfinassistantWatchface',
      fileName: () => BUNDLE,
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: BUNDLE,
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
    sourcemap: true,
    target: 'es2021',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __CARD_VERSION__: JSON.stringify(cardVersion()),
  },
});
