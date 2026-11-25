import {
  EXCLUDE_ATTR_SELECTOR,
  EXCLUDE_TEXT_SELECTOR,
  NODE_TYPE_DOCUMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_FRAGMENT,
  NODE_TYPE_TEXT,
  OVERLAY_IMMEDIATE_SELECTOR,
  SCANNER_HOST_ID,
  TRANSLATABLE_ATTRS,
  isExcludedElement,
} from '../config.js';
import { translateText } from '../dictionaries/index.js';

function scheduleFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 0);
}

export class TranslatorEngine {
  constructor(options = {}) {
    this.doc = options.doc || globalThis.document;
    this.autoTranslator = options.autoTranslator || null;
    this.enabled = false;
    this.isApplying = false;
    this.observer = null;
    this.titleObserver = null;
    this.flushScheduled = false;
    this.pendingNodes = new Set();
    this.originalTextMap = new WeakMap();
    this.originalAttrMap = new WeakMap();
    this.originalTitle = null;
    this.translatedTitle = null;
  }

  isTranslatedTextNode(node) {
    const record = this.originalTextMap.get(node);
    return Boolean(record && node.nodeValue === record.translated);
  }

  isTranslatedAttribute(el, attr) {
    const attrMap = this.originalAttrMap.get(el);
    if (!attrMap) {
      return false;
    }
    const record = attrMap.get(attr);
    return Boolean(record && el.getAttribute(attr) === record.translated);
  }

  translateTextNode(node) {
    if (!node || node.nodeType !== NODE_TYPE_TEXT) {
      return false;
    }

    const parent = node.parentElement || node.parentNode;
    if (!parent || parent.nodeType !== NODE_TYPE_ELEMENT) {
      return false;
    }
    if (isExcludedElement(parent, EXCLUDE_TEXT_SELECTOR)) {
      return false;
    }

    const current = node.nodeValue;
    if (!current || !current.trim()) {
      return false;
    }

    const existing = this.originalTextMap.get(node);
    if (existing && current === existing.translated) {
      return false;
    }

    const result = translateText(current);
    if (result.matched) {
      this.originalTextMap.set(node, {
        original: current,
        translated: result.translated,
      });
      node.nodeValue = result.translated;
      return true;
    }

    if (this.autoTranslator && this.autoTranslator.isEnabled()) {
      const wsMatch = current.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const leading = wsMatch ? wsMatch[1] : '';
      const core = wsMatch ? wsMatch[2] : current;
      const trailing = wsMatch ? wsMatch[3] : '';
      const trimmed = core.replace(/\s+/g, ' ').trim();

      if (this.autoTranslator.isEligibleContext(parent, trimmed)) {
        const cached = this.autoTranslator.getCached(trimmed);
        if (cached) {
          const translated = `${leading}${cached}${trailing}`;
          this.originalTextMap.set(node, {
            original: current,
            translated,
          });
          node.nodeValue = translated;
          return true;
        }

        this.autoTranslator.requestTranslation(trimmed, (zh) => {
          if (!this.enabled || node.nodeValue !== current) {
            return;
          }
          const translated = `${leading}${zh}${trailing}`;
          this.runWithGuard(() => {
            this.originalTextMap.set(node, {
              original: current,
              translated,
            });
            node.nodeValue = translated;
          });
        });
      }
    }

    return false;
  }

  translateAttributes(el) {
    if (!el || el.nodeType !== NODE_TYPE_ELEMENT) {
      return false;
    }
    if (el.id === SCANNER_HOST_ID || isExcludedElement(el, EXCLUDE_ATTR_SELECTOR)) {
      return false;
    }

    let changed = false;
    let attrMap = this.originalAttrMap.get(el);

    for (const attr of TRANSLATABLE_ATTRS) {
      if (typeof el.hasAttribute === 'function' && !el.hasAttribute(attr)) {
        continue;
      }
      const current = typeof el.getAttribute === 'function' ? el.getAttribute(attr) : null;
      if (!current || !current.trim()) {
        continue;
      }

      const existing = attrMap ? attrMap.get(attr) : null;
      if (existing && current === existing.translated) {
        continue;
      }

      const result = translateText(current);
      if (!result.matched) {
        continue;
      }

      if (!attrMap) {
        attrMap = new Map();
        this.originalAttrMap.set(el, attrMap);
      }
      attrMap.set(attr, {
        original: current,
        translated: result.translated,
      });
      el.setAttribute(attr, result.translated);
      changed = true;
    }

    return changed;
  }

  translateDocumentTitle() {
    if (!this.doc || typeof this.doc.title !== 'string') {
      return false;
    }
    const current = this.doc.title;
    if (!current) {
      return false;
    }
    if (this.translatedTitle !== null && current === this.translatedTitle) {
      return false;
    }
    const result = translateText(current);
    if (!result.matched) {
      return false;
    }
    this.originalTitle = current;
    this.translatedTitle = result.translated;
    this.doc.title = result.translated;
    return true;
  }

  translateSubtree(root) {
    if (!root) {
      return;
    }

    if (root.nodeType === NODE_TYPE_TEXT) {
      this.translateTextNode(root);
      return;
    }

    if (root.nodeType === NODE_TYPE_ELEMENT) {
      if (root.id === SCANNER_HOST_ID) {
        return;
      }
      this.translateAttributes(root);

      const skipChildrenText = isExcludedElement(root, EXCLUDE_TEXT_SELECTOR);
      const children = root.childNodes || [];
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.nodeType === NODE_TYPE_TEXT) {
          if (!skipChildrenText) {
            this.translateTextNode(child);
          }
        } else if (child.nodeType === NODE_TYPE_ELEMENT) {
          this.translateSubtree(child);
        }
      }

