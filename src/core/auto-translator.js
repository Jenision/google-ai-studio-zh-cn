import {
  AUTO_TRANSLATE_BLOCK_SELECTOR,
  EXCLUDE_TEXT_SELECTOR,
  MAX_TEXT_LENGTH,
  MODEL_DESC_CONTAINER_SELECTOR,
  STORAGE_KEYS,
  TOOLTIP_SELECTOR,
  isExcludedElement,
} from '../config.js';

const CJK_RE = /[\u4e00-\u9fff]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/g;
const URL_OR_EMAIL_RE = /(?:https?:\/\/|mailto:|wss?:\/\/|[^\s@]+@[^\s@]+\.[^\s@]+)/i;
const MODEL_ID_ONLY_RE = /^(?:gemini|gemma|imagen|veo|lyria|antigravity|deep-research)[a-z0-9._/-]*$/i;
const DESC_HINT_RE =
  /\b(?:model|models|agent|agents|pricing|bill|bills|intelligence|reasoning|optimized|multimodal|tokens?|generation|latency|tasks?|workflows?|audio|video|image|music|coding|speed|efficiency|context|search|research|resolution|developers?|responses?|thinking|safety|schema|function|prompt|instructions|storage|limit|environment|autonomous|comprehensive|understanding|configured)\b/i;

function normalizeAutoText(zh) {
  return String(zh || '')
    .replace(/令牌/g, 'Token')
    .replace(/\s+/g, ' ')
    .trim();
}

export class AutoTranslator {
  constructor(options = {}) {
    this.getValue =
      options.getValue ||
      ((key, def) => (typeof globalThis.GM_getValue === 'function' ? globalThis.GM_getValue(key, def) : def));
    this.setValue =
      options.setValue ||
      ((key, val) => {
        if (typeof globalThis.GM_setValue === 'function') {
          globalThis.GM_setValue(key, val);
        }
      });
    this.requester =
      options.requester !== undefined
        ? options.requester
        : typeof globalThis.GM_xmlhttpRequest === 'function'
          ? globalThis.GM_xmlhttpRequest.bind(globalThis)
          : null;
    this.maxCacheEntries = options.maxCacheEntries || 500;
    this.enabled =
      options.enabled !== undefined
        ? Boolean(options.enabled)
        : Boolean(this.getValue(STORAGE_KEYS.AUTO_TRANSLATE, true));
    this.cache = new Map();
    this.inFlight = new Map();
    this.queue = [];
    this.activeCount = 0;
    this.maxConcurrent = 4;
    this.loadCache();
  }

  loadCache() {
    try {
      const raw = this.getValue(STORAGE_KEYS.AUTO_CACHE, '');
      if (!raw || typeof raw !== 'string') {
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof k === 'string' && typeof v === 'string' && v.trim()) {
            this.cache.set(k, v);
          }
        }
      }
    } catch {
      // Ignore malformed cache
    }
  }

  saveCache() {
    try {
      while (this.cache.size > this.maxCacheEntries) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      const obj = Object.fromEntries(this.cache.entries());
      this.setValue(STORAGE_KEYS.AUTO_CACHE, JSON.stringify(obj));
    } catch {
      // Ignore storage quota errors
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(next) {
    this.enabled = Boolean(next);
    this.setValue(STORAGE_KEYS.AUTO_TRANSLATE, this.enabled);
  }

  clearCache() {
    this.cache.clear();
    this.setValue(STORAGE_KEYS.AUTO_CACHE, '{}');
  }

  getCached(trimmed) {
    return this.cache.get(trimmed) || null;
  }

  isEligibleContext(el, trimmed) {
    if (!el || !trimmed || trimmed.length < 12 || trimmed.length > MAX_TEXT_LENGTH) {
      return false;
    }
    if (CJK_RE.test(trimmed)) {
      return false;
    }
    if (URL_OR_EMAIL_RE.test(trimmed) || MODEL_ID_ONLY_RE.test(trimmed)) {
      return false;
    }
    if (
      isExcludedElement(el, EXCLUDE_TEXT_SELECTOR) ||
      isExcludedElement(el, AUTO_TRANSLATE_BLOCK_SELECTOR)
    ) {
      return false;
    }

    const words = trimmed.match(LATIN_WORD_RE) || [];
    if (words.length < 3) {
      return false;
    }

    if (isExcludedElement(el, TOOLTIP_SELECTOR)) {
      return true;
    }

    if (isExcludedElement(el, MODEL_DESC_CONTAINER_SELECTOR)) {
      const startsCapital = /^[A-Z]/.test(trimmed);
      const endsPunct = /[.!?…]$/.test(trimmed);
      return words.length >= 4 && startsCapital && (endsPunct || DESC_HINT_RE.test(trimmed));
    }

    return false;
  }

  requestTranslation(trimmed, onResolved) {
    if (!this.enabled || !trimmed) {
      return;
    }

    const cached = this.getCached(trimmed);
    if (cached) {
      onResolved(cached);
      return;
    }

    if (typeof this.requester !== 'function') {
      return;
    }

    let waiters = this.inFlight.get(trimmed);
    if (waiters) {
      waiters.add(onResolved);
      return;
    }

    waiters = new Set([onResolved]);
    this.inFlight.set(trimmed, waiters);
    this.queue.push(trimmed);
    this.drainQueue();
  }

  drainQueue() {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const text = this.queue.shift();
      this.activeCount += 1;
      this.fetchGoogleTranslate(text)
        .then((translated) => {
          const waiters = this.inFlight.get(text);
          this.inFlight.delete(text);
          if (translated && translated !== text) {
            this.cache.set(text, translated);
            this.saveCache();
            if (waiters) {
              for (const cb of waiters) {
                try {
                  cb(translated);
                } catch {
                  // Ignore stale node callback errors
                }
              }
            }
          }
        })
        .catch(() => {
          this.inFlight.delete(text);
        })
        .finally(() => {
          this.activeCount -= 1;
          this.drainQueue();
        });
    }
  }

  fetchGoogleTranslate(text) {
    return new Promise((resolve) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
      try {
        this.requester({
          method: 'GET',
          url,
          timeout: 8000,
          onload: (res) => {
            try {
              if (res.status < 200 || res.status >= 300) {
                resolve(null);
                return;
              }
              const data = JSON.parse(res.responseText);
              if (!Array.isArray(data) || !Array.isArray(data[0])) {
                resolve(null);
                return;
              }
              const joined = data[0]
                .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
                .join('');
              const cleaned = normalizeAutoText(joined);
              resolve(cleaned || null);
            } catch {
              resolve(null);
            }
          },
          onerror: () => resolve(null),
          ontimeout: () => resolve(null),
        });
      } catch {
        resolve(null);
      }
    });
  }
}
