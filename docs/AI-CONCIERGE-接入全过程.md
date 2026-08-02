# 小柴 AI Agent 接入全过程（学习文档）

> 目标读者：想把一个自己写的 LangGraph Agent，接入到「解忧杂货店」网站右下角柴犬「小柴」的人。
> 本文记录了**实际接入的每一步**：从读懂两边契约、到新建 Python 服务、到打通端到端、到踩过的坑。
> 配套阅读：`docs/AI-CONCIERGE.md`（网站侧契约规范）。

---

## 0. 一句话总结

网站右下角的「小柴」聊天，前端调用 tRPC `chat.send` → 网站后端 `api/ai/concierge.ts` 把消息 **POST 到一个地址 `AI_CONCIERGE_URL`** → 那个地址就是我们自己起的 Agent 服务 → 它返回 `{ "reply": "..." }` → 回显给用户。

**我们要做的，就是「实现那个地址」。** 网站代码一行都不用改（除了 `.env` 加一行）。

---

## 1. 先读懂网站侧的契约（甲方需求）

网站代码里已经预留了对接点。三份关键文件：

### 1.1 `docs/AI-CONCIERGE.md`（人读的规范）
规定了唯一的对接接口：

```
POST {AI_CONCIERGE_URL}
请求体（JSON）:
{
  "message":   "用户这次说的话，0~800字",
  "history":   [{ "role": "user"|"assistant", "content": "..." }],  // 最近20条，不含本次
  "requestId": "本次请求唯一ID",
  "attachments":[ { "name","mimeType","dataUrl":"data:image/png;base64,...","size" } ]  // 可选，多模态
}
响应体（HTTP 200）:
{ "reply": "AI 的回复文本" }
```

要点：
- `history` **每次都带**（网站不存聊天记录，刷新就清空），最多 20 条。
- 30 秒超时；超时或异常 → 网站自动回退到 `concierge.ts` 里的兜底文案，用户看不到报错。
- `attachments` 里的图片是 base64 `dataUrl`。

### 1.2 `api/ai/concierge.ts`（机读的实现）
网站的转发逻辑，核心两段：

```ts
const AI_CONCIERGE_URL = process.env.AI_CONCIERGE_URL;

export async function getConciergeReply(input) {
  if (AI_CONCIERGE_URL) {
    try {
      const reply = await callYourAgent({ message, history, requestId, attachments });
      return { reply, requestId };
    } catch (err) { /* 回退兜底 */ }
  }
  return { reply: fallbackReply(...), requestId };   // 没配地址就用兜底文案
}

async function callYourAgent(payload) {
  const res = await fetch(AI_CONCIERGE_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),   // 30s 超时
  });
  // ... 校验后返回 data.reply
}
```

**结论**：只要在 `.env` 里配 `AI_CONCIERGE_URL`，网站就会把聊天 POST 过来。它不在乎后面是 Python、Java 还是个 echo 服务，只要回 `{reply}`。

### 1.3 `api/routers-chat.ts`（tRPC 路由）
`chat.send` 用 zod 校验入参（message ≤800 字、history ≤20、attachments ≤3 且单个 ≤4MB），然后调 `getConciergeReply`。是 `publicQuery`——**不需要登录**就能聊。

---

## 2. 再读懂参考 Agent（乙方现状）

参考项目 `ph-260723`（一个私厨/解忧 Agent），技术栈：

| 项 | 内容 |
|---|---|
| 框架 | FastAPI + uvicorn |
| Agent | LangGraph `create_agent` |
| 记忆 | `SqliteSaver`（按 `thread_id` 存） |
| 模型 | qwen 多模态（OpenAI 兼容协议，`init_chat_model`） |
| 工具 | `TavilySearch`（联网搜索） |
| 人设 | 「小柴」系统提示词（解忧杂货店见习解忧员） |

它**现有的接口**（`app/api/v1/chat.py`）：
- `POST /api/v1/chat/stream` —— **流式 SSE**，入参 `{ message, image_url?, thread_id }`，一段段吐 token。

### 2.1 契约不匹配对照表

| | 网站要的 | 参考Agent现有 |
|---|---|---|
| 端点 | `POST {URL}` | `POST /api/v1/chat/stream` |
| 方式 | 非流式，回 `{reply}` | SSE 流式 |
| 入参 | `{message, history[], requestId, attachments[]}` | `{message, image_url?, thread_id}` |
| 记忆 | 每次带 history（无状态） | 服务端按 thread_id 记 |
| 附件 | `attachments[]`（base64 dataUrl，多张） | 单个 `image_url` |

**两边对不上**，不能直接连。

---

## 3. 方案选型

三个选项：

