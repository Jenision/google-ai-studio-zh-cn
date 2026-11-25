export const TOOLTIPS_DICT = {
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
