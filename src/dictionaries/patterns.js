const MONTH_MAP = {
  jan: '1',
  january: '1',
  feb: '2',
  february: '2',
  mar: '3',
  march: '3',
  apr: '4',
  april: '4',
  may: '5',
  jun: '6',
  june: '6',
  jul: '7',
  july: '7',
  aug: '8',
  august: '8',
  sep: '9',
  sept: '9',
  september: '9',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const ACTION_VERB_MAP = {
  remove: '移除',
  disable: '禁用',
  enable: '启用',
  edit: '编辑',
  toggle: '切换',
  open: '打开',
  close: '关闭',
  clear: '清空',
  reset: '重置',
  select: '选择',
  search: '搜索',
  add: '添加',
  show: '显示',
  hide: '隐藏',
  expand: '展开',
  collapse: '收起',
  copy: '复制',
  delete: '删除',
  view: '查看',
  configure: '配置',
  manage: '管理',
  start: '开始',
  stop: '停止',
};

function formatMonthYear(monthStr, yearStr) {
  const m = MONTH_MAP[monthStr.toLowerCase()];
  if (!m) {
    return `${monthStr} ${yearStr}`;
  }
  return `${yearStr} 年 ${m} 月`;
}

export const REGEX_PATTERNS = [
  // Token counters: "1,234 / 1,048,576 tokens" or "1,234 tokens"
  {
    name: 'token_ratio',
    regex: /^([\d,.]+)\s*\/\s*([\d,.]+)\s*tokens?$/i,
    replace: (_, used, total) => `${used} / ${total} Token`,
  },
  {
    name: 'token_count',
    regex: /^([\d,.]+)\s*tokens?$/i,
    replace: (_, count) => `${count} Token`,
  },
  {
    name: 'context_window_short',
    regex: /^([\d,.]+\s*[kKmMbB])\s*context$/i,
    replace: (_, size) => `${size} 上下文`,
  },

  // Thinking & execution durations
  {
    name: 'thought_for_seconds',
    regex: /^Thought for\s+([\d.]+)\s*(?:seconds?|secs?|s)$/i,
    replace: (_, n) => `已思考 ${n} 秒`,
  },
  {
    name: 'thought_for_minutes',
    regex: /^Thought for\s+([\d.]+)\s*(?:minutes?|mins?|m)$/i,
    replace: (_, n) => `已思考 ${n} 分钟`,
  },
  {
    name: 'thinking_for_seconds',
    regex: /^Thinking for\s+([\d.]+)\s*(?:seconds?|secs?|s)$/i,
    replace: (_, n) => `思考中 ${n} 秒`,
  },
  {
    name: 'ran_for_duration',
    regex: /^Ran for\s+([\d.]+)\s*(?:seconds?|secs?|s)$/i,
    replace: (_, n) => `运行耗时 ${n} 秒`,
  },
  {
    name: 'generated_in_duration',
    regex: /^Generated in\s+([\d.]+)\s*(?:seconds?|secs?|s)$/i,
    replace: (_, n) => `生成耗时 ${n} 秒`,
  },

  // Relative times
  {
    name: 'seconds_ago',
    regex: /^(\d+)\s+seconds?\s+ago$/i,
    replace: (_, n) => `${n} 秒前`,
  },
  {
    name: 'minutes_ago',
    regex: /^(\d+)\s+minutes?\s+ago$/i,
    replace: (_, n) => `${n} 分钟前`,
  },
  {
    name: 'hours_ago',
    regex: /^(\d+)\s+hours?\s+ago$/i,
    replace: (_, n) => `${n} 小时前`,
  },
  {
    name: 'days_ago',
    regex: /^(\d+)\s+days?\s+ago$/i,
    replace: (_, n) => `${n} 天前`,
  },
  {
    name: 'weeks_ago',
    regex: /^(\d+)\s+weeks?\s+ago$/i,
    replace: (_, n) => `${n} 周前`,
  },
  {
    name: 'months_ago',
    regex: /^(\d+)\s+months?\s+ago$/i,
    replace: (_, n) => `${n} 个月前`,
  },
  {
    name: 'years_ago',
    regex: /^(\d+)\s+years?\s+ago$/i,
    replace: (_, n) => `${n} 年前`,
  },

  // Prefixed metadata & timestamps
  {
    name: 'last_edited_prefix',
    regex: /^Last edited\s+(.+)$/i,
    replace: (_, rest, helpers) => `上次编辑于 ${helpers.translateFragment(rest)}`,
  },
  {
    name: 'updated_prefix',
    regex: /^Updated\s+(.+)$/i,
    replace: (_, rest, helpers) => `更新于 ${helpers.translateFragment(rest)}`,
  },
  {
    name: 'created_prefix',
    regex: /^Created\s+(.+)$/i,
    replace: (_, rest, helpers) => `创建于 ${helpers.translateFragment(rest)}`,
  },
  {
    name: 'knowledge_cutoff_month_year',
    regex: /^Knowledge cutoff:\s*([A-Za-z]+)\s+(\d{4})$/i,
    replace: (_, mon, year) => `知识截止日期：${formatMonthYear(mon, year)}`,
  },
  {
    name: 'knowledge_cutoff_generic',
    regex: /^Knowledge cutoff:\s*(.+)$/i,
    replace: (_, val) => `知识截止日期：${val}`,
  },
  {
    name: 'input_token_limit',
    regex: /^Input token limit:\s*(.+)$/i,
    replace: (_, val) => `输入 Token 上限：${val}`,
  },
  {
    name: 'output_token_limit',
    regex: /^Output token limit:\s*(.+)$/i,
    replace: (_, val) => `输出 Token 上限：${val}`,
  },

  // Selection, counts & pagination
  {
    name: 'items_selected',
    regex: /^(\d+)\s+items?\s+selected$/i,
    replace: (_, n) => `已选择 ${n} 项`,
  },
  {
    name: 'files_attached',
    regex: /^(\d+)\s+files?\s+attached$/i,
    replace: (_, n) => `已附加 ${n} 个文件`,
  },
  {
    name: 'showing_pagination',
    regex: /^Showing\s+([\d,]+)\s*[-–]\s*([\d,]+)\s+of\s+([\d,]+)$/i,
    replace: (_, start, end, total) => `显示第 ${start} - ${end} 项，共 ${total} 项`,
  },
  {
    name: 'results_count',
    regex: /^([\d,]+)\s+results?$/i,
    replace: (_, n) => `${n} 条结果`,
  },

  // Keyboard shortcut hints in labels / buttons
  {
    name: 'run_with_shortcut',
    regex: /^Run\s*\(([^)]+)\)$/i,
    replace: (_, shortcut) => `运行 (${shortcut})`,
  },
  {
    name: 'save_with_shortcut',
    regex: /^Save\s*\(([^)]+)\)$/i,
    replace: (_, shortcut) => `保存 (${shortcut})`,
  },

  // Delete confirmation prompt
  {
    name: 'confirm_delete_named',
    regex: /^Are you sure you want to delete\s+"([^"]+)"\?$/i,
    replace: (_, name) => `确定要删除“${name}”吗？`,
  },

  // Document title: "Page Name | Google AI Studio"
  {
    name: 'page_title',
    regex: /^(.+?)\s*\|\s*Google AI Studio$/i,
    replace: (_, prefix, helpers) => `${helpers.translateFragment(prefix)} | Google AI Studio`,
  },

  // Dynamic hero / promo / model callouts
  {
    name: 'build_with_model',
    regex: /^Build with\s+(.+)$/i,
    replace: (_, model) => `使用 ${model} 开始构建`,
  },
  {
    name: 'try_model',
    regex: /^Try\s+((?:Gemini|Gemma|Imagen|Veo|Lyria|LearnLM)\b.+)$/i,
    replace: (_, model) => `体验 ${model}`,
  },

  // Output length & token limit notices (full or truncated)
  {
    name: 'up_to_responses_beyond',
    regex: /^Up to\s+([\d,]+)\.\s*Responses beyond\s+([\d,]+)(?:\s*tokens?)?(.*)$/i,
    replace: (_, max, threshold, tail = '') => {
      const cleanTail = tail.trim();
      if (/longer|slow|delay/i.test(cleanTail)) {
        return `最高支持 ${max}。超过 ${threshold} Token 的回复可能需要更长时间生成。`;
      }
      if (!cleanTail || cleanTail === '...' || cleanTail === '…') {
        return `最高支持 ${max}。超过 ${threshold} 的回复可能耗时更长...`;
      }
      return `最高支持 ${max}。超过 ${threshold} 的回复 ${cleanTail}`;
    },
  },
  {
    name: 'up_to_tokens',
    regex: /^Up to\s+([\d,]+)\s*tokens?\.?$/i,
    replace: (_, max) => `最高支持 ${max} Token`,
  },
  {
    name: 'up_to_number',
    regex: /^Up to\s+([\d,]+)\.?$/i,
    replace: (_, max) => `最高支持 ${max}`,
  },

  // Source prefix: "Source: Google Search"
  {
    name: 'source_prefix',
    regex: /^Source:\s*(.+)$/i,
    replace: (_, rest, helpers) => `来源：${helpers.translateFragment(rest)}`,
  },

  // Safe verb + known UI term (for aria-label/title like "Edit structured output", "Collapse Tools")
  {
    name: 'safe_action_known_term',
    regex:
      /^(Remove|Disable|Enable|Edit|Toggle|Open|Close|Clear|Reset|Select|Search|Add|Show|Hide|Expand|Collapse|Copy|Delete|View|Configure|Manage|Start|Stop)\s+(.+)$/i,
    replace: (_, verb, target, helpers) => {
      if (!helpers.isKnownTerm(target)) {
        return null;
      }
      const verbZh = ACTION_VERB_MAP[verb.toLowerCase()];
      const targetZh = helpers.translateFragment(target);
      if (!verbZh || !targetZh) {
        return null;
      }
      const needsSpace = /^[A-Za-z0-9]/.test(targetZh);
      return needsSpace ? `${verbZh} ${targetZh}` : `${verbZh}${targetZh}`;
    },
  },

  // Carousel / slides
  {
    name: 'slide_of',
    regex: /^Slide\s+(\d+)\s+of\s+(\d+)$/i,
    replace: (_, cur, total) => `第 ${cur} / ${total} 页`,
  },
  {
    name: 'go_to_slide',
    regex: /^Go to slide\s+(\d+)$/i,
    replace: (_, num) => `跳转到第 ${num} 页`,
  },

  // Truncated / full model card description
  {
    name: 'model_desc_hydrogen_prefix',
    regex:
      /^An efficient model with cutting-edge intelligence for fast,\s*dependable execution across coding,\s*agentic workflows,\s*and multimodal knowledge.*$/i,
    replace: () =>
      '高效且具备前沿智能的模型，可在编程、智能体工作流和多模态知识任务中实现快速、可靠的执行。',
  },

  // Pricing per 1M tokens
  {
    name: 'per_million_tokens',
    regex: /^\$([\d.]+)\s*\/\s*1M\s*(input|output)?\s*tokens?$/i,
    replace: (_, price, kind) => {
      const kindZh = kind ? (kind.toLowerCase() === 'input' ? '输入' : '输出') : '';
      return `$${price} / 百万${kindZh} Token`;
    },
  },

  // Generic button label with keyboard shortcut (only when base label is a known term)
  {
    name: 'button_with_shortcut',
    regex: /^([A-Za-z][A-Za-z\s]{1,30}?)\s*\(((?:Ctrl|Cmd|Alt|Shift|Meta|Option|⌘|⌥|⌃)[^)]+)\)$/,
    replace: (_, label, shortcut, helpers) => {
      if (!helpers.isKnownTerm(label)) {
        return null;
      }
      return `${helpers.translateFragment(label)} (${shortcut})`;
    },
  },

  // Release dates (supports browser-localized Chinese month like "9月 17, 2026" and English month)
  {
    name: 'release_date_zh_month',
    regex: /^Release date:\s*(\d{1,2})月\s*(\d{1,2}),?\s*(\d{4})$/i,
    replace: (_, month, day, year) => `发布日期：${year} 年 ${month} 月 ${day} 日`,
  },
  {
    name: 'release_date_en_month',
    regex: /^Release date:\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/i,
    replace: (_, mon, day, year) => {
      const m = MONTH_MAP[mon.toLowerCase()];
      return m ? `发布日期：${year} 年 ${m} 月 ${day} 日` : `发布日期：${mon} ${day}, ${year}`;
    },
  },
  {
    name: 'release_date_generic',
    regex: /^Release date:\s*(.+)$/i,
    replace: (_, rest) => `发布日期：${rest}`,
  },

  // Dual / single model billing notices
  {
    name: 'dual_model_pricing_bill',
    regex:
      /^This model uses\s+(.+?)\s+and\s+(.+?)\s+pricing\.\s*Developers may see both items on their bill\.$/i,
    replace: (_, modelA, modelB) =>
      `此模型按 ${modelA} 与 ${modelB} 计费，开发者账单中可能会同时显示这两项费用。`,
  },
  {
    name: 'single_model_pricing_bill',
    regex: /^This model uses\s+(.+?)\s+pricing\.$/i,
    replace: (_, model) => `此模型按 ${model} 计费。`,
  },

  // Truncated / preview model descriptions
  {
    name: 'model_desc_neon_prefix',
    regex: /^Frontier-level intelligence with fast end-to-end task completion across complex.*$/i,
    replace: () => '具备前沿级智能，擅长在复杂推理、编程与智能体任务中快速完成端到端交付。',
  },

  // Plus-prefixed known UI labels (e.g. "+ New app", "+ Create new instruction", "+ New chat prompt")
  {
    name: 'plus_prefix_known',
    regex: /^\+\s+(.+)$/,
    replace: (_, rest, helpers) => {
      if (!helpers.isKnownTerm(rest)) {
        return null;
      }
      return `+ ${helpers.translateFragment(rest)}`;
    },
  },
];