1. **改网站去适配 Agent 的 `/chat/stream`** —— 要改网站后端 + 前端（流式），改动大，破坏网站现有契约。
2. **在参考 Agent 里加一个适配端点** —— 改别人的项目。
3. **新建一个独立 Python 项目，镜像参考 Agent，再加一个对齐网站契约的 `/chat` 端点** ✅

选 **3**：
- 不动网站（只加一行 `.env`）。
- 不动参考 Agent（它继续服务自己的私厨前端）。
- 新项目独立、可单独部署、结构/风格/插件和参考 Agent 完全一致。

> 新项目位置：`解忧杂货店项目/jieyou-ai-concierge/`（与网站同级）。

---

## 4. 新项目搭建

### 4.1 目录结构（镜像参考 Agent）
```
jieyou-ai-concierge/
├── pyproject.toml          # uv 依赖（清华源）
├── langgraph.json          # LangGraph 图：chief_agent
├── .env / .env.example     # 模型/搜索/OSS key
├── db/                     # 运行时 sqlite 记忆库（自动生成）
└── app/
    ├── main.py             # FastAPI 入口（CORS + 路由，uvicorn 8001）
    ├── api/v1/
    │   ├── chat.py         # 流式对话（/api/v1/chat/stream，保留，和参考一致）
    │   └── concierge.py    # ★ 网站契约端点 POST /chat（新增）
    ├── agents/Relieving_Sorrow.py  # 小柴 Agent + reply()
    ├── models/schemas.py   # Pydantic 模型
    └── common/{logger.py, oss.py}
```

### 4.2 `pyproject.toml`（依赖与参考 Agent 一致 + uvicorn + oss）
```toml
[project]
name = "jieyou-ai-concierge"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.141.1", "uvicorn>=0.30.0",
    "langchain>=1.3.14", "langchain-community>=0.4.2",
    "langchain-deepseek>=1.1.0", "langchain-tavily>=0.2.18",
    "langgraph-checkpoint-sqlite>=3.1.0", "langgraph-cli[inmem]>=0.4.31",
    "openai>=2.47.0", "python-dotenv>=1.2.2",
    "alibabacloud-oss-v2>=1.3.2",   # 图片走 OSS 时才需要
]
[[tool.uv.index]]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
default = true
```

### 4.3 `.env`（从参考项目复制，不读值）
需要的 key：`AL_API_KEY` / `AL_BASE_URL`（qwen 模型）、`TAVILY_API_KEY`（搜索）、以及图片走 OSS 时的 `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `OSS_BUCKET`。

### 4.4 安装与启动
```bash
cd jieyou-ai-concierge
uv sync                                                    # 装依赖
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001   # 启动（勿加 --reload，见坑①）
```

---

## 5. 关键实现：`/chat` 适配端点

这是整个接入的**核心**——把网站的入参翻译成 LangChain 的消息，调 Agent，再包成 `{reply}`。

### 5.1 数据模型（`app/models/schemas.py`）
```python
class ChatMessage(BaseModel):
    role: str        # "user" | "assistant"
    content: str

class ConciergeAttachment(BaseModel):
    name: str
    mimeType: str
    dataUrl: str     # data:image/png;base64,...
    size: int

class ConciergeRequest(BaseModel):
    message: str = ""
    history: List[ChatMessage] = []
    requestId: str = ""
    attachments: List[ConciergeAttachment] = []
```

### 5.2 端点（`app/api/v1/concierge.py`）
```python
import uuid
from fastapi import APIRouter
from app.models.schemas import ConciergeRequest
from app.agents.Relieving_Sorrow import reply
from app.common.logger import logger

router = APIRouter()

@router.post("/chat")
async def concierge(req: ConciergeRequest):
    # 网站每次都带 history，所以按 requestId 当一次性会话（无状态）
    thread_id = req.requestId or str(uuid.uuid4())
    history = [m.model_dump() for m in req.history]
    attachments = [a.model_dump() for a in req.attachments]
    text = await reply(req.message, history, attachments, thread_id)
    return {"reply": text}
