import { MAX_TEXT_LENGTH } from '../config.js';
import { COMMON_DICT } from './common.js';
import { NAVIGATION_DICT } from './navigation.js';
import { WORKSPACE_DICT } from './workspace.js';
import { RUN_SETTINGS_DICT } from './run-settings.js';
import { STREAM_MEDIA_BUILD_DICT } from './stream-media-build.js';
import { DASHBOARD_API_DICT } from './dashboard-api.js';
import { MODELS_DICT } from './models.js';
import { TOOLTIPS_DICT } from './tooltips.js';
import { REGEX_PATTERNS } from './patterns.js';

export const DICTIONARY_MODULES = {
  common: COMMON_DICT,
  navigation: NAVIGATION_DICT,
  workspace: WORKSPACE_DICT,
  runSettings: RUN_SETTINGS_DICT,
  streamMediaBuild: STREAM_MEDIA_BUILD_DICT,
  dashboardApi: DASHBOARD_API_DICT,
  models: MODELS_DICT,
  tooltips: TOOLTIPS_DICT,
};

export const EXACT_DICT = new Map();
export const LOWER_DICT = new Map();

function normalizeLookupKey(text) {
  return text.replace(/\s+/g, ' ').trim();
}

for (const dict of Object.values(DICTIONARY_MODULES)) {
  for (const [key, value] of Object.entries(dict)) {
    EXACT_DICT.set(key, value);
    const lowerKey = normalizeLookupKey(key).toLowerCase();
    if (!LOWER_DICT.has(lowerKey)) {
      LOWER_DICT.set(lowerKey, value);
    }
  }
}

const LATIN_RE = /[A-Za-z]/;
const URL_RE = /^(?:https?:\/\/|mailto:|wss?:\/\/|data:)/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMERIC_PUNCT_RE = /^[\d\s.,:%+\-*/()[\]{}<>|\\=_#@!?&~`'"^]+$/;

export function shouldAttemptTranslate(trimmed) {
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    return false;
  }
  if (!LATIN_RE.test(trimmed)) {
    return false;
  }
  if (URL_RE.test(trimmed) || EMAIL_RE.test(trimmed)) {
    return false;
  }
  if (NUMERIC_PUNCT_RE.test(trimmed)) {
    return false;
  }
  return true;
}

function translateTrimmed(trimmed) {
  if (!shouldAttemptTranslate(trimmed)) {
    return null;
  }

  if (EXACT_DICT.has(trimmed)) {
    return EXACT_DICT.get(trimmed);
  }

  const normalized = normalizeLookupKey(trimmed);
  if (EXACT_DICT.has(normalized)) {
    return EXACT_DICT.get(normalized);
  }

  const lower = normalized.toLowerCase();
  if (LOWER_DICT.has(lower)) {
    return LOWER_DICT.get(lower);
  }

  // Trailing colon fallback: e.g. "Source:" -> "来源："
  if (normalized.endsWith(':')) {
    const stem = normalized.slice(0, -1).trim();
    const stemHit = lookupExactOrLower(stem);
    if (stemHit && stemHit.toLowerCase() !== stem.toLowerCase()) {
      return `${stemHit}：`;
    }
  }

  // Trailing ellipsis fallback: e.g. "Add stop..." -> "添加停止序列..."
  if (normalized.endsWith('...') || normalized.endsWith('…')) {
    const ellipsis = normalized.endsWith('...') ? '...' : '…';
    const stem = normalized.slice(0, -ellipsis.length).trim();
    const stemHit = lookupExactOrLower(stem);
    if (stemHit && stemHit.toLowerCase() !== stem.toLowerCase()) {
      return `${stemHit}${ellipsis}`;
    }
  }

  const helpers = {
    isKnownTerm,
    translateFragment(fragment) {
      const inner = translateTrimmed(String(fragment || '').trim());
      return inner !== null ? inner : fragment;
    },
  };

  for (const pattern of REGEX_PATTERNS) {
    const match = normalized.match(pattern.regex);
    if (match) {
      const replaced = pattern.replace(...match, helpers);
      if (replaced && replaced !== normalized) {
        return replaced;
      }
    }
  }

  return null;
}

function lookupExactOrLower(text) {
  if (!text) {
    return null;
  }
  const normalized = normalizeLookupKey(text);
  if (EXACT_DICT.has(normalized)) {
    return EXACT_DICT.get(normalized);
  }
  const lower = normalized.toLowerCase();
  if (LOWER_DICT.has(lower)) {
    return LOWER_DICT.get(lower);
  }
  return null;
}

export function isKnownTerm(fragment) {
  const normalized = normalizeLookupKey(String(fragment || ''));
  if (!normalized) {
    return false;
  }
  return EXACT_DICT.has(normalized) || LOWER_DICT.has(normalized.toLowerCase());
}

export function isIdentityTerm(trimmed) {
  const normalized = normalizeLookupKey(String(trimmed || ''));
  if (!normalized) {
    return false;
  }
  if (EXACT_DICT.has(normalized)) {
    return EXACT_DICT.get(normalized) === normalized;
  }
  const lower = normalized.toLowerCase();
  if (LOWER_DICT.has(lower)) {
    return LOWER_DICT.get(lower).toLowerCase() === lower;
  }
  return false;
}

export function translateText(rawText) {
  if (typeof rawText !== 'string' || !rawText) {
    return { translated: rawText, matched: false };
  }

  const match = rawText.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const leading = match ? match[1] : '';
  const core = match ? match[2] : rawText;
  const trailing = match ? match[3] : '';

  const hit = translateTrimmed(core);
  if (hit === null || hit === core) {
    return { translated: rawText, matched: false };
  }

  return {
    translated: `${leading}${hit}${trailing}`,
    matched: true,
  };
}

export { REGEX_PATTERNS };
