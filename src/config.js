export const STORAGE_KEYS = {
  ENABLED: 'aistudio_zh_enabled',
  AUTO_TRANSLATE: 'aistudio_zh_auto_translate',
  AUTO_CACHE: 'aistudio_zh_auto_cache_v1',
};

export const NODE_TYPE_ELEMENT = 1;
export const NODE_TYPE_TEXT = 3;
export const NODE_TYPE_DOCUMENT = 9;
export const NODE_TYPE_FRAGMENT = 11;

export function isExcludedElement(el, selector) {
  if (!el || typeof el.closest !== 'function') {
    return false;
  }
  try {
    return Boolean(el.closest(selector));
  } catch {
    return false;
  }
}

export const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'];

export const MAX_TEXT_LENGTH = 500;

export const OVERLAY_IMMEDIATE_SELECTOR = [
  '.cdk-overlay-container',
  '.cdk-overlay-pane',
  'mat-tooltip-component',
  '.mdc-tooltip',
  '.mat-mdc-tooltip',
  '[role="tooltip"]',
  '.mat-mdc-menu-panel',
  '.mat-mdc-select-panel',
  'mat-dialog-container',
  '.mat-mdc-dialog-container',
].join(', ');

export const TOOLTIP_SELECTOR = [
  'mat-tooltip-component',
  '.mdc-tooltip',
  '.mdc-tooltip__surface',
  '.mat-mdc-tooltip',
  '[role="tooltip"]',
].join(', ');

export const MODEL_DESC_CONTAINER_SELECTOR = [
  'ms-model-selector',
  'ms-model-selector-v3',
  'ms-model-card',
  'ms-run-settings',
  '[class*="model-selector"]',
  '[class*="model-card"]',
  '[class*="model-description"]',
  '[class*="model-info"]',
  '[class*="model-list"]',
  '[class*="model-option"]',
  '[class*="run-settings"]',
  'mat-dialog-container',
  '.mat-mdc-dialog-container',
  '.cdk-overlay-pane',
].join(', ');

export const AUTO_TRANSLATE_BLOCK_SELECTOR = [
  'ms-chat-turn',
  'ms-cmark-node',
  'ms-code-block',
  'ms-system-instructions',
  'ms-prompt-history',
  'ms-library',
  'textarea',
  'input',
  '[contenteditable="true"]',
  '.monaco-editor',
  '.cm-editor',
].join(', ');

export const SCANNER_HOST_ID = 'aistudio-zh-scanner-host';

export const HIGHLIGHT_CLASS = 'aistudio-zh-untranslated-highlight';

export const HIGHLIGHT_STYLE_ID = 'aistudio-zh-highlight-style';

export const EXCLUDE_TEXT_SELECTOR = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'pre',
  'code',
  'kbd',
  'var',
  'samp',
  'textarea',
  'input',
  'select option[data-raw]',
  // Material icons & Google symbols use text ligatures; translating them breaks icons.
  'mat-icon',
  '.mat-icon',
  '.material-icons',
  '.material-icons-outlined',
  '.material-icons-round',
  '.material-icons-sharp',
  '.material-symbols-outlined',
  '.material-symbols-rounded',
  '.material-symbols-sharp',
  '.google-symbols',
  '[class*="material-symbols"]',
  '[class*="material-icons"]',
  '[fonticon]',
  // Code editors & editable surfaces
  '[contenteditable="true"]',
  '.monaco-editor',
  '.cm-editor',
  '.CodeMirror',
  '.ace_editor',
  // User prompt bodies, model outputs, and rendered markdown
  'ms-cmark-node',
  'ms-code-block',
  '.cmark-node',
  '.rendered-markdown',
  '.markdown-content',
  '.code-block',
  '.user-chunk-content',
  '.model-response-text',
  '[data-aistudio-zh-ignore]',
  '#aistudio-zh-scanner-host',
].join(', ');

export const EXCLUDE_ATTR_SELECTOR = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'pre',
  'code',
  '.monaco-editor',
  '.cm-editor',
  '.CodeMirror',
  '.ace_editor',
  'ms-cmark-node',
  'ms-code-block',
  '[data-aistudio-zh-ignore]',
  '#aistudio-zh-scanner-host',
].join(', ');
