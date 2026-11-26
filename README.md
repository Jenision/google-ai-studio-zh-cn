<!-- spell-checker: disable -->

<div align="center"></div>
<br>
<div align="center">

「 Google AI Studio 完整简体中文界面汉化油猴脚本 」

</div>

[📦 安装](#安装)

[⚙ 设置](#设置)

[📚 功能](#功能)

[👻 兼容性](#兼容性)

[🐛 版本历史与更新日志]()

[📌 更新计划]()

[📕 文档站点]()

[📖 参与开发](#参与项目)

[❤ 捐助]()

# 安装
需要浏览器装有 [Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/) 或 [ScriptCat](https://docs.scriptcat.org/) 插件，下方表格中挑一个链接安装。

**注意事项**
- 也可打开本仓库中的 [dist/google-ai-studio-zh-cn.user.js](dist/google-ai-studio-zh-cn.user.js)，复制全部代码并在脚本管理器中新建脚本粘贴保存。
- 安装完成后，访问或刷新 [https://aistudio.google.com/](https://aistudio.google.com/) 即可生效。
- 启用「模型简介/悬浮说明自动补译」功能访问外部翻译接口（`translate.googleapis.com`）时，脚本管理器可能会提示“脚本试图访问跨域资源”，请选择“始终允许”避免下次还提示。

| 正式版 (jsDelivr 源)                                                                                                      | 正式版 (GitHub 源)                                                                                                       | 预览版 |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| [安装](https://cdn.jsdelivr.net/gh/Jenision/google-ai-studio-zh-cn@main/dist/google-ai-studio-zh-cn.user.js)              | [安装](https://raw.githubusercontent.com/Jenision/google-ai-studio-zh-cn/main/dist/google-ai-studio-zh-cn.user.js)       |        |

# 设置
脚本启用后，在 [Google AI Studio](https://aistudio.google.com/) 页面点击浏览器工具栏中的脚本管理器图标，即可在油猴菜单中使用以下 6 项控制功能：

- `✅ 汉化已开启（点击暂停）` / `⏸️ 汉化已暂停（点击开启）`：一键热切换并无损还原英文原貌。
- `🔄 立即重新扫描汉化`：手动全量重扫当前页面。
- `🔍 扫描页面未汉化词条`：Shadow DOM 隔离弹窗，支持关键词搜索、**「仅显示可见文本（隐藏无障碍标签）」** 过滤、复制单条或完整 JSON 模板及导出 `.json` 文件。
- `🖍️ 高亮/取消高亮未汉化元素`：在页面上用橙色虚线框标出未汉化 UI 元素。
- `🌐 模型简介/悬浮说明自动补译：已开启 / 已关闭`：随时开关自动补译。
- `🗑️ 清空自动补译缓存`：清除本地自动补译缓存并刷新翻译。

# 功能
- **8 大模块化词库 + 50+ 动态正则规则**：
  - 覆盖导航栏与资源库、对话工作区、系统指令弹窗、快捷命令面板（`Ctrl + /`）、运行设置（温度、Top P、Top K、思考等级含“极高”、结构化输出、函数调用、Google 搜索联网、URL 上下文、安全设置）。
  - 覆盖模型选择弹窗（含全部常见模型简介、发布日期、多模型账单说明）、Stream Realtime 实时流、Generate Media 媒体生成、Build 应用构建、API 密钥管理、用量与速率限制仪表盘、日志与微调页面。
- **零闪烁浮层与悬浮说明翻译**：
  - 针对 Angular CDK 浮层、下拉菜单、对话框及 Tooltip 悬浮提示启用同步即时汉化，鼠标悬停即可直接显示中文。
- **安全精准的 DOM 替换**：
  - 仅原位修改 `Text.nodeValue` 及 `placeholder` / `title` / `aria-label` 属性，不破坏 Angular 数据绑定。
  - 严格跳过 `<mat-icon>`、`.material-symbols-*`、`.google-symbols` 图标字体，防止图标异常。
  - 严格保护用户提示词正文、模型回复 Markdown（`ms-cmark-node`）、代码块（`<pre>` / `<code>` / Monaco / CodeMirror）及可编辑区域。
  - 基于 `WeakMap` 记录原文，切换暂停时无损还原英文原貌，避免内存泄漏。
- **按需缓存自动补译（可选，默认开启）**：
  - 对词库尚未收录的新上线模型简介与悬浮提示，通过 `GM_xmlhttpRequest` 自动翻译并持久化缓存至本地存储（`GM_setValue`），同一词条仅请求一次，绝不触碰聊天内容与代码区。

# 配置
## 最低配置

## 推荐配置

# 兼容性

## 脚本管理器

### [Tampermonkey](https://www.tampermonkey.net/) / [Violentmonkey](https://violentmonkey.github.io/) / [ScriptCat](https://docs.scriptcat.org/)
兼容。

### [Greasemonkey](https://www.greasespot.net/)

### [AdGuard](https://adguard.com/zh_cn/adguard-windows/overview.html)

## 浏览器

# 开发者

<a href="https://github.com/Jenision/google-ai-studio-zh-cn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Jenision/google-ai-studio-zh-cn" />
</a>

## 参与项目

### 本地开发与构建
项目采用零第三方依赖的纯 Node.js（ESM）工程结构：

```bash
# 构建单文件油猴脚本到 dist/google-ai-studio-zh-cn.user.js（含版本号与词库冲突校验）
npm run build

# 运行单元测试与产物 VM 沙盒测试
npm test

# 一键构建 + 验证
npm run check
```

### 项目结构
```text
google-ai-studio-zh-cn/
├── .github/workflows/ci.yml            # GitHub Actions 自动构建与测试流水线
├── src/
│   ├── meta.js                         # UserScript 元信息头
│   ├── config.js                       # 选择器白/黑名单与全局配置
│   ├── main.js                         # 入口、SPA 路由监听与调试接口
│   ├── core/
│   │   ├── translator.js               # 增量 DOM 汉化引擎与无损还原
│   │   ├── auto-translator.js          # 模型简介/悬浮提示缓存自动补译
│   │   ├── scanner.js                  # 未汉化词条扫描器与导出弹窗
│   │   └── menu.js                     # 油猴菜单控制器
│   └── dictionaries/
│       ├── common.js                   # 通用按钮、状态与套餐提示
│       ├── navigation.js               # 侧边栏、顶部导航与资源库
│       ├── workspace.js                # 对话工作区、指令弹窗与命令面板
│       ├── run-settings.js             # 运行设置、参数、工具与安全设置
│       ├── models.js                   # 模型选择弹窗与模型简介
│       ├── tooltips.js                 # 运行设置与工作区悬浮说明
│       ├── stream-media-build.js       # 实时流、媒体生成与 Build 构建
│       ├── dashboard-api.js            # 仪表盘、API 密钥、用量与日志
│       ├── patterns.js                 # 动态文本正则匹配规则
│       └── index.js                    # 词库聚合与匹配管线
├── scripts/build.mjs                   # 零依赖构建与词库校验脚本
├── tests/run-tests.mjs                 # 单元测试与产物沙盒测试
├── dist/google-ai-studio-zh-cn.user.js # 构建生成的完整单文件脚本
├── LICENSE                             # MIT 开源协议
└── package.json
```

### 贡献词库
当 Google AI Studio 上线新界面或新词条时：
1. 点击油猴菜单中的 **「🔍 扫描页面未汉化词条」**；
2. 勾选 **「仅显示可见文本（隐藏无障碍标签）」** 并点击 **「复制 JSON 模板」**；
3. 将翻译补充至 `src/dictionaries/` 对应模块，运行 `npm run check` 验证无误后提交 PR 即可。

# 隐私声明
本脚本不收集任何统计数据，所有设置与缓存均保存在本地。声明的油猴权限及用途如下：

| 声明权限 | 用途说明 |
| --- | --- |
| `GM_getValue` / `GM_setValue` | 保存汉化开关状态、自动补译开关及本地翻译缓存 |
| `GM_registerMenuCommand` / `GM_unregisterMenuCommand` | 在油猴扩展菜单中注册与动态更新控制项 |
| `GM_setClipboard` | 在未汉化扫描器中一键复制 JSON 词库模板 |
| `GM_xmlhttpRequest`（`@connect translate.googleapis.com`） | 仅用于按需翻译未收录的模型简介与悬浮提示词条，**绝不读取或发送用户的对话内容、提示词正文或 API 密钥** |

# 开源许可

见 [LICENSE](./LICENSE).

# 第三方开源组件
本项目采用零第三方依赖的纯 Node.js（ESM）工程结构，无外部运行时依赖。

# 相关推荐

----

**喜欢的话就点个⭐Star 吧(°∀°)ﾉ**

**或者也可以考虑[捐助]()支持一下哦(｀・ω・´)**

爱发电

微信

----

# 我写的其他一些玩意

----