```

### 5.3 核心函数 `reply()`（`app/agents/Relieving_Sorrow.py`）
三件事：还原历史、组装本次消息（含多模态附件）、调 Agent 取回复。

```python
async def reply(prompt, history, attachments, thread_id) -> str:
    try:
        # 1. 还原历史消息（网站每次把最近20条带过来）
        messages = []
        for m in history or []:
            if m.get("role") == "user":
                messages.append(HumanMessage(content=m.get("content", "")))
            elif m.get("role") == "assistant":
                messages.append(AIMessage(content=m.get("content", "")))

        # 2. 组装本次消息：文本 + 多模态附件
        content_blocks = []
        text = (prompt or "").strip()
        if attachments:
            import base64 as _b64
            for att in attachments:
                mime, data_url = att.get("mimeType", ""), att.get("dataUrl", "")
                if mime.startswith("image/") and data_url:
                    # 图片：上传 OSS 拿可访问 URL，再交给多模态模型（见第7节）
                    url = data_url_to_oss(data_url, mime)
                    content_blocks.append({"type": "image_url", "image_url": {"url": url}})
                elif data_url:
                    # 文本类附件：解码后当上下文
                    raw = _b64.b64decode(data_url.split(",", 1)[-1])
                    content_blocks.append({"type": "text",
                        "text": f"[用户上传的文件 {att.get('name')}]\n" + raw[:8000].decode("utf-8", "ignore")})
            if not text:
                text = "（用户发来附件，没有附文字）"
        content_blocks.insert(0, {"type": "text", "text": text})
        messages.append(HumanMessage(content=content_blocks))

        # 3. 调 Agent，取最后一条 AIMessage
        #    ★ 同步 invoke！SqliteSaver 不支持 async（见坑②）
        result = agent.invoke(
            {"messages": messages},
            {"configurable": {"thread_id": thread_id}},
        )
        ai_msgs = [m for m in result["messages"] if isinstance(m, AIMessage) and m.content]
        return ai_msgs[-1].content if ai_msgs else "汪…我一时没想好怎么说，能再说一遍吗？"
    except Exception as e:
        logger.error(f"\n[错误]: {str(e)}")
        return "（小柴打了个盹，没太听清，能再说一遍吗？汪。）"
```

> `agent` 在模块顶层用 `create_agent(model, system_prompt=..., tools=[search_tool], checkpointer=checkpointer)` 建好，和参考 Agent 一模一样。

### 5.4 挂到 FastAPI（`app/main.py`）
```python
app.include_router(concierge.router, tags=["解忧杂货店·小柴"])   # → POST /chat
app.include_router(chat.router, prefix="/api/v1", tags=["对话"]) # 保留流式
```

---

## 6. 网站侧接线（一行）

在网站 `.env` 加：
```bash
AI_CONCIERGE_URL=http://127.0.0.1:8001/chat
```
重启网站后端即可。**网站代码零改动**——`concierge.ts` 本来就会 POST 到这个地址。

---

## 7. 图片走 OSS（可选增强）

参考 Agent 的 `search_recipes` 收的是 `image`（一个 **URL**），说明模型习惯吃 URL 而非 base64。网站传过来的是 base64 `dataUrl`。解法：**服务端把 dataUrl 上传 OSS，拿到 URL 再喂模型**。

### 7.1 `app/common/oss.py`（镜像参考项目的 oss.py）
```python
import alibabacloud_oss_v2 as oss
# ... client 用 EnvironmentVariableCredentialsProvider，region=cn-beijing

def upload_image(data: bytes, ext="png") -> str:
    key = f"shiba/{uuid.uuid4().hex}.{ext}"
    client.put_object(oss.PutObjectRequest(
        bucket=OSS_BUCKET, key=key,
        body=io.BytesIO(data), content_type=content_type))
    return f"https://{OSS_BUCKET}.{OSS_ENDPOINT}/{key}"

def data_url_to_oss(data_url, mime) -> str:
    try:
        raw = base64.b64decode(data_url.split(",", 1)[-1])
        return upload_image(raw, mime_to_ext(mime))
    except Exception:
        return data_url   # 失败回退 dataUrl，保证可用
```

### 7.2 为什么这么做
- 模型收 URL 比 base64 稳定（有些模型拒大 base64）。
- OSS 上留档，可复用、可排查。
- 网站侧完全不用改（还是传 dataUrl）。

---

## 8. 踩过的坑（重点学习）

### 坑①：`reload=True` 导致无限重载
`main.py` 里 `uvicorn.run(..., reload=True)` 会监听当前目录变化。而 Agent 把记忆写进 `./db/Relieving_Sorrow.db` —— **sqlite 写文件 → 触发 reload → 又写 → 又 reload**，日志疯狂刷 `watchfiles ... changes detected`。
**解法**：作为服务运行时**不带 reload**，直接 `uvicorn app.main:app --port 8001`（`main.py` 里的 reload 保留，方便开发时手动 `python -m app.main`）。

### 坑②：`SqliteSaver` 不支持 async
一开始图"正确"用了 `await agent.ainvoke(...)`，结果报错：
```
The SqliteSaver does not support async methods. Consider using AsyncSqliteSaver instead.
```
**解法**：改回**同步** `agent.invoke(...)`（和参考 Agent 用同步 `agent.stream` 一致）。要么换 `AsyncSqliteSaver`（需装 `aiosqlite`），但改动更大。

### 坑③：tRPC 的 POST 报文格式（测试时踩到）
用 curl 测网站的 `chat.send` 时，body 不能随便写。tRPC + superjson 的单条 mutation 格式是：
```bash
curl -X POST http://localhost:3002/api/trpc/chat.send \
  -H "Content-Type: application/json" \
  --data-binary '{"json":{"message":"...","history":[],"attachments":[]}}'
