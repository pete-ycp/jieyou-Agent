# 任务：回信接入 Agent（手动 + AI 两种）

现有手动回信：`adminRouter.replyLetter` → `letterQ.replyLetter`（pending→replied）。
回信工作台：`src/components/admin/AdminLetters.tsx`（textarea `reply` + 「放入牛奶箱」按钮）。

## 方案
- Agent 侧（jieyou-ai-concierge）新增 `POST /draft-reply`：浪矢爷爷口吻，吃 `{penName, category, content}`，回 `{reply}`。复用 qwen model，不用工具（快、<30s）。
- 网站侧新增 `admin.aiDraftReply` mutation（adminQuery）：取信件 → POST 到 `AI_DRAFT_URL` → 返回草稿。编辑器加「AI 起草」按钮填入 textarea。
- 手动回信流程零改动。

## Todo
- [x] 1. Agent：`Relieving_Sorrow.py` 加浪矢 system prompt + `draft_letter_reply()`。
- [x] 2. Agent：`concierge.py` 加 `POST /draft-reply` 端点 + schemas。
- [x] 3. Agent：重启 concierge，curl 测 `/draft-reply`。
- [x] 4. 网站：新建 `api/ai/draft.ts`（POST 到 `AI_DRAFT_URL`）。
- [x] 5. 网站：`adminRouter.aiDraftReply` mutation + `.env` 加 `AI_DRAFT_URL`。
- [x] 6. 网站：`AdminLetters.tsx` 编辑器加「✨ AI 起草」按钮。
- [x] 7. 重启网站 dev，端到端验证（AI 起草→填入→手动发送）。

## Review
### 模式
AI 起草 + 手动发送：点「✨ AI 起草」→ 草稿填进编辑器 → 店主审阅/修改 → 手动「放入牛奶箱」。人保留最终控制权，手动回信流程零改动。

### 改动
- **Agent**（jieyou-ai-concierge）：
  - `Relieving_Sorrow.py`：加 `LETTER_SYSTEM_PROMPT`（浪矢雄治人设 + 回信 SOP + 浪矢杂货店落款）+ `draft_letter_reply(penName, category, content)`（直接 `model.invoke([SystemMessage, HumanMessage])`，不走 Agent/工具，快）。
  - `schemas.py`：加 `DraftReplyRequest`。
  - `concierge.py`：加 `POST /draft-reply` 端点，回 `{reply}`。
- **网站**（jieyou-grocery-store）：
  - `api/ai/draft.ts`（新）：`draftLetterReply()` POST 到 `AI_DRAFT_URL`，30s 超时，未配置/异常抛错。
  - `routers-shop.ts`：`adminRouter.aiDraftReply`（adminQuery，取信件→起草→返回草稿）。
  - `.env`：加 `AI_DRAFT_URL=http://127.0.0.1:8001/draft-reply`。
  - `AdminLetters.tsx`：编辑器底部加「✨ AI 起草」按钮（`draftMutation` 成功 `setReply(draft)` + toast）。
- **手动回信**：`replyLetter` 流程未动。

### 人设区分
- 小柴（`/chat`）：柴犬见习解忧员，口语、偶尔"汪"。
- 回信（`/draft-reply`）：浪矢爷爷老店主，深夜写信口吻，落款"——浪矢杂货店"。
两套 system prompt，互不干扰。

### 验证
- curl `/draft-reply`（爱情烦恼）→ 浪矢口吻草稿（共情/不替决定/具体建议/交还选择权/落款）。
- 浏览器：admin 登录 → /admin 回信工作台 → 选 pending 信 → 「✨ AI 起草」→ toast 提示 + 编辑器填入完整回信 → 「放入牛奶箱」按钮变可用（手动发送）。

### 踩坑
- 8001 旧 concierge 孤儿占端口（Windows kill 残留）→ `taskkill //PID //F` 清后再起。
- env `AI_DRAFT_URL` 进程启动时读，HMR 不重载 → 改 `.env` 后必须重启网站 dev。