# 任务：把 ph-260723 的 Agent 接到杂货店「小柴」AI 解忧

契约源：`docs/AI-CONCIERGE.md` + `api/ai/concierge.ts`。
Agent 源：`D:/Users/ycp/Desktop/agent开发学习/ph-260723`（FastAPI + LangGraph「小柴」=Relieving_Sorrow，qwen 多模态 + Tavily 搜索）。

## 契约不匹配（现状）
| | 杂货店要的 | Agent 现有 |
|---|---|---|
| 端点 | `POST {AI_CONCIERGE_URL}` | `POST /api/v1/chat/stream` |
| 方式 | 非流式，回 `{reply}` | SSE 流式 |
| 入参 | `{message, history[], requestId, attachments[]}` | `{message, image_url?, thread_id}` |
| 记忆 | 每次带 history（无状态） | 服务端 checkpointer 按 thread_id |
| 附件 | `attachments[]`（base64 dataUrl，多张） | 单 `image_url` |

## 方案：Agent 加适配端点，杂货店只改 .env
不动 Agent 现有 `/chat/stream`（私厨前端仍用）；新增一个对齐杂货店契约的端点，复用现有 `agent`。

## Todo
- [x] 1. Agent：新建 `app/api/v1/concierge.py`（/chat 契约端点 + reply()）。
- [x] 2. Agent：`app/main.py` 挂载 concierge.router（root，/chat）+ chat.router（/api/v1）。
- [x] 3. Agent：`uv run uvicorn app.main:app --port 8001` 后台启动（**不用 reload**，sqlite 写入会触发无限重载）。
- [x] 4. 杂货店：`.env` 加 `AI_CONCIERGE_URL=http://127.0.0.1:8001/chat`，重启 dev（清掉 3001/3002 孤儿进程后跑 3002）。
- [x] 5. 验证：curl `/chat` 直连、curl 杂货店 `chat.send`、浏览器点小柴——全通。

## Review
### 做了什么（新建独立项目 `解忧杂货店项目/jieyou-ai-concierge/`）
- 镜像 `ph-260723` 的结构/风格/插件：FastAPI + LangGraph `create_agent` + `SqliteSaver` + qwen 多模态（`init_chat_model`）+ TavilySearch + 「小柴」系统提示词。
- 新增 `app/api/v1/concierge.py`：`POST /chat`，入参 `{message, history[], requestId, attachments[]}`、回 `{reply}`，对齐 `docs/AI-CONCIERGE.md`。
- `Relieving_Sorrow.py` 加 `reply()`：把 history+本次消息（图片走 OpenAI `image_url` 块、文件解码为文本）喂给 `agent.invoke`，取最后一条 AIMessage。保留原 `search_recipes`（流式）。
- `.env` 从 ph-260723 复制（含 AL_API_KEY/TAVILY_API_KEY 等，未读取值）。
- 杂货店 `.env` 加 `AI_CONCIERGE_URL=http://127.0.0.1:8001/chat`。**杂货店代码零改动**（`concierge.ts` 本就会 POST 该地址）。

### 修复的坑
- **SqliteSaver 不支持 async**：最初用 `agent.ainvoke` 报错，改回同步 `agent.invoke`（与参考 Agent 的同步 `agent.stream` 一致）。
- **reload=True 死循环**：`python -m app.main` 的 reload 监听 `./db/`，sqlite 写入触发无限重载。改用 `uvicorn` 直接启动（不带 reload），`main.py` 风格保留。
- **端口孤儿**：3001/3002 旧 vite 进程 kill 不干净，`taskkill //PID //F` 清掉后 3002 --strictPort 起来。

### 验证（全绿）
- 直连 `POST 127.0.0.1:8001/chat`（失眠问题）→ 真 qwen+Tavily 小柴回复。
- 杂货店 `POST /api/trpc/chat.send` → 转发 → agent → 带 requestId 的 reply 返回。
- 浏览器点小柴 → 发"我今天好累…"→ 收到 in-character 回复（"才不是没用呢…陪你一起发呆"）。

### 运行（两个进程都要起）
- 小柴大脑：`jieyou-ai-concierge/` 下 `uv run uvicorn app.main:app --host 127.0.0.1 --port 8001`（后台任务 `b9tbfw0tj`）。
- 网站：`jieyou-grocery-store/` 下 `npm run dev -- --port 3002 --strictPort`（后台任务 `bv41y9a4i`）。
- 浏览器开 http://localhost:3002 ，点右下角小柴。

### 注意
- 30s 超时：Agent 带 Tavily 偶发慢可能超时→杂货店自动兜底，用户不报错。
- 记忆：按 requestId 当一次性会话，靠杂货店传入 history，不跨请求复用服务端 sqlite 记忆。

---

## 后续改动（UI 对齐 + 图片走 OSS）

### 1. 聊天面板 UI（`src/components/shiba/ShibaChatPanel.tsx`）
- 输入行 `flex items-end` → `flex items-center`：附件/发送按钮与输入框**垂直居中对齐**。
- 两个按钮去掉 `shadow-paper`，改用更淡内联阴影 `boxShadow: '0 1px 3px rgba(107,74,50,.10)'`（不动 tailwind config 的 `shadow.paper`，避免影响消息气泡等）。

### 2. Agent 图片走 OSS（`jieyou-ai-concierge`）
- `pyproject.toml` 加 `alibabacloud-oss-v2>=1.3.2`（与你项目同版），`uv sync` 装好。
- 新建 `app/common/oss.py`：镜像你 `oss.py` 的 client（EnvironmentVariableCredentialsProvider + region cn-beijing），`upload_image(bytes, ext)->URL` + `data_url_to_oss(dataUrl, mime)`（base64 解码→上传→返回 OSS URL，**失败回退 dataUrl** 保证可用）。
- `Relieving_Sorrow.py` 的 `reply()`：图片附件改走 `data_url_to_oss` 拿 OSS URL 再喂模型（替代原 base64 dataUrl 直传）。非图片附件仍是解码文本。
- `.env` 已含 `OSS_ACCESS_KEY_ID/SECRET/BUCKET`（从你项目复制）；endpoint 默认 `oss-cn-beijing.aliyuncs.com`，bucket `pete-9527`。
- 验证：1x1 占位图能上传 OSS（URL 生成）但模型拒（图太小）；**真实 shiba-happy.png 上传 OSS → qwen 多模态看图回复**（描述出柴犬），HTTP 200。日志可见 `[OSS] 上传图片 -> https://pete-9527.oss-cn-beijing.aliyuncs.com/shiba/xxx.png`。