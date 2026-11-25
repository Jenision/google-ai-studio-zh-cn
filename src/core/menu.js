export class MenuController {
  constructor(options) {
    this.isEnabled = options.isEnabled;
    this.onToggle = options.onToggle;
    this.onRescan = options.onRescan;
    this.onOpenScanner = options.onOpenScanner;
    this.onToggleHighlight = options.onToggleHighlight;
    this.isAutoTranslateEnabled = options.isAutoTranslateEnabled || (() => false);
    this.onToggleAutoTranslate = options.onToggleAutoTranslate || (() => {});
    this.onClearAutoCache = options.onClearAutoCache || (() => {});
    this.registeredIds = [];
  }

  clear() {
    if (typeof globalThis.GM_unregisterMenuCommand !== 'function') {
      this.registeredIds = [];
      return;
    }
    for (const id of this.registeredIds) {
      try {
        globalThis.GM_unregisterMenuCommand(id);
      } catch {
        // Ignore managers that do not return removable IDs
      }
    }
    this.registeredIds = [];
  }

  register(label, handler) {
    if (typeof globalThis.GM_registerMenuCommand !== 'function') {
      return;
    }
    const id = globalThis.GM_registerMenuCommand(label, handler);
    if (id !== undefined && id !== null) {
      this.registeredIds.push(id);
    }
  }

  refresh() {
    this.clear();
    const enabled = Boolean(this.isEnabled());
    this.register(
      enabled ? '✅ 汉化已开启（点击暂停）' : '⏸️ 汉化已暂停（点击开启）',
      () => this.onToggle(),
    );
    this.register('🔄 立即重新扫描汉化', () => this.onRescan());
    this.register('🔍 扫描页面未汉化词条', () => this.onOpenScanner());
    this.register('🖍️ 高亮/取消高亮未汉化元素', () => this.onToggleHighlight());
    const autoOn = Boolean(this.isAutoTranslateEnabled());
    this.register(
      autoOn ? '🌐 模型简介/悬浮说明自动补译：已开启' : '🌐 模型简介/悬浮说明自动补译：已关闭',
      () => this.onToggleAutoTranslate(),
    );
    this.register('🗑️ 清空自动补译缓存', () => this.onClearAutoCache());
  }
}
