import {
  EXCLUDE_ATTR_SELECTOR,
  EXCLUDE_TEXT_SELECTOR,
  HIGHLIGHT_CLASS,
  HIGHLIGHT_STYLE_ID,
  NODE_TYPE_DOCUMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_FRAGMENT,
  NODE_TYPE_TEXT,
  SCANNER_HOST_ID,
  TRANSLATABLE_ATTRS,
  isExcludedElement,
} from '../config.js';
import { isIdentityTerm, shouldAttemptTranslate, translateText } from '../dictionaries/index.js';

const MAX_SCANNER_TEXT_LENGTH = 180;
const MODEL_OR_CODE_TOKEN_RE =
  /^(?:gemini|gemma|imagen|veo|lyria|learnlm|text-embedding|models\/)[a-z0-9._/-]*$/i;
const MODEL_DISPLAY_NAME_RE =
  /^(?:Gemini|Gemma|Imagen|Veo|Lyria|LearnLM)\s+\d[\w.\s-]*$/i;
const SHORTCUT_KEY_RE =
  /^(?:(?:Ctrl|Cmd|Alt|Shift|Meta|Option|⌘|⌥|⌃|⇧)\s*\+\s*)+(?:[A-Za-z0-9]|Enter|Tab|Esc|Space|Up|Down|Left|Right|Backspace)$/i;
const COMPACT_SHORTCUT_RE = /^(?:⌘|⌥|⌃|⇧)+[A-Za-z0-9↵⏎↩]$/i;
const SLASH_CMD_RE = /^\/[a-z][a-z0-9_-]*$/i;
const VERSION_OR_UNIT_RE = /^(?:v?\d+(?:\.\d+)+(?:-[a-z0-9]+)?|\d+\s*(?:px|em|rem|ms|s|kb|mb|gb|tb|hz|fps))$/i;

function isElementVisible(el) {
  if (!el || el.nodeType !== NODE_TYPE_ELEMENT) {
    return false;
  }
  if (el.hidden) {
    return false;
  }
  if (typeof el.getAttribute === 'function' && el.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  if (typeof globalThis.getComputedStyle === 'function') {
    try {
      const style = globalThis.getComputedStyle(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) {
        return false;
      }
    } catch {
      // Ignore synthetic elements in tests
    }
  }
  return true;
}

function isCandidateString(trimmed) {
  if (!trimmed || trimmed.length < 2 || trimmed.length > MAX_SCANNER_TEXT_LENGTH) {
    return false;
  }
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return false;
  }
  if (!shouldAttemptTranslate(trimmed)) {
    return false;
  }
  if (
    isIdentityTerm(trimmed) ||
    MODEL_OR_CODE_TOKEN_RE.test(trimmed) ||
    MODEL_DISPLAY_NAME_RE.test(trimmed) ||
    SHORTCUT_KEY_RE.test(trimmed) ||
    COMPACT_SHORTCUT_RE.test(trimmed) ||
    SLASH_CMD_RE.test(trimmed) ||
    VERSION_OR_UNIT_RE.test(trimmed)
  ) {
    return false;
  }
  if (translateText(trimmed).matched) {
    return false;
  }
  return true;
}

