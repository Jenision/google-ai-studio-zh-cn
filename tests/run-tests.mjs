import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import {
  DICTIONARY_MODULES,
  EXACT_DICT,
  REGEX_PATTERNS,
  translateText,
} from '../src/dictionaries/index.js';
import { AutoTranslator } from '../src/core/auto-translator.js';
import { TranslatorEngine } from '../src/core/translator.js';
import { UntranslatedScanner } from '../src/core/scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_FILE = path.join(ROOT_DIR, 'dist', 'google-ai-studio-zh-cn.user.js');

// --- Minimal Mock DOM for Engine & Scanner Tests ---
class MockNode {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentNode = null;
    this.parentElement = null;
    this.childNodes = [];
  }
}

class MockText extends MockNode {
  constructor(value) {
    super(3);
    this.nodeValue = value;
  }
}

class MockClassList {
  constructor(el) {
    this.el = el;
    this.set = new Set();
  }
  add(...names) {
    for (const n of names) {
      this.set.add(n);
    }
    this.sync();
  }
  remove(...names) {
    for (const n of names) {
      this.set.delete(n);
    }
    this.sync();
  }
  toggle(name, force) {
    if (force === true) {
      this.set.add(name);
    } else if (force === false) {
      this.set.delete(name);
    } else if (this.set.has(name)) {
      this.set.delete(name);
    } else {
      this.set.add(name);
    }
    this.sync();
  }
  contains(name) {
    return this.set.has(name);
  }
  sync() {
    this.el._attrs.set('class', Array.from(this.set).join(' '));
  }
}

function matchSimpleSelector(el, selector) {
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
  const tag = el.tagName.toLowerCase();
  const id = el.id;
  const classAttr = el.getAttribute('class') || '';
  const classes = classAttr.split(/\s+/).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('#')) {
      if (id === part.slice(1)) return true;
    } else if (part.startsWith('.')) {
      if (classes.includes(part.slice(1))) return true;
    } else if (part === '[contenteditable="true"]') {
      if (el.getAttribute('contenteditable') === 'true') return true;
    } else if (part === '[data-aistudio-zh-ignore]') {
      if (el.hasAttribute('data-aistudio-zh-ignore')) return true;
    } else if (part === '[fonticon]') {
      if (el.hasAttribute('fonticon')) return true;
    } else if (part === '[class*="material-symbols"]') {
      if (classAttr.includes('material-symbols')) return true;
    } else if (part === '[class*="material-icons"]') {
      if (classAttr.includes('material-icons')) return true;
    } else if (/^\[class\*="([^"]+)"\]$/.test(part)) {
      const needle = part.match(/^\[class\*="([^"]+)"\]$/)[1];
      if (classAttr.includes(needle)) return true;
    } else if (/^\[([a-z-]+)="([^"]+)"\]$/.test(part)) {
      const [, attrName, attrVal] = part.match(/^\[([a-z-]+)="([^"]+)"\]$/);
      if (el.getAttribute(attrName) === attrVal) return true;
    } else if (part === 'select option[data-raw]') {
      if (tag === 'option' && el.hasAttribute('data-raw') && el.parentElement?.tagName?.toLowerCase() === 'select') {
        return true;
      }
    } else if (tag === part.toLowerCase()) {
      return true;
    }
  }
  return false;
}