      if (root.shadowRoot) {
        this.translateSubtree(root.shadowRoot);
      }
      return;
    }

    if (root.nodeType === NODE_TYPE_DOCUMENT || root.nodeType === NODE_TYPE_FRAGMENT) {
      const children = root.childNodes || [];
      for (let i = 0; i < children.length; i += 1) {
        this.translateSubtree(children[i]);
      }
    }
  }

  restoreSubtree(root) {
    if (!root) {
      return;
    }

    if (root.nodeType === NODE_TYPE_TEXT) {
      const record = this.originalTextMap.get(root);
      if (record) {
        if (root.nodeValue === record.translated) {
          root.nodeValue = record.original;
        }
        this.originalTextMap.delete(root);
      }
      return;
    }

    if (root.nodeType === NODE_TYPE_ELEMENT) {
      if (root.id === SCANNER_HOST_ID) {
        return;
      }
      const attrMap = this.originalAttrMap.get(root);
      if (attrMap) {
        for (const [attr, record] of attrMap.entries()) {
          if (root.getAttribute(attr) === record.translated) {
            root.setAttribute(attr, record.original);
          }
        }
        this.originalAttrMap.delete(root);
      }

      const children = root.childNodes || [];
      for (let i = 0; i < children.length; i += 1) {
        this.restoreSubtree(children[i]);
      }
      if (root.shadowRoot) {
        this.restoreSubtree(root.shadowRoot);
      }
      return;
    }

    if (root.nodeType === NODE_TYPE_DOCUMENT || root.nodeType === NODE_TYPE_FRAGMENT) {
      const children = root.childNodes || [];
      for (let i = 0; i < children.length; i += 1) {
        this.restoreSubtree(children[i]);
      }
    }
  }

  runWithGuard(fn) {
    const prev = this.isApplying;
    this.isApplying = true;
    try {
      fn();
    } finally {
      this.isApplying = prev;
    }
  }

  rescan(root) {
    if (!this.enabled) {
      return;
    }
    const target = root || this.doc?.body || this.doc?.documentElement;
    this.runWithGuard(() => {
      this.translateDocumentTitle();
      if (target) {
        this.translateSubtree(target);
      }
    });
  }

  restoreAll(root) {
    const target = root || this.doc?.body || this.doc?.documentElement;
    this.runWithGuard(() => {
      if (
        this.doc &&
        this.originalTitle !== null &&
        this.doc.title === this.translatedTitle
      ) {
        this.doc.title = this.originalTitle;
      }
      this.originalTitle = null;
      this.translatedTitle = null;

      if (target) {
        this.restoreSubtree(target);
      }
    });
  }

  queueNode(node) {
    if (!node || !this.enabled) {
      return;
    }
    this.pendingNodes.add(node);
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      scheduleFrame(() => this.flushPending());
    }
  }

  flushPending() {
    this.flushScheduled = false;
    if (!this.enabled || this.pendingNodes.size === 0) {
      this.pendingNodes.clear();
      return;
    }

    const batch = Array.from(this.pendingNodes);
    this.pendingNodes.clear();

    this.runWithGuard(() => {
      this.translateDocumentTitle();
      for (const node of batch) {
        this.translateSubtree(node);
      }
    });
  }

  handleMutations(mutations) {
    if (!this.enabled || this.isApplying) {
      return;
    }

    const immediateNodes = [];
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const parent = mutation.target?.parentElement || mutation.target?.parentNode;
        if (parent && isExcludedElement(parent, OVERLAY_IMMEDIATE_SELECTOR)) {
          immediateNodes.push(mutation.target);
        } else {
          this.queueNode(mutation.target);
        }
      } else if (mutation.type === 'attributes') {
        this.queueNode(mutation.target);
      } else if (mutation.type === 'childList') {
        const added = mutation.addedNodes || [];
        for (let i = 0; i < added.length; i += 1) {
          const addedNode = added[i];
          const anchor =
            addedNode.nodeType === NODE_TYPE_ELEMENT
              ? addedNode
              : addedNode.parentElement || addedNode.parentNode;
          if (anchor && isExcludedElement(anchor, OVERLAY_IMMEDIATE_SELECTOR)) {
            immediateNodes.push(addedNode);
          } else {
            this.queueNode(addedNode);
          }
        }
      }
    }

    if (immediateNodes.length > 0) {
      this.runWithGuard(() => {
        for (const node of immediateNodes) {
          this.translateSubtree(node);
        }
      });
    }
  }

  start() {
    if (this.enabled) {
      this.rescan();
      return;
    }
    this.enabled = true;
    this.rescan();

    const target = this.doc?.body || this.doc?.documentElement;
    const ObserverCtor = globalThis.MutationObserver;
    if (target && typeof ObserverCtor === 'function') {
      this.observer = new ObserverCtor((mutations) => this.handleMutations(mutations));
      this.observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
      });

      const titleEl = typeof this.doc?.querySelector === 'function' ? this.doc.querySelector('title') : null;
      if (titleEl) {
        this.titleObserver = new ObserverCtor(() => {
          if (this.enabled && !this.isApplying) {
            this.runWithGuard(() => this.translateDocumentTitle());
          }
        });
        this.titleObserver.observe(titleEl, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
    }
  }

  stop() {
    this.enabled = false;
    this.pendingNodes.clear();
    this.flushScheduled = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.titleObserver) {
      this.titleObserver.disconnect();
      this.titleObserver = null;
    }
    this.restoreAll();
  }
}
