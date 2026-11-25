// ==UserScript==
// @name         Google AI Studio 完整汉化
// @namespace    https://github.com/Jenision/google-ai-studio-zh-cn
// @version      1.0.0
// @description  Google AI Studio (aistudio.google.com) 界面完整简体中文汉化，覆盖侧边栏、对话工作区、运行设置、模型选择与简介、悬浮说明、实时流、媒体生成、Build 应用构建、API 密钥与用量仪表盘，内置菜单开关、未汉化词条扫描与智能补译。
// @author       AI Studio ZH-CN
// @license      MIT
// @match        https://aistudio.google.com/*
// @icon         https://www.gstatic.com/aistudio/ai_studio_favicon_2_32x32.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- config.js ---
  const STORAGE_KEYS = {
    ENABLED: 'aistudio_zh_enabled',
    AUTO_TRANSLATE: 'aistudio_zh_auto_translate',
    AUTO_CACHE: 'aistudio_zh_auto_cache_v1',
  };

  const NODE_TYPE_ELEMENT = 1;
  const NODE_TYPE_TEXT = 3;
  const NODE_TYPE_DOCUMENT = 9;
  const NODE_TYPE_FRAGMENT = 11;

  function isExcludedElement(el, selector) {
    if (!el || typeof el.closest !== 'function') {
      return false;
    }
    try {
      return Boolean(el.closest(selector));
    } catch {
      return false;
    }
  }

  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'];

  const MAX_TEXT_LENGTH = 500;

  const OVERLAY_IMMEDIATE_SELECTOR = [
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

  const TOOLTIP_SELECTOR = [
    'mat-tooltip-component',
    '.mdc-tooltip',
    '.mdc-tooltip__surface',
    '.mat-mdc-tooltip',
    '[role="tooltip"]',
  ].join(', ');

  const MODEL_DESC_CONTAINER_SELECTOR = [
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

  const AUTO_TRANSLATE_BLOCK_SELECTOR = [
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

  const SCANNER_HOST_ID = 'aistudio-zh-scanner-host';

  const HIGHLIGHT_CLASS = 'aistudio-zh-untranslated-highlight';

  const HIGHLIGHT_STYLE_ID = 'aistudio-zh-highlight-style';

  const EXCLUDE_TEXT_SELECTOR = [
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

  const EXCLUDE_ATTR_SELECTOR = [
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

  // --- dictionaries/common.js ---
  const COMMON_DICT = {
    // Basic actions
    'Save': '保存',
    'Save changes': '保存更改',
    'Cancel': '取消',
    'Delete': '删除',
    'Remove': '移除',
    'Edit': '编辑',
    'Update': '更新',
    'Create': '创建',
    'Add': '添加',
    'Insert': '插入',
    'Close': '关闭',
    'Done': '完成',
    'Apply': '应用',
    'Confirm': '确认',
    'Continue': '继续',
    'Proceed': '继续',
    'Back': '返回',
    'Next': '下一步',
    'Previous': '上一步',
    'Skip': '跳过',
    'Finish': '完成',
    'Submit': '提交',
    'Send': '发送',
    'Copy': '复制',
    'Copy link': '复制链接',
    'Copied': '已复制',
    'Copied!': '已复制！',
    'Copied to clipboard': '已复制到剪贴板',
    'Share': '分享',
    'Export': '导出',
    'Import': '导入',
    'Download': '下载',
    'Upload': '上传',
    'Open': '打开',
    'Open in new tab': '在新标签页中打开',
    'Rename': '重命名',
    'Duplicate': '创建副本',
    'Make a copy': '创建副本',
    'Undo': '撤销',
    'Redo': '重做',
    'Select': '选择',
    'Select all': '全选',
    'Deselect all': '取消全选',
    'Clear': '清空',
    'Clear all': '全部清空',
    'Reset': '重置',
    'Refresh': '刷新',
    'Reload': '重新加载',
    'Retry': '重试',
    'Try again': '再试一次',
    'Search': '搜索',
    'Filter': '筛选',
    'Sort': '排序',
    'Sort by': '排序方式',
    'Group by': '分组方式',
    'View': '查看',
    'View all': '查看全部',
    'View details': '查看详情',
    'Details': '详情',
    'Show more': '显示更多',
    'Show less': '收起',
    'See more': '查看更多',
    'See all': '查看全部',
    'Expand': '展开',
    'Expand all': '全部展开',
    'Collapse': '收起',
    'Collapse all': '全部收起',
    'More': '更多',
    'More options': '更多选项',
    'More actions': '更多操作',
    'Actions': '操作',
    'Options': '选项',
    'Settings': '设置',
    'Preferences': '偏好设置',
    'Help': '帮助',
    'Feedback': '反馈',
    'Learn more': '了解更多',
    'Read more': '阅读更多',
    'Get started': '开始使用',
    'Start': '开始',
    'Stop': '停止',
    'Pause': '暂停',
    'Resume': '继续',
    'Enable': '启用',
    'Disable': '禁用',
    'Manage': '管理',
    'Configure': '配置',
    'Test': '测试',
    'Verify': '验证',
    'Preview': '预览',
    'Inspect': '检查',
    'Compare': '对比',
    'Replace': '替换',
    'Restore': '恢复',
    'Discard': '放弃',
    'Discard changes': '放弃更改',
    'Keep editing': '继续编辑',
    'Leave': '离开',
    'Stay': '留下',

    // Boolean / states / badges
    'Yes': '是',
    'No': '否',
    'OK': '确定',
    'On': '开',
    'Off': '关',
    'Enabled': '已启用',
    'Disabled': '已禁用',
    'Active': '已激活',
    'Inactive': '未激活',
    'Available': '可用',
    'Unavailable': '不可用',
    'Supported': '支持',
    'Unsupported': '不支持',
    'Recommended': '推荐',
    'Popular': '热门',
    'Featured': '精选',
    'Latest': '最新',
    'Updated': '已更新',
    'Beta': '测试版',
    'Alpha': '内测版',
    'Experimental': '实验性',
    'Early access': '抢先体验',
    'Deprecated': '已弃用',
    'Legacy': '旧版',
    'Free': '免费',
    'Paid': '付费',
    'Pro': '专业版',
    'Default': '默认',
    'Custom': '自定义',
    'Auto': '自动',
    'Automatic': '自动',
    'Manual': '手动',
    'None': '无',
    'All': '全部',
    'Any': '任意',
    'Other': '其他',
    'Optional': '可选',
    'Required': '必填',
    'Read-only': '只读',
    'Public': '公开',
    'Private': '私有',
    'Shared': '已分享',
    'Draft': '草稿',
    'Published': '已发布',
    'Saved': '已保存',
    'Unsaved': '未保存',
    'Loading...': '加载中...',
    'Loading': '加载中',
    'Saving...': '正在保存...',
    'Deleting...': '正在删除...',
    'Processing...': '处理中...',
    'Generating...': '正在生成...',
    'Connecting...': '正在连接...',
    'Uploading...': '正在上传...',
    'Downloading...': '正在下载...',
    'Searching...': '正在搜索...',
    'Success': '成功',
    'Error': '错误',
    'Warning': '警告',
    'Info': '提示',
    'Notice': '注意',
    'Unknown': '未知',
    'Empty': '空',
    'No results': '无结果',
    'No results found': '未找到结果',
    'No data': '暂无数据',
    'No data available': '暂无可用数据',

    // Sorting, time & pagination
    'Name': '名称',
    'Title': '标题',
    'Description': '描述',
    'Type': '类型',
    'Category': '分类',
    'Tags': '标签',
    'Owner': '所有者',
    'Author': '作者',
    'Date': '日期',
    'Time': '时间',
    'Size': '大小',
    'Version': '版本',
    'Modified': '修改时间',
    'Last modified': '上次修改',
    'Last edited': '上次编辑',
    'Newest': '最新',
    'Oldest': '最早',
    'Newest first': '最新优先',
    'Oldest first': '最早优先',
    'A to Z': '按 A-Z 排序',
    'Z to A': '按 Z-A 排序',
    'Ascending': '升序',
    'Descending': '降序',
    'Rows per page': '每页行数',
    'Page': '页',
    'Of': '共',
    'Today': '今天',
    'Yesterday': '昨天',
    'This week': '本周',
    'This month': '本月',
    'Just now': '刚刚',

    // Dialogs & generic feedback
    'Are you sure?': '确定要继续吗？',
    'Confirm deletion': '确认删除',
    'This action cannot be undone.': '此操作无法撤销。',
    'Something went wrong': '出了点问题',
    'Something went wrong. Please try again.': '出了点问题，请重试。',
    'An error occurred': '发生错误',
    'Network error': '网络错误',
    'Request failed': '请求失败',
    'Permission denied': '权限不足',
    'Invalid input': '输入无效',
    'Required field': '必填项',
    'Copy to clipboard': '复制到剪贴板',
    'Press Esc to close': '按 Esc 键关闭',
    'Close dialog': '关闭对话框',
    'Close modal': '关闭弹窗',
    'Close panel': '关闭面板',
    'Open menu': '打开菜单',
    'Close menu': '关闭菜单',

    // Plans, notifications & UI labels
    'Source': '来源',
    'Dismiss': '忽略',
    'Got it': '知道了',
    'Understand': '了解',
    'Next slide': '下一页',
    'Previous slide': '上一页',
    'Show': '显示',
    'Hide': '隐藏',
    'Toggle': '切换',
    'Pin': '固定',
    'Unpin': '取消固定',
    'Archive': '归档',
    'Unarchive': '取消归档',
    'Restore from trash': '从回收站恢复',
    'Delete permanently': '永久删除',
    'Keyboard shortcut': '快捷键',
    'Search...': '搜索...',
    'Filter...': '筛选...',
    'Not set': '未设置',
    'Pro plan': '专业版套餐',
    'Google AI plan': 'Google AI 套餐',
    'Google AI Pro': 'Google AI Pro',
    'Google AI Ultra': 'Google AI Ultra',
    'Included with your Google AI plan': '已包含在您的 Google AI 套餐中',
    'Included with your Google AI plan.': '已包含在您的 Google AI 套餐中。',
    'Included with your': '已包含在您的',
    'Manage plan': '管理套餐',
    'Free plan': '免费套餐',
    'Paid plan': '付费套餐',
    'Notifications': '通知',
    'No notifications': '暂无通知',
    'No new notifications': '暂无新通知',
    'Mark all as read': '全部标为已读',
    'Announcements': '公告',
    'Quick search': '快速搜索',
    'Global search': '全局搜索',
    'Search AI Studio': '搜索 AI Studio',
  };

  // --- dictionaries/navigation.js ---
  const NAVIGATION_DICT = {
    // Brand & Topbar
    'Google AI Studio': 'Google AI Studio',
    'AI Studio': 'AI Studio',
    'Home': '首页',
    'Dashboard': '仪表盘',
    'Playground': '演练场',
    'Studio': '工作台',
    'Get API key': '获取 API 密钥',
    'View API keys': '查看 API 密钥',

    // Left Sidebar Primary Modes
    'Chat': '对话',
    'Create prompt': '创建提示词',
    'Create new prompt': '新建提示词',
    'New prompt': '新建提示词',
    'New chat': '新建对话',
    'New': '全新',
    'Stream': '实时流',
    'Stream Realtime': '实时流交互',
    'Live': '实时互动',
    'Generate media': '媒体生成',
    'Media': '媒体',
    'Build': '应用构建',
    'Apps': '应用',
    'My apps': '我的应用',
    'Starter apps': '起步应用',
    'App gallery': '应用广场',
    'Gallery': '广场',
    'Prompt gallery': '提示词广场',
    'Showcase': '精选展示',

    // Library & History
    'My library': '我的库',
    'Library': '资源库',
    'My prompts': '我的提示词',
    'Saved prompts': '已保存的提示词',
    'History': '历史记录',
    'My history': '我的历史',
    'Recent': '最近使用',
    'Recent prompts': '最近提示词',
    'Shared with me': '与我共享',
    'Starred': '已加星标',
    'Trash': '回收站',
    'All items': '全部项目',
    'Prompts': '提示词',
    'No saved prompts yet': '暂无已保存的提示词',
    'No history yet': '暂无历史记录',

    // Developer Console / Management Navigation
    'API keys': 'API 密钥',
    'Usage': '用量统计',
    'Usage & billing': '用量与计费',
    'Usage and billing': '用量与计费',
    'Usage & limits': '用量与限额',
    'Rate limits': '速率限制',
    'Billing': '计费',
    'Logs': '调用日志',
    'Logs & datasets': '日志与数据集',
    'Datasets': '数据集',
    'Batch': '批处理',
    'Batch API': '批处理 API',
    'Tune': '微调',
    'Fine-tune': '模型微调',
    'Tune a model': '微调模型',
    'My tuned models': '我的微调模型',
    'Files': '文件管理',
    'Cache': '上下文缓存',
    'Context caching': '上下文缓存',
    'Evaluate': '评估',
    'Evaluations': '模型评估',

    // Documentation, Community & Footer Links
    'Documentation': '开发文档',
    'Docs': '文档',
    'API docs': 'API 文档',
    'API reference': 'API 参考',
    'Quickstart': '快速入门',
    'Cookbook': '实战指南',
    'Changelog': '更新日志',
    'Release notes': '发行说明',
    'What\'s new': '最新动态',
    'Community': '社区',
    'Developer forum': '开发者论坛',
    'Discord': 'Discord',
    'Pricing': '定价',
    'Terms of Service': '服务条款',
    'Terms': '条款',
    'Privacy Policy': '隐私政策',
    'Privacy & Terms': '隐私与条款',
    'Send feedback': '发送反馈',
    'Report a bug': '报告问题',
    'Help & support': '帮助与支持',

    // Account & Sidebar Controls
    'Account': '账户',
    'Switch account': '切换账户',
    'Sign in': '登录',
    'Sign out': '退出登录',
    'Manage your Google Account': '管理您的 Google 账号',
    'Collapse sidebar': '收起侧边栏',
    'Expand sidebar': '展开侧边栏',
    'Toggle sidebar': '切换侧边栏',
    'Navigation': '导航',
    'Main navigation': '主导航',
    'Menu': '菜单',
    'Go to Dashboard': '前往仪表盘',
    'Go to Playground': '前往演练场',
    'Back to library': '返回资源库',
    'Back to Dashboard': '返回仪表盘',

    // Section Headers, App Shortcuts & Sidebar/Menu Controls
    'Explore': '探索',
    'Develop': '开发',
    'Resources': '资源',
    'Learn': '学习',
    'New app': '新建应用',
    'Temporary chat': '临时对话',
    'Start temporary chat': '开启临时对话',
    'Start a temporary chat': '开启临时对话',
    'Incognito chat': '无痕对话',
    'Toggle navigation menu': '切换导航菜单',
    'Open navigation menu': '打开导航菜单',
    'Close navigation menu': '关闭导航菜单',
    'Toggle navigation': '切换导航栏',
    'Show sidebar': '显示侧边栏',
    'Hide sidebar': '隐藏侧边栏',
    'Open sidebar': '打开侧边栏',
    'Close sidebar': '关闭侧边栏',
    'Navigation menu': '导航菜单',
    'Main menu': '主菜单',
    'Account menu': '账户菜单',
    'Open in Google Cloud Console': '在 Google Cloud 控制台中打开',
    'View in Google Cloud Console': '在 Google Cloud 控制台中查看',
    'Open in Drive': '在云端硬盘中打开',
    'View in Drive': '在云端硬盘中查看',
    'Open in Playground': '在演练场中打开',

    // Library & Files Sub-tabs
    'My files': '我的文件',
    'All files': '全部文件',
    'Shared files': '共享文件',
    'Open in Google Drive': '在 Google 云端硬盘中打开',
    'Search library': '搜索资源库',
    'Search files': '搜索文件',

    // Command Palette Go-To Actions
    'Go to Library': '前往资源库',
    'Go to History': '前往历史记录',
    'Go to Apps': '前往我的应用',
    'Go to Gallery': '前往广场',
    'Go to API keys': '前往 API 密钥',
    'Go to Usage': '前往用量统计',
    'Go to Settings': '前往设置',
  };

  // --- dictionaries/workspace.js ---
  const WORKSPACE_DICT = {
    // Welcome & Empty State
    'Welcome to Google AI Studio': '欢迎使用 Google AI Studio',
    'Welcome to AI Studio': '欢迎使用 AI Studio',
    'Start building with Gemini': '使用 Gemini 开始构建',
    'What do you want to build?': '想做点什么？',
    'Try a sample prompt': '试试示例提示词',
    'Explore examples': '浏览示例',
    'Suggested prompts': '推荐提示词',
    'Untitled prompt': '未命名提示词',
    'Untitled chat': '未命名对话',
    'Edit title': '编辑标题',
    'Add description': '添加描述',

    // System Instructions
    'System instructions': '系统指令',
    'System Instructions': '系统指令',
    'Add system instructions': '添加系统指令',
    'Enter system instructions': '输入系统指令',
    'Optional tone and style instructions for the model': '可选的模型语气、角色与输出风格指令',
    'Define how the model should behave and respond': '定义模型的行为方式与回复风格',
    'Clear system instructions': '清空系统指令',

    // Prompt Composer
    'Start typing a prompt': '开始输入提示词',
    'Type something or tab to choose an example': '输入内容，或按 Tab 键选择示例',
    'Type something...': '输入内容...',
    'Type something': '输入内容',
    'Ask anything': '随便问点什么',
    'Ask Gemini': '向 Gemini 提问',
    'Enter a prompt': '输入提示词',
    'Enter your prompt here': '在此输入提示词',
    'Write your prompt here...': '在此编写提示词...',
    'Message Gemini...': '给 Gemini 发送消息...',
    'Run': '运行',
    'Run prompt': '运行提示词',
    'Stop generating': '停止生成',
    'Cancel run': '取消运行',
    'Add to prompt': '添加到提示词',
    'Add media': '添加媒体',
    'Insert asset': '插入素材',

    // Top Toolbar & Actions
    'Get code': '获取代码',
    'View code': '查看代码',
    'Code snippet': '代码片段',
    'Compare mode': '对比模式',
    'Add to compare': '添加对比模型',
    'Exit compare': '退出对比',
    'Clear chat': '清空对话',
    'Reset conversation': '重置对话',
    'Save prompt': '保存提示词',
    'Save a copy': '保存副本',
    'Share prompt': '分享提示词',
    'Delete prompt': '删除提示词',
    'Move to trash': '移至回收站',
    'All changes saved to Drive': '所有更改已保存至云端硬盘',
    'Changes saved to Drive': '更改已保存至云端硬盘',
    'Saved to Drive': '已保存至云端硬盘',
    'Saving to Drive...': '正在保存至云端硬盘...',
    'Unsaved changes': '有未保存的更改',
    'Turn on autosave': '开启自动保存',
    'Autosave': '自动保存',
    'Autosave is on': '自动保存已开启',
    'Autosave is off': '自动保存已关闭',
    'Save to Drive to enable autosave': '保存至云端硬盘以启用自动保存',

    // Chat Turns & Roles
    'User': '用户',
    'Model': '模型',
    'Assistant': '助手',
    'System': '系统',
    'You': '你',
    'Rerun': '重新运行',
    'Rerun this turn': '重新运行此轮',
    'Rerun from here': '从此处重新运行',
    'Edit message': '编辑消息',
    'Edit turn': '编辑此轮',
    'Save & rerun': '保存并重新运行',
    'Stop editing': '取消编辑',
    'Branch from here': '从此处创建分支',
    'Delete turn': '删除此轮',
    'Copy markdown': '复制 Markdown',
    'Copy text': '复制文本',
    'Copy code': '复制代码',
    'Copy response': '复制回复',
    'Good response': '回复有帮助',
    'Bad response': '回复待改进',
    'Like': '赞',
    'Dislike': '踩',
    'View raw': '查看原文',
    'Rendered': '渲染视图',
    'Raw': '原始文本',

    // Thinking & Grounding UI
    'Thoughts': '思考过程',
    'Thinking process': '思考过程',
    'Thought process': '思考过程',
    'Thinking...': '思考中...',
    'Expand to view model thoughts': '展开查看模型思考过程',
    'Collapse model thoughts': '收起模型思考过程',
    'Show thoughts': '显示思考过程',
    'Hide thoughts': '隐藏思考过程',
    'Sources': '参考来源',
    'Grounding sources': '联网参考来源',
    'Search suggestions': '搜索建议',
    'Google Search Suggestions': 'Google 搜索建议',
    'Search queries': '搜索查询词',
    'Citations': '引用来源',
    'Executed code': '已执行的代码',
    'Execution result': '执行结果',
    'Tool call': '工具调用',
    'Tool response': '工具返回',

    // Attachments & Inputs
    'Upload file': '上传文件',
    'Upload files': '上传文件',
    'Upload from computer': '从电脑上传',
    'Upload image': '上传图片',
    'Upload audio': '上传音频',
    'Upload video': '上传视频',
    'My Drive': '我的云端硬盘',
    'Google Drive': 'Google 云端硬盘',
    'Import from Drive': '从云端硬盘导入',
    'Sample media': '示例媒体',
    'Samples': '示例',
    'Record audio': '录制音频',
    'Stop recording': '停止录制',
    'Camera': '摄像头',
    'Take a photo': '拍照',
    'YouTube URL': 'YouTube 链接',
    'Paste YouTube URL': '粘贴 YouTube 链接',
    'Add URL': '添加链接',
    'Drag and drop files here': '将文件拖拽到此处',
    'Drop files to attach': '松开鼠标即可添加附件',
    'Remove attachment': '移除附件',
    'Add test case': '添加测试用例',
    'Add example': '添加示例',
    'Input': '输入',
    'Output': '输出',
    'Add input': '添加输入',
    'Add output': '添加输出',

    // Token Info & Get Code Dialog
    'Token count': 'Token 计数',
    'Tokens': 'Token',
    'Total': '总计',
    'Context': '上下文',
    'Open in Colab': '在 Colab 中打开',
    'Copy snippet': '复制代码片段',
    'Install the SDK': '安装 SDK',
    'SDK': 'SDK',
    'Language': '语言',
    'Select language': '选择语言',
    'API key placeholder': 'API 密钥占位符',
    'Include API key': '包含 API 密钥',
    'Show API key': '显示 API 密钥',
    'Hide API key': '隐藏 API 密钥',
    'Run this code': '运行此代码',
    'View full example': '查看完整示例',

    // Prompt Types / Modes
    'Freeform prompt': '自由格式提示词',
    'Chat prompt': '对话提示词',
    'Structured prompt': '结构化提示词',
    'Convert to chat': '转换为对话',
    'Clear history': '清空历史',
    'Add model response': '添加模型回复',
    'Add user message': '添加用户消息',

    // Hero Cards, Starter Examples & Composer Controls
    'Cutting-edge intelligence, with speed and efficiency for everyday coding and agentic workflows.':
      '兼具前沿智能、速度与效率，适合日常编程与智能体工作流。',
    'Review my code before I ship it': '发布前帮我审查代码',
    'Find the errors in my hospital bill': '找出我的医院账单中的错误',
    'Should my next car be an EV or a hybrid': '我的下一辆车该选纯电还是混动',
    'Spot the red flags in my apartment lease': '找出租房合同中的潜在陷阱',
    'Start typing a prompt to see what our models can do': '开始输入提示词，体验模型的强大能力',
    'Send message': '发送消息',
    'Voice input': '语音输入',
    'Start voice input': '开始语音输入',
    'Stop voice input': '停止语音输入',
    'Use microphone': '使用麦克风',
    'Dictate': '语音听写',
    'Attach files': '添加附件',
    'Add files': '添加文件',
    'Insert files': '插入文件',
    'Insert media': '插入媒体',
    'Add attachment': '添加附件',
    'Prompt options': '提示词选项',
    'Chat options': '对话选项',
    'Turn options': '对话轮次选项',
    'Sync prompts': '同步提示词',
    'Sync settings': '同步设置',
    'Add model': '添加模型',
    'Remove column': '移除对比列',
    'Compare models': '对比模型',
    'Prompt history': '提示词历史',
    'Search history': '搜索历史记录',
    'Search prompts': '搜索提示词',
    'Rename prompt': '重命名提示词',
    'Duplicate prompt': '复制提示词',
    'No prompts found': '未找到提示词',
    'Your prompt history is saved to Google Drive': '您的提示词历史已保存至 Google 云端硬盘',
    'Select SDK': '选择 SDK',
    'Install library': '安装依赖库',
    'Set your API key as an environment variable': '将 API 密钥设置为环境变量',
    'Learn more about the Gemini API': '进一步了解 Gemini API',
    'View documentation': '查看文档',

    // System Instructions Modal (Screenshot 4)
    '+ Create new instruction': '+ 创建新指令',
    'Create new instruction': '创建新指令',
    'New instruction': '新建指令',
    'System instruction': '系统指令',
    'Delete instruction': '删除指令',
    'Untitled instruction': '未命名指令',
    'Select an instruction': '选择指令',
    'No saved instructions': '暂无已保存的指令',
    'Instructions are saved in local storage.': '系统指令保存在浏览器本地存储中。',
    'System instructions are saved in local storage.': '系统指令保存在浏览器本地存储中。',
    'Saved in local storage': '已保存在本地存储中',

    // Library Empty State (Screenshot 5)
    'No prompts yet': '暂无提示词',
    'You don\'t have any prompts yet.': '您还没有任何提示词。',
    '+ New chat prompt': '+ 新建对话提示词',
    'New chat prompt': '新建对话提示词',
    'You don\'t have any files yet.': '您还没有任何文件。',
    'You don\'t have any apps yet.': '您还没有任何应用。',
    'Create your first prompt': '创建您的第一个提示词',
    'New structured prompt': '新建结构化提示词',
    'New freeform prompt': '新建自由格式提示词',

    // More Options Menu (Screenshot 6)
    'No changes to save': '没有需要保存的更改',
    'Copy as Markdown': '复制为 Markdown',
    'Raw Mode': '原始模式',
    'Rendered Mode': '渲染模式',
    'Exit Raw Mode': '退出原始模式',
    'Switch to Raw Mode': '切换到原始模式',
    'Save to Drive': '保存到云端硬盘',
    'Copy as JSON': '复制为 JSON',
    'Copy as text': '复制为纯文本',
    'Download as JSON': '下载为 JSON',
    'Download as Markdown': '下载为 Markdown',
    'Clear conversation': '清空对话',
    'Reset chat': '重置对话',
    'Delete chat': '删除对话',
    'Prompt details': '提示词详情',

    // Command Palette & Slash Shortcuts (Ctrl + /)
    'Start a chat or vibe code an app': '开始对话或用 AI 编程构建应用',
    'Vibe code an app': '用 AI 编程构建应用',
    'Vibe coding': 'AI 氛围编程',
    'Start a chat with a model': '与模型开始对话',
    'Search the Gemini API documentation': '搜索 Gemini API 开发文档',
    'Create an API key': '创建 API 密钥',
    'View keyboard shortcuts': '查看快捷键',
    'Open command palette': '打开命令面板',
    'Open quick search': '打开快速搜索',
    'Commands': '命令',
    'No matching commands': '没有匹配的命令',
    'Type a command or search...': '输入命令或搜索...',
    'Start a new chat': '开始新对话',
    'Copy last response': '复制最新回复',
    'Shortcut': '快捷键',
    'Action': '操作',
    'Editing': '编辑',
    'Workspace': '工作区',
  };

  // --- dictionaries/run-settings.js ---
  const RUN_SETTINGS_DICT = {
    // Panel Header & Model Selection
    'Run settings': '运行设置',
    'Run Settings': '运行设置',
    'Model settings': '模型设置',
    'Select a model': '选择模型',
    'Switch model': '切换模型',
    'Search models': '搜索模型',
    'All models': '全部模型',
    'Model info': '模型信息',
    'Model details': '模型详情',
    'Model card': '模型卡片',
    'Capabilities': '模型能力',
    'Knowledge cutoff': '知识截止日期',
    'Input token limit': '输入 Token 上限',
    'Output token limit': '输出 Token 上限',
    'Context window': '上下文窗口',
    'Context length': '上下文长度',
    'Max input tokens': '最大输入 Token',
    'Max output tokens': '最大输出 Token',
    'Output length': '输出长度',
    'Multimodal': '多模态',
    'Audio input': '音频输入',
    'Video input': '视频输入',
    'Image input': '图像输入',
    'PDF input': 'PDF 输入',

    // Sampling & Generation Parameters
    'Temperature': '温度',
    'Top P': 'Top P（核采样）',
    'Top K': 'Top K',
    'Stop sequence': '停止序列',
    'Stop sequences': '停止序列',
    'Add stop sequence': '添加停止序列',
    'Enter stop sequence': '输入停止序列',
    'Seed': '随机种子',
    'Candidate count': '候选回复数',
    'Frequency penalty': '频率惩罚',
    'Presence penalty': '存在惩罚',
    'Logprobs': '对数概率',
    'Top logprobs': 'Top 对数概率',

    // Thinking Controls
    'Thinking': '深度思考',
    'Thinking mode': '思考模式',
    'Thinking budget': '思考预算',
    'Thinking level': '思考等级',
    'Set thinking budget': '设置思考预算',
    'Include thoughts': '输出思考过程',
    'Minimal': '极简',
    'Low': '低',
    'Medium': '中',
    'High': '高',
    'Extra High': '极高',
    'Extra Low': '极低',
    'Very High': '非常高',
    'Very Low': '非常低',
    'Ultra High': '超高',
    'Maximum': '最高',
    'Minimum': '最低',
    'None (Off)': '无（关闭）',
    'Dynamic': '动态',
    'Off (no thinking)': '关闭（不思考）',

    // Tools & Grounding
    'Tools': '工具',
    'Tool settings': '工具设置',
    'Structured output': '结构化输出',
    'Structured outputs': '结构化输出',
    'JSON schema': 'JSON Schema',
    'Response schema': '响应 Schema',
    'Edit schema': '编辑 Schema',
    'Schema editor': 'Schema 编辑器',
    'Visual editor': '可视化编辑器',
    'JSON editor': 'JSON 编辑器',
    'Add property': '添加字段',
    'Property name': '字段名称',
    'Required property': '必需字段',
    'Code execution': '代码执行',
    'Code Execution': '代码执行',
    'Function calling': '函数调用',
    'Function Calling': '函数调用',
    'Edit functions': '编辑函数',
    'Function declarations': '函数声明',
    'Add function': '添加函数',
    'Mode': '模式',
    'Validated': '严格校验',
    'Any function': '任意函数',
    'Grounding with Google Search': 'Google 搜索联网增强',
    'Google Search': 'Google 搜索',
    'Search grounding': '搜索联网增强',
    'Dynamic retrieval': '动态检索',
    'Dynamic threshold': '动态阈值',
    'URL context': 'URL 上下文',
    'URL Context': 'URL 上下文',
    'Google Maps': 'Google 地图',
    'Grounding with Google Maps': 'Google 地图联网增强',
    'File search': '文件检索',
    'Computer use': '计算机操作',

    // Output Format & Media Parameters
    'Advanced settings': '高级设置',
    'Advanced': '高级',
    'Output format': '输出格式',
    'Response modality': '响应模态',
    'Response modalities': '响应模态',
    'Response MIME type': '响应 MIME 类型',
    'Media resolution': '媒体分辨率',
    'Image resolution': '图像分辨率',
    'Aspect ratio': '宽高比',
    'Number of results': '生成数量',
    'Number of images': '图片数量',
    'Person generation': '人物生成',
    'Allow adults': '仅允许成人',
    'Allow all': '允许所有',
    'Don\'t allow': '不允许',
    'Allow all ages': '允许所有年龄段',
    'Safety filter': '安全过滤',
    'Voice': '语音音色',
    'Select voice': '选择音色',
    'Speaking rate': '语速',

    // Safety Settings
    'Safety settings': '安全设置',
    'Safety Settings': '安全设置',
    'Edit safety settings': '编辑安全设置',
    'Run safety settings': '运行安全设置',
    'Harassment': '骚扰内容',
    'Hate': '仇恨言论',
    'Hate speech': '仇恨言论',
    'Sexually explicit': '露骨色情内容',
    'Dangerous content': '危险内容',
    'Civic integrity': '公民诚信',
    'Block none': '不拦截',
    'Block few': '仅拦截高风险',
    'Block some': '拦截中高风险',
    'Block most': '严格拦截',
    'Block off': '关闭拦截',
    'Threshold': '阈值',
    'Reset defaults': '恢复默认',
    'Reset to defaults': '恢复默认设置',

    // Tooltips & Helper Explanations
    'Temperature controls the randomness of the output': '温度用于控制模型输出结果的随机性与创造性',
    'Controls the randomness of the output': '控制输出结果的随机性',
    'Maximum number of tokens to generate': '单次生成的最大 Token 数量',
    'Adjust how much the model thinks before responding': '调整模型在回复前进行内部推理的思考量',
    'Use Google Search to ground model responses in real-time web information': '借助 Google 搜索获取实时网页信息，提升回复准确性',
    'Force the model to output valid JSON matching your schema': '强制模型严格按照您定义的 JSON Schema 格式输出结果',
    'Allow the model to write and run Python code to solve tasks': '允许模型编写并运行 Python 代码来解决计算与逻辑任务',
    'Fetch and read content from URLs included in your prompt': '自动抓取并读取提示词中包含的网页链接内容',

    // Run Settings Controls, Schema/Function/Safety Editors & Model Picker
    'Add stop...': '添加停止序列...',
    'Add stop': '添加停止序列',
    'Toggle run settings': '切换运行设置',
    'Open run settings': '打开运行设置',
    'Close run settings': '关闭运行设置',
    'Reset run settings': '重置运行设置',
    'Reset settings': '重置设置',
    'Edit structured output': '编辑结构化输出',
    'Edit function calling': '编辑函数调用',
    'Edit function declarations': '编辑函数声明',
    'Structured output schema': '结构化输出 Schema',
    'Define a schema to constrain the model\'s output to valid JSON.':
      '定义 Schema 以约束模型输出符合规范的 JSON。',
    'Declare functions that the model can call to interact with external tools and APIs.':
      '声明可供模型调用的函数，以便与外部工具和 API 交互。',
    'Adjust how likely you are to see responses that could be harmful.':
      '调整潜在有害内容的拦截严格程度。',
    'Content is blocked based on the probability that it is harmful.':
      '系统将根据内容存在危害的概率进行拦截。',
    'Code editor': '代码编辑器',
    'Load example': '加载示例',
    'Clear schema': '清空 Schema',
    'Format JSON': '格式化 JSON',
    'Validate': '校验',
    'Add field': '添加字段',
    'Field name': '字段名',
    'Field type': '字段类型',
    'Nullable': '可为空',
    'String': '字符串',
    'Number': '数字',
    'Integer': '整数',
    'Boolean': '布尔值',
    'Array': '数组',
    'Object': '对象',
    'Enum': '枚举',
    'Filter models': '筛选模型',
    'Model family': '模型系列',
    'Reasoning': '推理',
    'Fast': '高速',
    'Coding': '编程',
    'Agentic': '智能体',
    'Open weights': '开放权重',
    'Best for': '适用场景',
    'Free tier available': '支持免费层级',
    'Paid only': '仅限付费层级',
    'Text': '文本',
    'Images': '图像',
    'Audio': '音频',
    'Video': '视频',
    'Ultra': '超高',
    'Show model info': '查看模型信息',
    'Hide model info': '隐藏模型信息',
    'Our most intelligent model for complex reasoning, coding, and agentic workflows.':
      '我们最智能的模型，适用于复杂推理、编程和智能体工作流。',
    'Fast, cost-efficient multimodal model for high-frequency everyday tasks.':
      '快速且高性价比的多模态模型，适合高频日常任务。',
    'Ultra-fast, lightweight model optimized for low-latency, high-throughput workloads.':
      '超高速轻量级模型，针对低延迟与高吞吐任务优化。',
  };

  // --- dictionaries/stream-media-build.js ---
  const STREAM_MEDIA_BUILD_DICT = {
    // Stream Realtime (Gemini Live)
    'Talk to Gemini': '与 Gemini 实时对话',
    'Start talking': '开始对话',
    'Start session': '开始会话',
    'End session': '结束会话',
    'Connect': '连接',
    'Disconnect': '断开连接',
    'Connected': '已连接',
    'Disconnected': '已断开',
    'Webcam': '摄像头',
    'Turn on camera': '打开摄像头',
    'Turn off camera': '关闭摄像头',
    'Share screen': '共享屏幕',
    'Stop sharing': '停止共享',
    'Microphone': '麦克风',
    'Mute': '静音',
    'Unmute': '取消静音',
    'Mute microphone': '麦克风静音',
    'Unmute microphone': '开启麦克风',
    'Audio and text': '音频与文本',
    'Audio only': '仅音频',
    'Text only': '仅文本',
    'Turn coverage': '轮次覆盖',
    'Include all input': '包含全部输入',
    'Only activity': '仅有效语音活动',
    'Affective dialog': '情感感知对话',
    'Proactive audio': '主动语音响应',
    'Voice activity detection': '语音活动检测',
    'Session settings': '会话设置',
    'Live audio': '实时音频',
    'Live video': '实时视频',

    // Generate Media (Imagen, Veo, Lyria, TTS)
    'Image generation': '图像生成',
    'Video generation': '视频生成',
    'Music generation': '音乐生成',
    'Speech generation': '语音合成',
    'Audio generation': '音频生成',
    'Text to image': '文生图',
    'Text to video': '文生视频',
    'Image to video': '图生视频',
    'Text to speech': '文本转语音',
    'Single-speaker': '单人语音',
    'Multi-speaker': '多人对话语音',
    'Speaker 1': '说话人 1',
    'Speaker 2': '说话人 2',
    'Add speaker': '添加说话人',
    'Generate': '生成',
    'Regenerate': '重新生成',
    'Prompt': '提示词',
    'Negative prompt': '反向提示词',
    'Describe what to avoid': '描述需要避免出现的元素',
    'Duration': '时长',
    'Resolution': '分辨率',
    'Frame rate': '帧率',
    'Style': '风格',
    'Quality': '画质',
    'Guidance scale': '引导系数',
    'Download image': '下载图片',
    'Download video': '下载视频',
    'Download audio': '下载音频',
    'Upscale': '超分辨率放大',
    'Edit image': '编辑图片',
    'Extend video': '延长视频',
    'Reference image': '参考图像',
    'First frame': '首帧',
    'Last frame': '尾帧',

    // Build (App Builder / Vibe Coding)
    'Build apps with Gemini': '使用 Gemini 构建应用',
    'Build with Gemini': '使用 Gemini 构建',
    'Describe your idea': '描述你的应用想法',
    'Describe what you want to build': '描述你想构建的应用',
    'Describe changes to make...': '描述想要进行的修改...',
    'Ask AI to edit your app...': '让 AI 修改你的应用...',
    'Start from a template': '从模板开始',
    'Templates': '应用模板',
    'Your apps': '你的应用',
    'Featured apps': '精选应用',
    'Recent apps': '最近的应用',
    'Code': '代码',
    'Split view': '分栏视图',
    'App': '应用',
    'Explorer': '文件浏览器',
    'File tree': '文件树',
    'New file': '新建文件',
    'New folder': '新建文件夹',
    'Delete file': '删除文件',
    'Console': '控制台',
    'Terminal': '终端',
    'Problems': '问题',
    'Errors': '错误',
    'Warnings': '警告',
    'Build logs': '构建日志',
    'Fix error': '修复错误',
    'Fix with AI': '使用 AI 修复',
    'Auto-fix': '自动修复',
    'Deploy': '部署',
    'Deploy app': '部署应用',
    'Deploy to Cloud Run': '部署到 Cloud Run',
    'Deployment': '部署状态',
    'Deployed': '已部署',
    'Download app': '下载应用',
    'Download ZIP': '下载 ZIP 压缩包',
    'Save to GitHub': '保存到 GitHub',
    'Export to GitHub': '导出到 GitHub',
    'Connect GitHub': '连接 GitHub',
    'Share app': '分享应用',
    'Publish app': '发布应用',
    'Full screen': '全屏',
    'Exit full screen': '退出全屏',
    'Desktop': '桌面端',
    'Tablet': '平板端',
    'Mobile': '移动端',
    'Responsive': '自适应',
    'Refresh preview': '刷新预览',
    'Open preview in new tab': '在新标签页中打开预览',
    'Annotate': '标注修改',
    'Select element': '选择元素',
    'Checkpoint': '检查点',
    'Restore checkpoint': '恢复到此检查点',
    'Version history': '版本历史',
    'Restore version': '恢复此版本',
    'Remix': '二次创作',
    'Fork': '复刻',
    'Environment variables': '环境变量',
    'Add variable': '添加变量',
    'Secrets': '密钥变量',
    'Dependencies': '依赖项',
    'Packages': '软件包',
    'Preview unavailable': '预览不可用',
    'Building app...': '正在构建应用...',
    'Applying changes...': '正在应用更改...',

    // App Builder & Sharing Extensions
    'Create app': '创建应用',
    'Create new app': '新建应用',
    'Build an app': '构建应用',
    'What would you like to build?': '你想构建什么样的应用？',
    'Describe the app you want to build...': '描述你想构建的应用...',
    'Start building': '开始构建',
    'App ideas': '应用灵感',
    'Inspiration': '灵感推荐',
    'Community apps': '社区应用',
    'All apps': '全部应用',
    'Search apps': '搜索应用',
    'Open app': '打开应用',
    'Edit app': '编辑应用',
    'Delete app': '删除应用',
    'Rename app': '重命名应用',
    'Duplicate app': '复制应用',
    'Download code': '下载代码',
    'View source': '查看源码',
    'Live preview': '实时预览',
    'Mobile view': '移动端视图',
    'Desktop view': '桌面端视图',
    'Tablet view': '平板视图',
    'Code view': '代码视图',
    'Preview mode': '预览模式',
    'Ask Gemini to make changes...': '让 Gemini 进行修改...',
    'Explain code': '解释代码',
    'Fix issues': '修复问题',
    'Auto-fix errors': '自动修复错误',
    'No errors': '无错误',
    'Console output': '控制台输出',
    'Clear console': '清空控制台',
    'Install package': '安装依赖包',
    'Add file': '添加文件',
    'Upload asset': '上传素材',
    'Copy app link': '复制应用链接',
    'Anyone with the link can view': '任何拥有链接的人均可查看',
    'Make public': '设为公开',
    'Make private': '设为私有',
    'API key required': '需要 API 密钥',
    'Use your own API key': '使用您自己的 API 密钥',
  };

  // --- dictionaries/dashboard-api.js ---
  const DASHBOARD_API_DICT = {
    // Dashboard & Overview
    'Overview': '概览',
    'Quick actions': '快捷操作',
    'Developer dashboard': '开发者仪表盘',
    'Total projects': '项目总数',
    'Active keys': '活跃密钥',
    'Monthly usage': '本月用量',

    // API Keys & Projects
    'Create API key': '创建 API 密钥',
    'Create API key in new project': '在新项目中创建 API 密钥',
    'Create API key in existing project': '在现有项目中创建 API 密钥',
    'Import project': '导入项目',
    'Import Google Cloud project': '导入 Google Cloud 项目',
    'Select a Google Cloud project': '选择 Google Cloud 项目',
    'Search projects': '搜索项目',
    'Project': '项目',
    'Projects': '项目',
    'Project name': '项目名称',
    'Project ID': '项目 ID',
    'Project number': '项目编号',
    'Key name': '密钥名称',
    'API key': 'API 密钥',
    'Key': '密钥',
    'Created': '创建时间',
    'Created on': '创建日期',
    'Last used': '最后使用',
    'Never': '从未',
    'Plan': '方案',
    'Tier': '层级',
    'Free tier': '免费层级',
    'Paid tier': '付费层级',
    'Pay-as-you-go': '按量付费',
    'Tier 1': '第 1 级 (Tier 1)',
    'Tier 2': '第 2 级 (Tier 2)',
    'Tier 3': '第 3 级 (Tier 3)',
    'Enterprise': '企业级',
    'Quota tier': '配额层级',
    'Upgrade': '升级',
    'Upgrade plan': '升级方案',
    'Set up billing': '设置计费',
    'Enable billing': '启用计费',
    'Manage billing': '管理计费',
    'Billing account': '计费账户',
    'Link billing account': '关联计费账户',
    'Status': '状态',
    'Restricted': '受限',
    'Unrestricted': '不受限',
    'Revoke': '吊销',
    'Revoke key': '吊销密钥',
    'Delete API key': '删除 API 密钥',
    'Rename key': '重命名密钥',
    'Copy API key': '复制 API 密钥',
    'Key restrictions': '密钥限制',
    'API key created': 'API 密钥已创建',
    'API key copied': 'API 密钥已复制',

    // Usage & Rate Limits
    'Rate limit': '速率限制',
    'Requests per minute': '每分钟请求数 (RPM)',
    'Tokens per minute': '每分钟 Token 数 (TPM)',
    'Requests per day': '每天请求数 (RPD)',
    'Requests per minute (RPM)': '每分钟请求数 (RPM)',
    'Tokens per minute (TPM)': '每分钟 Token 数 (TPM)',
    'Requests per day (RPD)': '每天请求数 (RPD)',
    'Total requests': '总请求数',
    'Total tokens': '总 Token 数',
    'Input tokens': '输入 Token',
    'Output tokens': '输出 Token',
    'Cached tokens': '缓存 Token',
    'Error rate': '错误率',
    'Errors by code': '按状态码统计错误',
    'Latency': '延迟',
    'Average latency': '平均延迟',
    'Time range': '时间范围',
    'Last hour': '过去 1 小时',
    'Last 24 hours': '过去 24 小时',
    'Last 7 days': '过去 7 天',
    'Last 28 days': '过去 28 天',
    'Last 30 days': '过去 30 天',
    'Last 90 days': '过去 90 天',
    'Custom range': '自定义范围',
    'All projects': '全部项目',
    'All keys': '全部密钥',
    'Filter by model': '按模型筛选',
    'Filter by project': '按项目筛选',
    'Filter by key': '按密钥筛选',
    'Quota': '配额',
    'Current usage': '当前用量',
    'Limit': '上限',
    'Remaining': '剩余',
    'Unlimited': '无限制',

    // Logs, Datasets, Batch & Fine-tuning
    'Enable logging': '开启日志记录',
    'Disable logging': '关闭日志记录',
    'Logging enabled': '日志记录已开启',
    'Logging disabled': '日志记录已关闭',
    'Create dataset': '创建数据集',
    'Export dataset': '导出数据集',
    'Import dataset': '导入数据集',
    'Dataset name': '数据集名称',
    'Examples': '样本数',
    'Batch jobs': '批处理任务',
    'Create batch job': '创建批处理任务',
    'Fine-tuning': '模型微调',
    'Tuned models': '已微调模型',
    'New tuned model': '新建微调模型',
    'Start tuning': '开始微调',
    'Training data': '训练数据',
    'Validation data': '验证数据',
    'Hyperparameters': '超参数',
    'Base model': '基础模型',
    'Epochs': '训练轮数 (Epochs)',
    'Batch size': '批大小 (Batch size)',
    'Learning rate': '学习率',
    'Learning rate multiplier': '学习率倍率',
    'Job status': '任务状态',
    'Succeeded': '已完成',
    'Failed': '失败',
    'Running': '运行中',
    'Pending': '等待中',
    'Queued': '排队中',
    'Cancelled': '已取消',
    'In progress': '进行中',

    // Settings, Theme, Shortcuts, Drive & Errors
    'Appearance': '外观',
    'Theme': '主题',
    'Light': '浅色',
    'Dark': '深色',
    'Light mode': '浅色模式',
    'Dark mode': '深色模式',
    'System default': '跟随系统',
    'Use system theme': '使用系统主题',
    'Keyboard shortcuts': '快捷键',
    'General': '常规',
    'Privacy': '隐私',
    'Data usage': '数据使用说明',
    'Connect to Google Drive': '连接 Google 云端硬盘',
    'Disconnect Google Drive': '断开 Google 云端硬盘',
    'Connected to Google Drive': '已连接 Google 云端硬盘',
    'Automatically save prompts to Google Drive': '自动将提示词保存到 Google 云端硬盘',
    'Rate limit exceeded': '已超出速率限制',
    'Quota exceeded': '已超出配额上限',
    'Resource exhausted': '资源配额已耗尽',
    'Authentication failed': '身份验证失败',
    'API key not valid': 'API 密钥无效',
    'Billing not enabled': '尚未启用计费',
    'Model not found': '未找到模型',
    'Content blocked by safety settings': '内容已被安全设置拦截',

    // Billing, Analytics & Logs Extensions
    'Spend': '消费金额',
    'Cost': '费用',
    'Estimated cost': '预估费用',
    'Billing status': '计费状态',
    'Payment method': '付款方式',
    'Create new key': '新建密钥',
    'Import existing project': '导入现有项目',
    'No API keys yet': '暂无 API 密钥',
    'Create your first API key': '创建您的第一个 API 密钥',
    'Key copied to clipboard': '密钥已复制到剪贴板',
    'Reveal key': '显示密钥',
    'Copy key': '复制密钥',
    'Delete key': '删除密钥',
    'Restrict key': '限制密钥权限',
    'Usage overview': '用量概览',
    'Requests': '请求数',
    'Success rate': '成功率',
    'Median latency': '中位延迟',
    'By model': '按模型',
    'By API key': '按 API 密钥',
    'By project': '按项目',
    'Export CSV': '导出 CSV',
    'Download CSV': '下载 CSV',
    'Refresh data': '刷新数据',
    'Auto-refresh': '自动刷新',
    'No usage data for this time range': '该时间范围内暂无用量数据',
    'Free tier limits': '免费层级限额',
    'Paid tier limits': '付费层级限额',
    'Request quota increase': '申请提升配额',
    'Enable API logging': '开启 API 日志',
    'Log retention': '日志保留期',
    'Filter logs': '筛选日志',
    'Search logs': '搜索日志',
    'Request': '请求',
    'Response': '响应',
    'Metadata': '元数据',
    'Timestamp': '时间戳',
    'Status code': '状态码',
    'Export to dataset': '导出为数据集',
    'Manage subscription': '管理订阅',
  };

  // --- dictionaries/models.js ---
  const MODELS_DICT = {
    // Model Selection Modal UI
    'Model selection': '选择模型',
    'Search for a model or agent': '搜索模型或智能体',
    'Music': '音乐',
    'Agents': '智能体',
    'Embeddings': '向量嵌入',
    'Robotics': '机器人',
    'Favorites': '收藏',
    'Selected model': '已选模型',
    'Release date': '发布日期',
    'Pricing is based on the configured model.': '定价基于所配置的底层模型。',
    'Input pricing': '输入定价',
    'Output pricing': '输出定价',
    'Free of charge': '免费',
    'Not available on free tier': '免费层级不可用',
    'Requires paid tier': '需要付费层级',
    'Paid tier only': '仅限付费层级',
    'Rate limits apply': '受速率限制约束',
    'Pin model': '置顶模型',
    'Unpin model': '取消置顶模型',
    'Copy model ID': '复制模型 ID',
    'Open model card': '打开模型卡片',
    'Favorite': '收藏',
    'Unfavorite': '取消收藏',
    'Model capabilities': '模型能力',
    'Token limits': 'Token 上限',

    // Agent & Deep Research Descriptions (Screenshot 1)
    'A general-purpose autonomous agent running in a remote, Google-hosted Linux environment.':
      '运行在 Google 托管远程 Linux 环境中的通用自主智能体。',
    'Our agent for long-running context gathering & synthesis tasks, optimized for speed and efficiency.':
      '面向长时间上下文搜集与综合分析任务的智能体，针对速度与效率进行了优化。',
    'Our SOTA agent for long-running context gathering & synthesis tasks, optimized for maximum search exhaustiveness and report comprehensiveness.':
      '面向长时间上下文搜集与综合分析任务的前沿智能体，针对最大化检索完备度与报告全面性进行了优化。',

    // Gemini 4 Series Descriptions
    'Frontier-level intelligence with fast end-to-end task completion across complex reasoning, coding, and agentic workflows.':
      '具备前沿级智能，擅长在复杂推理、编程与智能体工作流中快速完成端到端交付。',
    'Frontier-level intelligence with fast end-to-end task completion across complex coding, science, and agentic workflows.':
      '具备前沿级智能，擅长在复杂编程、科学研究与智能体工作流中快速完成端到端交付。',
    'An efficient model with cutting-edge intelligence for fast, dependable execution across coding, agentic workflows, and multimodal knowledge.':
      '高效且具备前沿智能的模型，可在编程、智能体工作流和多模态知识任务中实现快速、可靠的执行。',
    'Our flagship frontier model for deep reasoning, complex software engineering, and long-horizon agentic tasks.':
      '旗舰级前沿模型，专为深度推理、复杂软件工程与长周期智能体任务打造。',
    'Lightweight, ultra-fast Gemini 4 model optimized for high-throughput, low-latency workloads.':
      '轻量超高速的 Gemini 4 模型，专为高吞吐、低延迟任务优化。',

    // Gemini 3 / 3.1 / 3.5 / 3.8 Series Descriptions
    'Our most capable Gemini 3 model for complex reasoning, coding, and multimodal understanding.':
      '能力最强的 Gemini 3 模型，适用于复杂推理、编程与多模态理解。',
    'Advanced reasoning model with adaptive thinking for coding, math, and multi-step tool use.':
      '具备自适应思考能力的进阶推理模型，擅长编程、数学与多步骤工具调用。',
    'Fast, frontier-class multimodal model balancing high intelligence with low latency.':
      '高速前沿多模态模型，兼顾高智能与低延迟。',
    'High-speed, cost-efficient model built for responsive chat, extraction, and high-frequency tasks.':
      '高速且高性价比的模型，专为高响应对话、信息提取与高频任务构建。',
    'Ultra-fast, cost-effective model for large-scale text processing and low-latency interactions.':
      '超高速、极具成本效益的模型，适用于大规模文本处理与低延迟交互。',

    // Gemini 2.5 & Specialized Variants
    'Our most advanced thinking model for complex reasoning, coding, and multimodal tasks.':
      '先进的深度思考模型，适用于复杂推理、编程与多模态任务。',
    'Best model in terms of price-performance, offering well-rounded capabilities and thinking.':
      '兼具出色性价比与全面能力的均衡模型，支持深度思考。',
    'Our fastest, most cost-efficient multimodal model for high-frequency tasks.':
      '速度最快、性价比最高的多模态模型，适合高频调用任务。',
    'Optimized for real-time, low-latency conversational audio and video interactions.':
      '专为实时、低延迟的语音与视频对话交互优化。',
    'Native audio model with expressive, natural-sounding speech output and affective dialog.':
      '原生音频模型，支持富有表现力的自然语音输出与情感化对话。',
    'Text-to-speech model for controllable, natural single- and multi-speaker audio generation.':
      '文本转语音模型，支持可控、自然的单人与多人对话音频生成。',
    'Specialized model for automated browser and desktop UI interaction workflows.':
      '专为自动化浏览器与桌面界面操作工作流打造的专用模型。',
    'Text embedding model producing high-dimensional vectors for semantic search and retrieval.':
      '文本向量嵌入模型，可生成用于语义搜索与检索的高维向量。',
    'Embodied reasoning model optimized for spatial understanding and robotics control.':
      '具身推理模型，针对空间理解与机器人控制进行了优化。',

    // Media Generation & Open Models (Nano Banana, Imagen, Veo, Lyria, Gemma)
    'Fast, high-efficiency image generation and multi-turn conversational image editing.':
      '高速高效的图像生成模型，支持多轮对话式图像编辑。',
    'Studio-quality image generation and editing with advanced typography and complex layout control.':
      '工作室级图像生成与编辑模型，具备优异的文字排版与复杂构图控制能力。',
    'Next-generation image generation and editing model balancing speed and photorealistic detail.':
      '新一代图像生成与编辑模型，兼顾生成速度与照片级细节表现。',
    'Our flagship image generation model delivering photorealism, sharp text rendering, and rich detail.':
      '旗舰级图像生成模型，呈现照片级真实感、清晰文字渲染与丰富细节。',
    'High-quality text-to-image generation model for creative visual workflows.':
      '高质量文生图模型，适用于各类创意视觉工作流。',
    'State-of-the-art video generation model with synchronized native audio and cinematic control.':
      '前沿视频生成模型，支持同步原生音频与电影级运镜控制。',
    'High-definition video generation model capable of producing realistic motion from text or images.':
      '高清视频生成模型，可根据文本或图像生成流畅逼真的动态画面。',
    'High-fidelity music generation model creating full tracks with structured vocals and instrumentation.':
      '高保真音乐生成模型，可创作包含完整人声与器乐编排的歌曲。',
    'Lightweight, open-weights multimodal models built for local deployment and custom fine-tuning.':
      '轻量级开放权重多模态模型，专为本地部署与自定义微调打造。',
    'Compact open-weights model designed to run efficiently on mobile and edge devices.':
      '紧凑型开放权重模型，专为在移动端与边缘设备上高效运行而设计。',
  };

  // --- dictionaries/tooltips.js ---
  const TOOLTIPS_DICT = {
    // Media Resolution & Output Tooltips (Screenshot 3)
    'Higher resolutions may provide better understanding but use more tokens.':
      '更高的分辨率有助于提升模型理解效果，但会消耗更多 Token。',
    'Higher resolution may provide better understanding, but uses more tokens.':
      '更高的分辨率有助于提升模型理解效果，但会消耗更多 Token。',
    'Higher resolutions use more tokens and may increase latency.':
      '更高的分辨率会消耗更多 Token，并可能增加响应延迟。',

    // Sampling & Parameter Tooltips
    'Controls the randomness of the output. Lower values are more deterministic, while higher values are more creative.':
      '控制模型输出的随机性。数值越低结果越确定严谨，数值越高越有创造力。',
    'Probability threshold for nucleus sampling. Lower values restrict token selection to higher-probability candidates.':
      '核采样的累积概率阈值。数值越低，模型越倾向于仅从高概率词中采样。',
    'Limits the model to sampling from the top K most likely next tokens.':
      '限制模型每一步仅从概率最高的 K 个候选 Token 中进行采样。',
    'Maximum number of tokens the model can generate in a single response.':
      '模型在单次回复中允许生成的最大 Token 数量。',
    'Character sequences that will stop the model from generating further tokens.':
      '自定义文本序列；模型一旦生成该序列便会立即停止继续输出。',
    'Set a fixed seed to make model outputs more reproducible across identical requests.':
      '设置固定的随机种子，使相同请求的输出结果更易于复现。',

    // Thinking Tooltips
    'Controls how much internal reasoning the model performs before responding.':
      '控制模型在给出最终回复前进行内部推理思考的深度。',
    'Higher thinking levels improve complex reasoning at the cost of higher latency and token usage.':
      '更高的思考等级有助于提升复杂推理能力，但会增加响应时间与 Token 消耗。',
    'Sets the maximum number of thinking tokens the model may use for reasoning.':
      '设置模型在内部推理过程中最多可消耗的思考 Token 数量。',
    'Include the model\'s internal thought summary alongside the final response.':
      '在最终回复中一并显示模型的思考摘要过程。',

    // Tools & Grounding Tooltips
    'Constrain the model output to follow a specified JSON schema.':
      '约束模型严格按照指定的 JSON Schema 格式输出结构化结果。',
    'Allow the model to write and execute Python code to verify logic and perform calculations.':
      '允许模型编写并运行 Python 代码，用于逻辑验证与数值计算。',
    'Define custom functions that the model can request your application to execute.':
      '定义可供模型请求调用的自定义函数，以便与外部系统或 API 交互。',
    'Connect model responses to real-time information from Google Search with source citations.':
      '通过 Google 搜索将模型回复关联至实时网页信息，并提供参考来源引用。',
    'Allow the model to fetch and analyze content directly from URLs provided in your prompt.':
      '允许模型直接抓取并分析提示词中所提供网页链接的内容。',
    'Ground model responses with location and place data from Google Maps.':
      '借助 Google 地图的位置与地点数据增强模型回复的准确性。',

    // Safety & Workspace Control Tooltips
    'Adjust safety filter thresholds across harm categories.':
      '按不同风险类别调整安全过滤器的拦截阈值。',
    'Reset all run settings to their default values.':
      '将所有运行设置恢复为默认值。',
    'Open system instructions to guide model behavior, tone, and persona.':
      '打开系统指令面板，用于设定模型的行为规范、语气与角色定位。',
    'Start a temporary chat that is not saved to your history or Google Drive.':
      '开启临时对话，对话内容不会保存到您的历史记录或 Google 云端硬盘。',
    'Toggle between rendered Markdown and raw text view.':
      '在 Markdown 渲染视图与原始纯文本视图之间切换。',
    'Copy the conversation in Markdown format.':
      '以 Markdown 格式复制当前对话内容。',
    'Save changes to Google Drive.':
      '将更改保存到 Google 云端硬盘。',
    'Automatically save changes to Google Drive.':
      '自动将更改保存到 Google 云端硬盘。',
    'Compare outputs from two or more models side by side.':
      '并排对比两个或多个模型的输出效果。',
    'View code snippets to call this prompt using the Gemini API.':
      '查看通过 Gemini API 调用当前提示词的代码片段。',
  };

  // --- dictionaries/patterns.js ---
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

  const REGEX_PATTERNS = [
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

  // --- dictionaries/index.js ---
  const DICTIONARY_MODULES = {
    common: COMMON_DICT,
    navigation: NAVIGATION_DICT,
    workspace: WORKSPACE_DICT,
    runSettings: RUN_SETTINGS_DICT,
    streamMediaBuild: STREAM_MEDIA_BUILD_DICT,
    dashboardApi: DASHBOARD_API_DICT,
    models: MODELS_DICT,
    tooltips: TOOLTIPS_DICT,
  };

  const EXACT_DICT = new Map();
  const LOWER_DICT = new Map();

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

  function shouldAttemptTranslate(trimmed) {
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

  function isKnownTerm(fragment) {
    const normalized = normalizeLookupKey(String(fragment || ''));
    if (!normalized) {
      return false;
    }
    return EXACT_DICT.has(normalized) || LOWER_DICT.has(normalized.toLowerCase());
  }

  function isIdentityTerm(trimmed) {
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

  function translateText(rawText) {
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

  // --- core/auto-translator.js ---
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

  class AutoTranslator {
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

  // --- core/translator.js ---
  function scheduleFrame(callback) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      return globalThis.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 0);
  }

  class TranslatorEngine {
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

  // --- core/scanner.js ---
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

  class UntranslatedScanner {
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

  // --- core/menu.js ---
  class MenuController {
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

  // --- main.js ---
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

  function bootstrap() {
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
})();
