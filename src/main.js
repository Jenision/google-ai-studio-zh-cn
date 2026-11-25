import { STORAGE_KEYS } from './config.js';
import { AutoTranslator } from './core/auto-translator.js';
import { TranslatorEngine } from './core/translator.js';
import { UntranslatedScanner } from './core/scanner.js';
import { MenuController } from './core/menu.js';

function getStoredValue(key, defaultValue) {
  if (typeof globalThis.GM_getValue === 'function') {
    return globalThis.GM_getValue(key, defaultValue);
  }
  return defaultValue;
}

function setStoredValue(key, value) {
  if (typeof globalThis.GM_setValue === 'function') {
    globalThis.GM_setValue(key, value);
  }
}

function hookSpaNavigation(onNavigate) {
  const historyObj = globalThis.history;
  if (!historyObj) {
    return;
  }

  let timer = null;
  const trigger = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => onNavigate(), 150);
  };

  for (const method of ['pushState', 'replaceState']) {
    const original = historyObj[method];
    if (typeof original === 'function') {
      historyObj[method] = function wrappedHistoryMethod(...args) {
        const ret = original.apply(this, args);
        trigger();
        return ret;
      };
    }
  }

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('popstate', trigger);
  }
}

export function bootstrap() {
  let enabled = Boolean(getStoredValue(STORAGE_KEYS.ENABLED, true));
  const autoTranslator = new AutoTranslator({
    getValue: getStoredValue,
    setValue: setStoredValue,
  });
  const engine = new TranslatorEngine({ autoTranslator });
  const scanner = new UntranslatedScanner({ engine });

  const setEnabled = (next) => {
    enabled = Boolean(next);
    setStoredValue(STORAGE_KEYS.ENABLED, enabled);
    if (enabled) {
      engine.start();
    } else {
      engine.stop();
    }
    menu.refresh();
  };

  const menu = new MenuController({
    isEnabled: () => enabled,
    onToggle: () => setEnabled(!enabled),
    onRescan: () => {
      if (!enabled) {
        setEnabled(true);
      } else {
        engine.rescan();
      }
    },
    onOpenScanner: () => scanner.openModal(),
    onToggleHighlight: () => scanner.toggleHighlight(),
    isAutoTranslateEnabled: () => autoTranslator.isEnabled(),
    onToggleAutoTranslate: () => {
      autoTranslator.setEnabled(!autoTranslator.isEnabled());
      if (autoTranslator.isEnabled() && enabled) {
        engine.rescan();
      }
      menu.refresh();
    },
    onClearAutoCache: () => {
      autoTranslator.clearCache();
      if (enabled) {
        engine.stop();
        engine.start();
      }
    },
  });

  if (enabled) {
    engine.start();
  }
  menu.refresh();

  hookSpaNavigation(() => {
    if (enabled) {
      engine.rescan();
    }
  });

  globalThis.__AIStudioZH = {
    engine,
    scanner,
    autoTranslator,
    rescan: () => engine.rescan(),
    setEnabled,
  };

  return globalThis.__AIStudioZH;
}

bootstrap();
