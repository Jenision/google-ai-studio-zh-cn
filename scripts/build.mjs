import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_SCRIPT_META } from '../src/meta.js';
import { DICTIONARY_MODULES, REGEX_PATTERNS } from '../src/dictionaries/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'google-ai-studio-zh-cn.user.js');

const SOURCE_ORDER = [
  'config.js',
  'dictionaries/common.js',
  'dictionaries/navigation.js',
  'dictionaries/workspace.js',
  'dictionaries/run-settings.js',
  'dictionaries/stream-media-build.js',
  'dictionaries/dashboard-api.js',
  'dictionaries/models.js',
  'dictionaries/tooltips.js',
  'dictionaries/patterns.js',
  'dictionaries/index.js',
  'core/auto-translator.js',
  'core/translator.js',
  'core/scanner.js',
  'core/menu.js',
  'main.js',
];

function validateVersionSync() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const metaMatch = USER_SCRIPT_META.match(/\/\/\s*@version\s+([^\s]+)/);
  const metaVersion = metaMatch ? metaMatch[1].trim() : '';

  if (!metaVersion || metaVersion !== pkg.version) {
    throw new Error(
      `Version mismatch: package.json (${pkg.version}) !== src/meta.js (@version ${metaVersion})`,
    );
  }
}

function validateDictionaries() {
  const seen = new Map();
  const seenLower = new Map();
  const errors = [];
  let totalEntries = 0;

  for (const [moduleName, dict] of Object.entries(DICTIONARY_MODULES)) {
    for (const [key, value] of Object.entries(dict)) {
      totalEntries += 1;
      if (key !== key.trim() || !key) {
        errors.push(`[${moduleName}] Invalid or untrimmed key: ${JSON.stringify(key)}`);
      }
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`[${moduleName}] Empty translation for key: ${JSON.stringify(key)}`);
      }
      if (seen.has(key)) {
        const prev = seen.get(key);
        errors.push(
          `Duplicate key ${JSON.stringify(key)} in [${moduleName}] (already defined in [${prev.moduleName}])`,
        );
      } else {
        seen.set(key, { moduleName, value });
      }

      const lowerKey = key.replace(/\s+/g, ' ').trim().toLowerCase();
      if (seenLower.has(lowerKey)) {
        const prev = seenLower.get(lowerKey);
        if (prev.value !== value) {
          errors.push(
            `Case-insensitive conflict for ${JSON.stringify(key)} (${JSON.stringify(value)}) in [${moduleName}] vs ${JSON.stringify(prev.key)} (${JSON.stringify(prev.value)}) in [${prev.moduleName}]`,
          );
        }
      } else {
        seenLower.set(lowerKey, { moduleName, key, value });
      }
    }
  }

  for (const pattern of REGEX_PATTERNS) {
    if (!pattern.name || !(pattern.regex instanceof RegExp) || typeof pattern.replace !== 'function') {
      errors.push(`Invalid regex pattern entry: ${JSON.stringify(pattern?.name)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Dictionary validation failed:\n- ${errors.join('\n- ')}`);
  }

  return {
    totalEntries,
    patternCount: REGEX_PATTERNS.length,
  };
}

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(?=(?:const|let|var|function|async\s+function|class)\b)/gm, '')
    .trim();
}

function buildBundle() {
  validateVersionSync();
  const stats = validateDictionaries();

  const sections = SOURCE_ORDER.map((relPath) => {
    const absPath = path.join(SRC_DIR, relPath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const stripped = stripModuleSyntax(raw);
    return `  // --- ${relPath} ---\n${stripped
      .split('\n')
      .map((line) => (line ? `  ${line}` : ''))
      .join('\n')}`;
  });

  const bundle = [
    USER_SCRIPT_META.trim(),
    '',
    '(function () {',
    "  'use strict';",
    '',
    sections.join('\n\n'),
    '})();',
    '',
  ].join('\n');

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, bundle, 'utf8');

  const sizeKb = (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(2);
  console.log(
    `Built ${OUTPUT_FILE} (${sizeKb} KB) | ${stats.totalEntries} exact entries, ${stats.patternCount} regex patterns`,
  );
}

buildBundle();
