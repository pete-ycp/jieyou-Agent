# 小柴 · AI 解忧 —— LangChain 对接文档

网站右下角的柴犬「小柴」已经就位：点击它会打开聊天窗口，消息通过
本站后端转发给你自己的 LangChain 服务。**你只需要起一个 HTTP 服务，
然后在 `.env` 里配一行地址，对接就完成了。**

---

## 一、数据链路

```
浏览器聊天窗口
   │  tRPC: chat.send  { message, history?, attachments? }
   ▼
本站后端  api/routers-chat.ts  →  api/ai/concierge.ts
   │  若 .env 配置了 AI_CONCIERGE_URL，则 POST 转发（超时 30s）
   ▼
你的 LangChain 服务  ←—— 你要实现的就是它
   │  返回 { "reply": "..." }
   ▼
本站后端  →  前端展示回复
```

如果 `AI_CONCIERGE_URL` 未配置、或你的服务异常/超时，后端会自动使用
`concierge.ts` 底部的兜底回复（按五个烦恼分类写的固定文案），用户不会看到报错。

---

## 二、你需要实现的接口（唯一一个）

### `POST {AI_CONCIERGE_URL}`

**请求体**（Content-Type: application/json）：

```json
{
  "message": "用户这次说的话，0~800字（有附件时可为空字符串）",
  "history": [
    { "role": "user", "content": "之前用户说的" },
    { "role": "assistant", "content": "之前AI回的" }
  ],
  "requestId": "本次请求的唯一ID，可用于日志",
  "attachments": [
    {
      "name": "成绩单.png",
      "mimeType": "image/png",
      "dataUrl": "data:image/png;base64,iVBORw0KGgo...",
      "size": 102400
    }
  ]
}
```

- `history` 按时间正序，最多 20 条，**不包含**本次的 `message`。
- `attachments`（多模态，可选）：用户在聊天窗口里点了回形针上传的图片/文件，
  最多 3 个，单个原始文件 ≤ 4MB。图片统一为 base64 **data URL**，前端会把
  大图自动压缩到最长边 1024px（JPEG），所以体积可控。
  解码方式：`base64.b64decode(dataUrl.split(",", 1)[1])`，按 `mimeType` 交给
  你的多模态模型即可。历史消息里的附件不重复传输，只在 `history[].content`
  里保留 `[附件：文件名]` 的文字标记。
- 对话不持久化：刷新页面后前端会清空，所以每次请求都会带上当前会话的历史。

**响应体**（HTTP 200）：

```json
{ "reply": "AI 的回复文本，纯文本即可，前端按换行展示" }
```

> 非 200 状态码、超时（30 秒）、或 `reply` 为空 → 后端回退到兜底文案。

---

## 三、参考实现：FastAPI + LangChain（可直接改）

```python
# server.py  ——  uvicorn server:app --port 8000
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

app = FastAPI()

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ConciergeRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    requestId: str = ""

# 「小柴」的人设：解忧杂货店的见习解忧员，一只温暖的柴犬
prompt = ChatPromptTemplate.from_messages([
    ("system",
     "你是「小柴」，解忧杂货店里的见习解忧员，一只温暖、耐心的柴犬。"
     "用中文回复，语气温和，像深夜杂货店里的灯光一样让人安心。"
     "回复控制在 150 字以内，口语化，不要列表和说教。"
     "偶尔在句尾加一个「汪」，但不要每句都加。"
     "如果用户的烦恼很严重（自伤倾向等），温柔地建议他寻求现实中的帮助。"),
    MessagesPlaceholder("history"),
    ("human", "{message}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
chain = prompt | llm

@app.post("/chat")
def chat(req: ConciergeRequest):
    history = [
        HumanMessage(m.content) if m.role == "user" else AIMessage(m.content)
        for m in req.history
    ]
    result = chain.invoke({"message": req.message, "history": history})
    return {"reply": result.content}
```

然后在网站的 `.env` 里加：