class MockElement extends MockNode {
  constructor(tagName, attrs = {}) {
    super(1);
    this.tagName = tagName.toUpperCase();
    this._attrs = new Map();
    this.classList = new MockClassList(this);
    this.hidden = false;
    this.shadowRoot = null;
    for (const [k, v] of Object.entries(attrs)) {
      this.setAttribute(k, v);
    }
  }
  get id() {
    return this.getAttribute('id') || '';
  }
  set id(val) {
    this.setAttribute('id', val);
  }
  hasAttribute(name) {
    return this._attrs.has(name);
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  setAttribute(name, value) {
    const str = String(value);
    this._attrs.set(name, str);
    if (name === 'class') {
      this.classList.set = new Set(str.split(/\s+/).filter(Boolean));
    }
  }
  appendChild(child) {
    child.parentNode = this;
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }
  closest(selector) {
    let cur = this;
    while (cur && cur.nodeType === 1) {
      if (matchSimpleSelector(cur, selector)) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }
}

class MockShadowRoot extends MockNode {
  constructor(host) {
    super(11);
    this.host = host;
  }
  appendChild(child) {
    child.parentNode = this;
    child.parentElement = null;
    this.childNodes.push(child);
    return child;
  }
}

function createMockDoc(title = 'Dashboard | Google AI Studio') {
  const doc = {
    nodeType: 9,
    title,
    head: new MockElement('head'),
    body: new MockElement('body'),
    documentElement: null,
    createElement(tag) {
      return new MockElement(tag);
    },
    getElementById() {
      return null;
    },
  };
  doc.documentElement = new MockElement('html');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  return doc;
}

// --- Test Suites ---
test('Dictionaries have zero duplicates, zero empty values, and broad coverage', () => {
  const seen = new Set();
  for (const [mod, dict] of Object.entries(DICTIONARY_MODULES)) {
    for (const [k, v] of Object.entries(dict)) {
      assert.ok(k.length > 0 && k === k.trim(), `Bad key in ${mod}: ${JSON.stringify(k)}`);
      assert.ok(typeof v === 'string' && v.trim().length > 0, `Bad value in ${mod} for ${k}`);
      assert.equal(seen.has(k), false, `Duplicate key ${JSON.stringify(k)} in ${mod}`);
      seen.add(k);
    }
  }
  assert.ok(EXACT_DICT.size >= 1000, `Expected >=1000 entries, got ${EXACT_DICT.size}`);
  assert.ok(REGEX_PATTERNS.length >= 38, `Expected >=38 regex patterns, got ${REGEX_PATTERNS.length}`);
});

test('translateText handles exact matches, whitespace, case-insensitivity, regex patterns, and exclusions', () => {
  assert.deepEqual(translateText('Run settings'), {
    translated: '运行设置',
    matched: true,
  });

  assert.deepEqual(translateText('  System instructions \n'), {
    translated: '  系统指令 \n',
    matched: true,
  });

  assert.deepEqual(translateText('run settings'), {
    translated: '运行设置',
    matched: true,
  });

  assert.deepEqual(translateText('1,234 / 1,048,576 tokens'), {
    translated: '1,234 / 1,048,576 Token',
    matched: true,
  });

  assert.deepEqual(translateText('Thought for 12.5 seconds'), {
    translated: '已思考 12.5 秒',
    matched: true,
  });

  assert.deepEqual(translateText('3 hours ago'), {
    translated: '3 小时前',
    matched: true,
  });

  assert.deepEqual(translateText('Knowledge cutoff: Mar 2025'), {
    translated: '知识截止日期：2025 年 3 月',
    matched: true,
  });

  assert.deepEqual(translateText('Showing 1 - 10 of 42'), {
    translated: '显示第 1 - 10 项，共 42 项',
    matched: true,
  });

  assert.deepEqual(translateText('Run (Ctrl+Enter)'), {
    translated: '运行 (Ctrl+Enter)',
    matched: true,
  });

  assert.deepEqual(translateText('API keys | Google AI Studio'), {
    translated: 'API 密钥 | Google AI Studio',
    matched: true,
  });

  // Real-browser screenshot optimizations
  assert.equal(translateText('EXPLORE').translated, '探索');
  assert.equal(translateText('New app').translated, '新建应用');
  assert.equal(translateText('Build with Gemini 4 Hydrogen').translated, '使用 Gemini 4 Hydrogen 开始构建');
  assert.equal(translateText('Try Gemini 4 Neon').translated, '体验 Gemini 4 Neon');
  assert.equal(
    translateText('Included with your Google AI plan').translated,
    '已包含在您的 Google AI 套餐中',
  );
  assert.equal(
    translateText('Start typing a prompt to see what our models can do').translated,
    '开始输入提示词，体验模型的强大能力',
  );
  assert.equal(translateText('Source:').translated, '来源：');
  assert.equal(translateText('Add stop...').translated, '添加停止序列...');
  assert.equal(
    translateText('Up to 1,048,576. Responses beyond 65,536 ...').translated,
    '最高支持 1,048,576。超过 65,536 的回复可能耗时更长...',
  );
  assert.equal(
    translateText('Up to 1,048,576. Responses beyond 65,536 tokens may take longer to generate.').translated,
    '最高支持 1,048,576。超过 65,536 Token 的回复可能需要更长时间生成。',
  );
  assert.equal(translateText('Edit structured output').translated, '编辑结构化输出');
  assert.equal(
    translateText('Remove Grounding with Google Search').translated,
    '移除 Google 搜索联网增强',
  );
  assert.equal(translateText('Collapse Tools').translated, '收起工具');
  assert.equal(translateText('Toggle navigation menu').translated, '切换导航菜单');
  assert.equal(
    translateText(
      'An efficient model with cutting-edge intelligence for fast, dependable execution across coding, agentic workflows, and multimodal knowledge...',
    ).translated,
    '高效且具备前沿智能的模型，可在编程、智能体工作流和多模态知识任务中实现快速、可靠的执行。',
  );

  // 6-screenshot coverage: model selector, thinking Extra High, tooltips, system instructions, library, more menu
  assert.equal(translateText('Model selection').translated, '选择模型');
  assert.equal(translateText('Search for a model or agent').translated, '搜索模型或智能体');
  assert.equal(translateText('Music').translated, '音乐');
  assert.equal(translateText('Agents').translated, '智能体');
  assert.equal(translateText('Selected model').translated, '已选模型');
  assert.equal(translateText('New').translated, '全新');
  assert.equal(translateText('Release date: 9月 17, 2026').translated, '发布日期：2026 年 9 月 17 日');
  assert.equal(translateText('Release date: 4月 21, 2026').translated, '发布日期：2026 年 4 月 21 日');
  assert.equal(translateText('Release date: Sep 17, 2026').translated, '发布日期：2026 年 9 月 17 日');
  assert.equal(
    translateText('Pricing is based on the configured model.').translated,
    '定价基于所配置的底层模型。',
  );
  assert.equal(
    translateText(
      'This model uses Gemini 3.1 Pro and Gemini 3 Flash pricing. Developers may see both items on their bill.',
    ).translated,
    '此模型按 Gemini 3.1 Pro 与 Gemini 3 Flash 计费，开发者账单中可能会同时显示这两项费用。',
  );
  assert.equal(
    translateText(
      'A general-purpose autonomous agent running in a remote, Google-hosted Linux environment.',
    ).translated,
    '运行在 Google 托管远程 Linux 环境中的通用自主智能体。',
  );
  assert.equal(
    translateText(
      'Our agent for long-running context gathering & synthesis tasks, optimized for speed and efficiency.',
    ).translated,
    '面向长时间上下文搜集与综合分析任务的智能体，针对速度与效率进行了优化。',
  );
  assert.equal(
    translateText(
      'Our SOTA agent for long-running context gathering & synthesis tasks, optimized for maximum search exhaustiveness and report comprehensiveness.',
    ).translated,
    '面向长时间上下文搜集与综合分析任务的前沿智能体，针对最大化检索完备度与报告全面性进行了优化。',
  );
  assert.equal(translateText('Extra High').translated, '极高');
  assert.equal(
    translateText('Higher resolutions may provide better understanding but use more tokens.').translated,
    '更高的分辨率有助于提升模型理解效果，但会消耗更多 Token。',
  );
  assert.equal(translateText('+ Create new instruction').translated, '+ 创建新指令');
  assert.equal(
    translateText('Instructions are saved in local storage.').translated,
    '系统指令保存在浏览器本地存储中。',
  );
  assert.equal(translateText('My files').translated, '我的文件');
  assert.equal(translateText('No prompts yet').translated, '暂无提示词');
  assert.equal(translateText("You don't have any prompts yet.").translated, '您还没有任何提示词。');
  assert.equal(translateText('+ New chat prompt').translated, '+ 新建对话提示词');
  assert.equal(translateText('No changes to save').translated, '没有需要保存的更改');
  assert.equal(translateText('Copy as Markdown').translated, '复制为 Markdown');
  assert.equal(translateText('Raw Mode').translated, '原始模式');

  // Command Palette & slash shortcuts (Ctrl + /)
  assert.equal(
    translateText('Start a chat or vibe code an app').translated,
    '开始对话或用 AI 编程构建应用',
  );
  assert.equal(translateText('Vibe code an app').translated, '用 AI 编程构建应用');
  assert.equal(translateText('Start a chat with a model').translated, '与模型开始对话');
  assert.equal(
    translateText('Search the Gemini API documentation').translated,
    '搜索 Gemini API 开发文档',
  );
  assert.equal(translateText('Create an API key').translated, '创建 API 密钥');
  assert.equal(translateText('View keyboard shortcuts').translated, '查看快捷键');

  // Idempotency checks (already-translated mixed strings must NOT re-match)
  assert.equal(translateText('API 密钥 | Google AI Studio').matched, false);
  assert.equal(translateText('1,234 Token').matched, false);
  assert.equal(translateText('发布日期：2026 年 9 月 17 日').matched, false);

  // Passthrough checks (must NOT match arbitrary user phrases)
  assert.equal(translateText('Edit my secret resume').matched, false);
  assert.equal(translateText('已经是中文').matched, false);
  assert.equal(translateText('https://aistudio.google.com/').matched, false);
  assert.equal(translateText('dev@example.com').matched, false);
  assert.equal(translateText('12345').matched, false);
  assert.equal(translateText('x'.repeat(300)).matched, false);
});

test('TranslatorEngine translates UI nodes/attributes in-place, protects icons/code/markdown, and restores cleanly', () => {
  const doc = createMockDoc('API keys | Google AI Studio');

  const navBtn = new MockElement('button', { 'aria-label': 'Collapse sidebar', title: 'Settings' });
  const navText = new MockText('Run settings');
  navBtn.appendChild(navText);

  const iconEl = new MockElement('mat-icon');
  const iconLigature = new MockText('settings');
  iconEl.appendChild(iconLigature);

  const symbolEl = new MockElement('span', { class: 'material-symbols-outlined' });
  const symbolText = new MockText('search');
  symbolEl.appendChild(symbolText);

  const codeEl = new MockElement('code');
  const codeText = new MockText('Run settings');
  codeEl.appendChild(codeText);

  const chatMd = new MockElement('ms-cmark-node');
  const chatText = new MockText('System instructions');
  chatMd.appendChild(chatText);

  const textarea = new MockElement('textarea', { placeholder: 'Type something or tab to choose an example' });
  const textareaBody = new MockText('System instructions');
  textarea.appendChild(textareaBody);

  const shadowHost = new MockElement('div');
  shadowHost.shadowRoot = new MockShadowRoot(shadowHost);
  const shadowSpan = new MockElement('span');
  const shadowText = new MockText('Thinking budget');
  shadowSpan.appendChild(shadowText);
  shadowHost.shadowRoot.appendChild(shadowSpan);

  doc.body.appendChild(navBtn);
  doc.body.appendChild(iconEl);
  doc.body.appendChild(symbolEl);
  doc.body.appendChild(codeEl);
  doc.body.appendChild(chatMd);
  doc.body.appendChild(textarea);
  doc.body.appendChild(shadowHost);

  const engine = new TranslatorEngine({ doc });
  engine.start();

  assert.equal(doc.title, 'API 密钥 | Google AI Studio');
  assert.equal(navText.nodeValue, '运行设置');
  assert.equal(navBtn.getAttribute('aria-label'), '收起侧边栏');
  assert.equal(navBtn.getAttribute('title'), '设置');
  assert.equal(textarea.getAttribute('placeholder'), '输入内容，或按 Tab 键选择示例');
  assert.equal(shadowText.nodeValue, '思考预算');

  // Protected regions must remain untouched
  assert.equal(iconLigature.nodeValue, 'settings');
  assert.equal(symbolText.nodeValue, 'search');
  assert.equal(codeText.nodeValue, 'Run settings');
  assert.equal(chatText.nodeValue, 'System instructions');
  assert.equal(textareaBody.nodeValue, 'System instructions');

  // Simulate Angular re-rendering text back to another English key
  navText.nodeValue = 'Create prompt';
  engine.rescan();
  assert.equal(navText.nodeValue, '创建提示词');

  // Stopping restores original text and attributes
  engine.stop();
  assert.equal(doc.title, 'API keys | Google AI Studio');
  assert.equal(navText.nodeValue, 'Create prompt');
  assert.equal(navBtn.getAttribute('aria-label'), 'Collapse sidebar');
  assert.equal(navBtn.getAttribute('title'), 'Settings');
  assert.equal(textarea.getAttribute('placeholder'), 'Type something or tab to choose an example');
  assert.equal(shadowText.nodeValue, 'Thinking budget');
});

test('UntranslatedScanner collects only untranslated UI strings and ignores excluded areas and model IDs', () => {
  const doc = createMockDoc();

  const b1 = new MockElement('button');
  b1.appendChild(new MockText('Run settings')); // already in dict -> skip

  const b2 = new MockElement('button', { title: 'Export workflow' });
  b2.appendChild(new MockText('Beta feature toggle'));

  const b3 = new MockElement('span');
  b3.appendChild(new MockText('Beta feature toggle'));

  const modelChip = new MockElement('span');
  modelChip.appendChild(new MockText('gemini-2.5-pro-preview-05-06'));

  const brandHeader = new MockElement('span');
  brandHeader.appendChild(new MockText('Google AI Studio'));

  const modelDisplay = new MockElement('span');
  modelDisplay.appendChild(new MockText('Gemini 4 Hydrogen'));

  const modelPromo = new MockElement('span');
  modelPromo.appendChild(new MockText('Gemini 4 Neon'));

  const shortcutChip = new MockElement('kbd');
  shortcutChip.appendChild(new MockText('Ctrl+Enter'));

  const slashCmd = new MockElement('span');
  slashCmd.appendChild(new MockText('/build'));

  const slashCmdShortcuts = new MockElement('span');
  slashCmdShortcuts.appendChild(new MockText('/shortcuts'));

  const hiddenEl = new MockElement('div');
  hiddenEl.hidden = true;
  hiddenEl.appendChild(new MockText('Hidden untranslated label'));

  const icon = new MockElement('mat-icon');
  icon.appendChild(new MockText('untranslated_icon_name'));

  doc.body.appendChild(b1);
  doc.body.appendChild(b2);
  doc.body.appendChild(b3);
  doc.body.appendChild(modelChip);
  doc.body.appendChild(brandHeader);
  doc.body.appendChild(modelDisplay);
  doc.body.appendChild(modelPromo);
  doc.body.appendChild(shortcutChip);
  doc.body.appendChild(slashCmd);
  doc.body.appendChild(slashCmdShortcuts);
  doc.body.appendChild(hiddenEl);
  doc.body.appendChild(icon);

  const engine = new TranslatorEngine({ doc });
  engine.start();
  const scanner = new UntranslatedScanner({ doc, engine });
  const results = scanner.collect();

  assert.equal(results.length, 2);
  assert.equal(results[0].text, 'Beta feature toggle');
  assert.equal(results[0].count, 2);
  assert.deepEqual(results[0].sources, ['text']);
  assert.equal(results[1].text, 'Export workflow');
  assert.equal(results[1].count, 1);
  assert.deepEqual(results[1].sources, ['title']);
});

test('AutoTranslator translates unseen model descriptions and hover tooltips with caching while blocking chat/editor content', async () => {
  const store = new Map();
  let requests = 0;

  const autoTranslator = new AutoTranslator({
    getValue: (k, def) => (store.has(k) ? store.get(k) : def),
    setValue: (k, v) => store.set(k, v),
    requester: ({ url, onload }) => {
      requests += 1;
      const q = decodeURIComponent(new URL(url).searchParams.get('q'));
      const map = {
        'A brand new experimental model tuned for creative storytelling and dialogue.':
          '专为创意故事与对话调优的全新实验性模型。',
        'Enable experimental streaming compression to reduce latency.':
          '启用实验性流式压缩以降低延迟。',
      };
      const zh = map[q] || '模拟翻译结果';
      setTimeout(() => {
        onload({
          status: 200,
          responseText: JSON.stringify([[[zh, q]]]),
        });
      }, 0);
    },
  });

  const doc = createMockDoc();

  const modelCard = new MockElement('div', { class: 'model-card' });
  const modelDesc = new MockText(
    'A brand new experimental model tuned for creative storytelling and dialogue.',
  );
  modelCard.appendChild(modelDesc);

  const tooltip = new MockElement('mat-tooltip-component', { role: 'tooltip' });
  const tooltipText = new MockText('Enable experimental streaming compression to reduce latency.');
  tooltip.appendChild(tooltipText);

  const chatTurn = new MockElement('ms-chat-turn');
  const chatTurnText = new MockText(
    'This user message inside a chat turn should never be sent for auto translation.',
  );
  chatTurn.appendChild(chatTurnText);

  doc.body.appendChild(modelCard);
  doc.body.appendChild(tooltip);
  doc.body.appendChild(chatTurn);

  const engine = new TranslatorEngine({ doc, autoTranslator });
  engine.start();

  await new Promise((r) => setTimeout(r, 30));

  assert.equal(modelDesc.nodeValue, '专为创意故事与对话调优的全新实验性模型。');
  assert.equal(tooltipText.nodeValue, '启用实验性流式压缩以降低延迟。');
  assert.equal(
    chatTurnText.nodeValue,
    'This user message inside a chat turn should never be sent for auto translation.',
  );
  assert.equal(requests, 2);

  // Stop restores original English text, and restart uses cache with zero extra requests
  engine.stop();
  assert.equal(
    modelDesc.nodeValue,
    'A brand new experimental model tuned for creative storytelling and dialogue.',
  );
  assert.equal(tooltipText.nodeValue, 'Enable experimental streaming compression to reduce latency.');

  engine.start();
  assert.equal(modelDesc.nodeValue, '专为创意故事与对话调优的全新实验性模型。');
  assert.equal(tooltipText.nodeValue, '启用实验性流式压缩以降低延迟。');
  assert.equal(requests, 2);
});

test('Built userscript bundle parses and executes cleanly in a VM sandbox', () => {
  assert.ok(fs.existsSync(DIST_FILE), `Missing built bundle: ${DIST_FILE}`);
  const code = fs.readFileSync(DIST_FILE, 'utf8');

  assert.match(code, /==UserScript==/);
  assert.match(code, /@version\s+1\.0\.0/);
  assert.match(code, /@match\s+https:\/\/aistudio\.google\.com\/\*/);
  assert.match(code, /@grant\s+GM_xmlhttpRequest/);
  assert.match(code, /@connect\s+translate\.googleapis\.com/);

  // Verify zero syntax errors
  const script = new vm.Script(code, { filename: 'google-ai-studio-zh-cn.user.js' });

  const mockDoc = createMockDoc('Dashboard | Google AI Studio');
  const titleText = new MockText('Run settings');
  const btn = new MockElement('button');
  btn.appendChild(titleText);
  mockDoc.body.appendChild(btn);

  const registeredMenus = [];
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    URL,
    Blob,
    document: mockDoc,
    history: {
      pushState() {},
      replaceState() {},
    },
    addEventListener() {},
    GM_getValue: (_k, def) => def,
    GM_setValue: () => {},
    GM_registerMenuCommand: (label, fn) => {
      registeredMenus.push({ label, fn });
      return registeredMenus.length;
    },
    GM_unregisterMenuCommand: () => {},
    GM_setClipboard: () => {},
    GM_xmlhttpRequest: () => {},
  });
  context.globalThis = context;

  script.runInContext(context);

  assert.equal(mockDoc.title, '仪表盘 | Google AI Studio');
  assert.equal(titleText.nodeValue, '运行设置');
  assert.equal(registeredMenus.length, 6);
  assert.ok(context.__AIStudioZH, 'Expected __AIStudioZH debug hook to be exposed');
  assert.ok(context.__AIStudioZH.autoTranslator, 'Expected autoTranslator to be exposed');

  // Toggle OFF via menu command and verify restoration
  registeredMenus[0].fn();
  assert.equal(titleText.nodeValue, 'Run settings');
  assert.equal(mockDoc.title, 'Dashboard | Google AI Studio');
});