function copyTextSafe(text) {
  if (typeof globalThis.GM_setClipboard === 'function') {
    globalThis.GM_setClipboard(text, 'text');
    return true;
  }
  if (globalThis.navigator?.clipboard?.writeText) {
    globalThis.navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return false;
}

const SOURCE_LABELS = {
  text: '文本',
  placeholder: '占位符',
  title: '提示',
  'aria-label': '无障碍标签',
};

export class UntranslatedScanner {
  constructor(options = {}) {
    this.doc = options.doc || globalThis.document;
    this.engine = options.engine || null;
    this.highlighted = false;
    this.highlightedElements = new Set();
    this.escHandler = null;
  }

  collect(root) {
    const target = root || this.doc?.body || this.doc?.documentElement;
    if (!target) {
      return [];
    }

    const bucket = new Map();

    const recordHit = (rawText, source, el) => {
      const trimmed = rawText.replace(/\s+/g, ' ').trim();
      if (!isCandidateString(trimmed)) {
        return;
      }
      let entry = bucket.get(trimmed);
      if (!entry) {
        entry = {
          text: trimmed,
          count: 0,
          sources: new Set(),
          elements: new Set(),
        };
        bucket.set(trimmed, entry);
      }
      entry.count += 1;
      entry.sources.add(source);
      if (el) {
        entry.elements.add(el);
      }
    };

    const walk = (node) => {
      if (!node) {
        return;
      }

      if (node.nodeType === NODE_TYPE_TEXT) {
        const parent = node.parentElement || node.parentNode;
        if (
          parent &&
          parent.nodeType === NODE_TYPE_ELEMENT &&
          !isExcludedElement(parent, EXCLUDE_TEXT_SELECTOR) &&
          isElementVisible(parent) &&
          !this.engine?.isTranslatedTextNode(node)
        ) {
          recordHit(node.nodeValue || '', 'text', parent);
        }
        return;
      }

      if (node.nodeType === NODE_TYPE_ELEMENT) {
        if (node.id === SCANNER_HOST_ID) {
          return;
        }
        if (!isElementVisible(node)) {
          return;
        }

        if (!isExcludedElement(node, EXCLUDE_ATTR_SELECTOR)) {
          for (const attr of TRANSLATABLE_ATTRS) {
            if (typeof node.hasAttribute === 'function' && !node.hasAttribute(attr)) {
              continue;
            }
            const val = typeof node.getAttribute === 'function' ? node.getAttribute(attr) : null;
            if (val && !this.engine?.isTranslatedAttribute(node, attr)) {
              recordHit(val, attr, node);
            }
          }
        }

        const skipChildrenText = isExcludedElement(node, EXCLUDE_TEXT_SELECTOR);
        const children = node.childNodes || [];
        for (let i = 0; i < children.length; i += 1) {
          const child = children[i];
          if (child.nodeType === NODE_TYPE_TEXT) {
            if (!skipChildrenText) {
              walk(child);
            }
          } else {
            walk(child);
          }
        }

        if (node.shadowRoot) {
          walk(node.shadowRoot);
        }
        return;
      }

      if (node.nodeType === NODE_TYPE_DOCUMENT || node.nodeType === NODE_TYPE_FRAGMENT) {
        const children = node.childNodes || [];
        for (let i = 0; i < children.length; i += 1) {
          walk(children[i]);
        }
      }
    };

    walk(target);

    return Array.from(bucket.values())
      .map((item) => ({
        text: item.text,
        count: item.count,
        sources: Array.from(item.sources),
        elements: Array.from(item.elements),
      }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
  }

  buildJsonTemplate(items) {
    const obj = {};
    for (const item of items) {
      obj[item.text] = '';
    }
    return JSON.stringify(obj, null, 2);
  }

  ensureHighlightStyle() {
    if (!this.doc || this.doc.getElementById?.(HIGHLIGHT_STYLE_ID)) {
      return;
    }
    const style = this.doc.createElement('style');
    style.id = HIGHLIGHT_STYLE_ID;
    style.textContent = `.${HIGHLIGHT_CLASS} { outline: 2px dashed #f59e0b !important; outline-offset: 2px !important; }`;
    (this.doc.head || this.doc.documentElement)?.appendChild(style);
  }

  clearHighlights() {
    for (const el of this.highlightedElements) {
      el.classList?.remove(HIGHLIGHT_CLASS);
    }
    this.highlightedElements.clear();
    this.highlighted = false;
  }

  toggleHighlight(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !this.highlighted;
    this.clearHighlights();
    if (!nextState) {
      return false;
    }

    this.ensureHighlightStyle();
    const items = this.collect();
    for (const item of items) {
      for (const el of item.elements) {
        el.classList?.add(HIGHLIGHT_CLASS);
        this.highlightedElements.add(el);
      }
    }
    this.highlighted = true;
    return true;
  }

  closeModal() {
    if (this.escHandler && typeof this.doc?.removeEventListener === 'function') {
      this.doc.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
    const existing = this.doc?.getElementById?.(SCANNER_HOST_ID);
    if (existing) {
      existing.remove();
    }
  }

  openModal() {
    if (!this.doc?.body) {
      return;
    }
    this.closeModal();

    const host = this.doc.createElement('div');
    host.id = SCANNER_HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = this.doc.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.58);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .panel {
        width: min(860px, 100%);
        max-height: 85vh;
        background: #111827;
        color: #f3f4f6;
        border: 1px solid #374151;
        border-radius: 12px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid #1f2937;
      }
      .title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }
      .summary {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 2px;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 18px;
        border-bottom: 1px solid #1f2937;
        background: #0f172a;
      }
      .search {
        flex: 1 1 200px;
        min-width: 160px;
        padding: 7px 10px;
        border-radius: 6px;
        border: 1px solid #374151;
        background: #1f2937;
        color: #f9fafb;
        font-size: 13px;
        outline: none;
      }
      .search:focus {
        border-color: #60a5fa;
      }
      .btn {
        padding: 7px 12px;
        border-radius: 6px;
        border: 1px solid #374151;
        background: #1f2937;
        color: #f3f4f6;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn:hover {
        background: #374151;
      }
      .btn.primary {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
      }
      .btn.primary:hover {
        background: #1d4ed8;
      }
      .btn.active {
        background: #d97706;
        border-color: #d97706;
        color: #ffffff;
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 18px 16px;
      }
      .empty {
        text-align: center;
        color: #9ca3af;
        padding: 40px 12px;
        font-size: 13px;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-bottom: 1px solid #1f2937;
        font-size: 13px;
      }
      .row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .text {
        word-break: break-word;
        color: #e5e7eb;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .badge {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #1e293b;
        color: #93c5fd;
        border: 1px solid #334155;
      }
      .count {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #374151;
        color: #f9fafb;
      }
      .status {
        font-size: 12px;
        color: #34d399;
        padding: 0 18px 10px;
        min-height: 16px;
      }
    `;

    const backdrop = this.doc.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeModal();
      }
    });

    const panel = this.doc.createElement('div');
    panel.className = 'panel';

    const header = this.doc.createElement('div');
    header.className = 'header';
    const titleWrap = this.doc.createElement('div');
    const title = this.doc.createElement('h2');
    title.className = 'title';
    title.textContent = '未汉化词条扫描器';
    const summary = this.doc.createElement('div');
    summary.className = 'summary';
    titleWrap.appendChild(title);
    titleWrap.appendChild(summary);

    const closeBtn = this.doc.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', () => this.closeModal());

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const toolbar = this.doc.createElement('div');
    toolbar.className = 'toolbar';

    const searchInput = this.doc.createElement('input');
    searchInput.className = 'search';
    searchInput.type = 'text';
    searchInput.placeholder = '过滤词条（支持英文关键字）...';

    const rescanBtn = this.doc.createElement('button');
    rescanBtn.className = 'btn';
    rescanBtn.textContent = '重新扫描';

    const highlightBtn = this.doc.createElement('button');
    highlightBtn.className = 'btn';

    const copyBtn = this.doc.createElement('button');
    copyBtn.className = 'btn primary';
    copyBtn.textContent = '复制 JSON 模板';

    const downloadBtn = this.doc.createElement('button');
    downloadBtn.className = 'btn';
    downloadBtn.textContent = '下载 JSON';

    const visibleOnlyLabel = this.doc.createElement('label');
    visibleOnlyLabel.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#d1d5db;cursor:pointer;padding:0 4px;';
    const visibleOnlyCheckbox = this.doc.createElement('input');
    visibleOnlyCheckbox.type = 'checkbox';
    const visibleOnlyText = this.doc.createElement('span');
    visibleOnlyText.textContent = '仅显示可见文本（隐藏无障碍标签）';
    visibleOnlyLabel.appendChild(visibleOnlyCheckbox);
    visibleOnlyLabel.appendChild(visibleOnlyText);

    toolbar.appendChild(searchInput);
    toolbar.appendChild(visibleOnlyLabel);
    toolbar.appendChild(rescanBtn);
    toolbar.appendChild(highlightBtn);
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(downloadBtn);

    const statusBar = this.doc.createElement('div');
    statusBar.className = 'status';

    const list = this.doc.createElement('div');
    list.className = 'list';

    panel.appendChild(header);
    panel.appendChild(toolbar);
    panel.appendChild(list);
    panel.appendChild(statusBar);
    backdrop.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(backdrop);

    let items = [];
    const setStatus = (msg) => {
      statusBar.textContent = msg;
    };

    const syncHighlightButton = () => {
      highlightBtn.textContent = this.highlighted ? '取消高亮页面元素' : '高亮页面元素';
      highlightBtn.classList.toggle('active', this.highlighted);
    };

    const getVisibleFilteredItems = () => {
      const q = searchInput.value.trim().toLowerCase();
      const visibleOnly = visibleOnlyCheckbox.checked;
      return items.filter((item) => {
        if (visibleOnly && !item.sources.some((s) => s === 'text' || s === 'placeholder')) {
          return false;
        }
        if (q && !item.text.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
    };

    const renderList = () => {
      const filtered = getVisibleFilteredItems();

      const totalOccurrences = filtered.reduce((acc, item) => acc + item.count, 0);
      summary.textContent = `当前发现 ${filtered.length} 个未汉化词条（共出现 ${totalOccurrences} 次）`;

      while (list.firstChild) {
        list.removeChild(list.firstChild);
      }

      if (filtered.length === 0) {
        const empty = this.doc.createElement('div');
        empty.className = 'empty';
        empty.textContent = items.length === 0
          ? '当前视图下未检测到可汉化的英文词条 🎉'
          : '没有匹配当前搜索条件的词条';
        list.appendChild(empty);
        return;
      }

      for (const item of filtered) {
        const row = this.doc.createElement('div');
        row.className = 'row';

        const textEl = this.doc.createElement('div');
        textEl.className = 'text';
        textEl.textContent = item.text;

        const meta = this.doc.createElement('div');
        meta.className = 'meta';

        for (const src of item.sources) {
          const badge = this.doc.createElement('span');
          badge.className = 'badge';
          badge.textContent = SOURCE_LABELS[src] || src;
          meta.appendChild(badge);
        }

        const countBadge = this.doc.createElement('span');
        countBadge.className = 'count';
        countBadge.textContent = `×${item.count}`;
        meta.appendChild(countBadge);

        const rowCopyBtn = this.doc.createElement('button');
        rowCopyBtn.className = 'btn';
        rowCopyBtn.textContent = '复制词条';
        rowCopyBtn.addEventListener('click', () => {
          const snippet = `${JSON.stringify(item.text)}: "",`;
          copyTextSafe(snippet);
          setStatus(`已复制词条：${snippet}`);
        });

        row.appendChild(textEl);
        row.appendChild(meta);
        row.appendChild(rowCopyBtn);
        list.appendChild(row);
      }
    };

    const runScan = () => {
      items = this.collect();
      syncHighlightButton();
      renderList();
    };

    searchInput.addEventListener('input', renderList);
    visibleOnlyCheckbox.addEventListener('change', renderList);
    rescanBtn.addEventListener('click', () => {
      runScan();
      setStatus('已完成重新扫描');
    });
    highlightBtn.addEventListener('click', () => {
      this.toggleHighlight();
      syncHighlightButton();
      setStatus(this.highlighted ? '已高亮页面中的未汉化元素' : '已取消元素高亮');
    });
    copyBtn.addEventListener('click', () => {
      const filtered = getVisibleFilteredItems();
      const json = this.buildJsonTemplate(filtered);
      copyTextSafe(json);
      setStatus(`已复制 ${filtered.length} 条未汉化词条的 JSON 模板`);
    });
    downloadBtn.addEventListener('click', () => {
      const filtered = getVisibleFilteredItems();
      const json = this.buildJsonTemplate(filtered);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = this.doc.createElement('a');
      a.href = url;
      a.download = `aistudio-untranslated-${Date.now()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('已触发 JSON 文件下载');
    });

    runScan();
    if (typeof this.doc?.addEventListener === 'function') {
      this.escHandler = (event) => {
        if (event.key === 'Escape') {
          this.closeModal();
        }
      };
      this.doc.addEventListener('keydown', this.escHandler);
    }
    this.doc.body.appendChild(host);
  }
}