```
AI_CONCIERGE_URL=http://localhost:8000/chat
```

重启网站后端即可。之后你把 `chain` 换成任何 LangChain Agent
（带工具、带记忆、带 RAG 都可以），只要保持 `/chat` 的入参出参不变。

### 多模态：接收图片/文件附件

用户发的附件在 `attachments` 字段里（base64 data URL）。用多模态模型时，
把图片以 `image_url` 内容块的形式拼进 HumanMessage：

```python
import base64
from langchain_core.messages import HumanMessage, AIMessage

class Attachment(BaseModel):
    name: str
    mimeType: str
    dataUrl: str
    size: int

class ConciergeRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    requestId: str = ""
    attachments: list[Attachment] = []

llm = ChatOpenAI(model="gpt-4o", temperature=0.8)  # 需支持视觉的模型

@app.post("/chat")
def chat(req: ConciergeRequest):
    history = [
        HumanMessage(m.content) if m.role == "user" else AIMessage(m.content)
        for m in req.history
    ]

    # 本次消息：文本 + 图片内容块（OpenAI 多模态格式）
    content: list = [{"type": "text", "text": req.message or "（用户发来附件）"}]
    for att in req.attachments:
        if att.mimeType.startswith("image/"):
            # dataUrl 可以直接用；也可以先 base64.b64decode(att.dataUrl.split(",",1)[1])
            content.append({"type": "image_url",
                            "image_url": {"url": att.dataUrl}})
        else:
            # 文本类附件：解码后当上下文
            raw = base64.b64decode(att.dataUrl.split(",", 1)[1])
            content.append({"type": "text",
                            "text": f"[用户上传的文件 {att.name}]\n" + raw[:8000].decode("utf-8", "ignore")})

    result = (prompt | llm).invoke({
        "message": HumanMessage(content),   # 若用 prompt 模板，可把多模态消息直接放进 history
        "history": history,
    })
    return {"reply": result.content}
```

> 提示：如果 prompt 模板不好塞多模态消息，也可以不用模板，
> 直接 `llm.invoke([*history, HumanMessage(content)])`。

---

## 四、另一种对接方式（不起独立服务）

如果你更想直接在 Node/TypeScript 里写（比如用 LangChain.js）：
改写 `api/ai/concierge.ts` 中的 **`callYourAgent()`** 函数即可——
它是唯一的对接函数，入参出参类型在 `contracts/chat.ts`。

---

## 五、涉及文件清单

| 文件 | 作用 |
|---|---|
| `contracts/chat.ts` | 三方共享的类型契约（前端/本站后端/你的服务） |
| `api/ai/concierge.ts` | **对接点**。读 `AI_CONCIERGE_URL`，转发或兜底 |
| `api/routers-chat.ts` | tRPC 路由 `chat.send`，入参校验 |
| `src/components/shiba/ShibaConcierge.tsx` | 漫游柴犬：底部走动 + 状态机（巡逻/坐着/睡觉/打滚/讨吃/干饭/叼信/打招呼）+ 气泡 |
| `src/components/shiba/ShibaChatPanel.tsx` | 聊天面板 UI（始终挂载，收起不清空记录；回形针上传图片/文件，大图自动压缩） |
| `public/shiba-*.png` | 柴犬素材 9 张（idle/happy/walk/sit/sleep/roll/beg/eat/letter，透明底 512px） |

## 六、备注

- 前端每轮发送会带上最近 20 条历史；如需更长记忆，改
  `ShibaConcierge.tsx` 里的 `next.slice(-21, -1)` 和后端 zod 的 `.max(20)`。
- 目前是「一问一答」非流式。如果以后想要打字机流式输出，可以把
  `callYourAgent` 改为 SSE/WebSocket，前端面板结构不用大改。
- 聊天不需要登录、不落库；如需登录态或聊天记录持久化，在
  `routers-chat.ts` 把 `publicQuery` 换成 `authedQuery` 并加表即可。