```
注意外层 `{"json":{...}}` 的包裹。另外 Windows bash 里中文 `-d` 会编码错乱，要把 body 写进文件用 `--data-binary @file`。

### 坑④：端口被孤儿进程占着
`npm run dev` 被 kill 后，Windows 上子 node 进程有时不退出，端口（3001/3002）还占着，新进程 `--strictPort` 直接失败。
**解法**：`netstat -ano | grep :3002` 找 PID → `taskkill //PID <pid> //F`。

### 坑⑤：聊天面板滚动"穿透"到网页（UI，非 Agent）
滚小柴对话框时网页跟着滚。根因不是 CSS `overflow`，而是 **Lenis**（网站 `Layout.tsx` 里 `new Lenis({lerp:0.08})`）全局接管了 wheel 做平滑滚动，连浮层上的 wheel 也抢走。
**解法**：给浮层根元素加 `data-lenis-prevent`（Lenis 默认认这个属性，命中就放行不接管），浮层内滚动容器再加 `overscroll-contain` + 一个非被动 wheel 监听挡边界。

---

## 9. 端到端数据流

```
浏览器：小柴聊天面板输入 + (可选)图片
   │  trpc.chat.send.useMutation({ message, history, attachments })
   ▼
网站后端 (Hono/tRPC, :3002)
   api/routers-chat.ts  ──zod校验──▶  api/ai/concierge.ts
   │  读 .env 的 AI_CONCIERGE_URL，POST（30s 超时）
   ▼
你的 Agent 服务 (FastAPI, :8001)   POST /chat
   concierge.py  ──▶  Relieving_Sorrow.reply()
     ├ history[]  → HumanMessage / AIMessage
     ├ message    → HumanMessage(文本 + image_url块)
     ├ 图片 dataUrl → 上传 OSS → URL
     └ agent.invoke(...)   (qwen多模态 + Tavily工具)
   ◀── { "reply": "小柴的回复" }
   ▼
网站后端  →  前端展示回复
```

---

## 10. 验证清单

逐层验证（从内到外）：

1. **Agent 服务直连**：
   ```bash
   curl -X POST http://127.0.0.1:8001/chat -H "Content-Type: application/json" \
     --data-binary '{"json":...}'   # 注意 superjson 包裹
   ```
   返回 `{"reply":"..."}` 且内容是小柴口吻。
2. **网站转发**：`POST http://localhost:3002/api/trpc/chat.send` → 返回带 `requestId` 的回复。
3. **浏览器**：打开网站 → 点右下小柴 → 发消息 → 收到回复；发图片 → 模型看图回复（OSS 日志可见上传 URL）。

---

## 11. 文件清单（改动/新增）

| 文件 | 作用 | 新增/改动 |
|---|---|---|
| `jieyou-ai-concierge/`（整项目） | Agent 服务 | **新建** |
| `…/app/api/v1/concierge.py` | `/chat` 契约端点 | 新增 |
| `…/app/agents/Relieving_Sorrow.py` | 小柴 Agent + `reply()` | 新增（镜像参考） |
| `…/app/common/oss.py` | 图片上传 OSS | 新增 |
| `jieyou-grocery-store/.env` | 加 `AI_CONCIERGE_URL` | 改动 1 行 |
| `jieyou-grocery-store/api/ai/concierge.ts` | 网站转发逻辑 | **未动**（本就支持） |

---

## 12. 小结与可扩展方向

- **接入的本质**：实现一个 HTTP 端点，吃 `{message, history, requestId, attachments}`、回 `{reply}`。Agent 内部怎么实现（LangGraph/LangChain/裸 OpenAI）网站不关心。
- **记忆策略**：当前按 `requestId` 当一次性会话，靠网站传入的 history。如想服务端持久记忆，可用固定 `thread_id`（如登录用户 id）让 `SqliteSaver` 跨请求记住。
- **流式**：现在是"一问一答"非流式（受 30s 限制）。想要打字机效果，把 `/chat` 换成 SSE 流式，并相应改网站 `concierge.ts`（前端面板结构不用大改）。
- **换大脑**：把 `agent` 换成任何带工具/RAG 的 LangChain Agent，只要 `/chat` 入参出参不变即可。