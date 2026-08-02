import { randomUUID } from "node:crypto";
import type {
  ChatSendInput,
  ChatSendOutput,
  ConciergeServiceRequest,
  ConciergeServiceResponse,
} from "@contracts/chat";

/* ======================================================================
 * ★★★  AI 解忧对接点 —— 「小柴」的大脑  ★★★
 *
 * 你现在只需要做一件事：
 *
 *   在 .env 里加一行，指向你自己的 LangChain 服务：
 *
 *       AI_CONCIERGE_URL=http://localhost:8000/chat
 *
 *   后端收到前端的聊天后，会向这个地址 POST 如下 JSON：
 *       {
 *         "message": "用户这次说的话",
 *         "history": [{ "role": "user" | "assistant", "content": "..." }],
 *         "requestId": "本次请求 ID",
 *         "attachments": [{                       // 多模态附件，可缺省
 *           "name": "成绩单.png",
 *           "mimeType": "image/png",
 *           "dataUrl": "data:image/png;base64,iVBOR...",
 *           "size": 102400
 *         }]
 *       }
 *   attachments 里的 dataUrl 是 base64，解码后按 mimeType
 *   交给你的多模态模型即可（示例见 docs/AI-CONCIERGE.md）。
 *
 *   你的服务只要返回：
 *       { "reply": "AI 的回复文本" }
 *
 *   超时时间 30 秒；你的服务挂掉或超时，网站会自动回退到下方的
 *   兜底回复，用户不会看到报错。
 *
 * 如果你想直接在 Node 里写逻辑（不单独起服务），
 * 改写 callYourAgent() 这个函数即可 —— 它是唯一的对接函数。
 *
 * 字段的完整类型定义见：contracts/chat.ts
 * 一个可直接运行的 FastAPI + LangChain 示例见：docs/AI-CONCIERGE.md
 * ====================================================================== */

const AI_CONCIERGE_URL = process.env.AI_CONCIERGE_URL;

export async function getConciergeReply(
  input: ChatSendInput,
): Promise<ChatSendOutput> {
  const requestId = randomUUID();

  if (AI_CONCIERGE_URL) {
    try {
      const reply = await callYourAgent({
        message: input.message,
        history: input.history ?? [],
        requestId,
        attachments: input.attachments,
      });
      return { reply, requestId };
    } catch (err) {
      console.warn(
        `[concierge] AI_CONCIERGE_URL (${AI_CONCIERGE_URL}) 调用失败，回退兜底回复:`,
        err,
      );
    }
  }

  return {
    reply: fallbackReply(input.message, input.attachments?.length ?? 0),
    requestId,
  };
}

/* ----------------------------------------------------------------------
 * ↓↓↓ 唯一的对接函数：把请求转发给你的 LangChain 服务 ↓↓↓
 * -------------------------------------------------------------------- */
async function callYourAgent(payload: ConciergeServiceRequest): Promise<string> {
  const res = await fetch(AI_CONCIERGE_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`agent service responded ${res.status}`);
  }
  const data = (await res.json()) as ConciergeServiceResponse;
  if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("agent service returned an empty reply");
  }
  return data.reply.trim();
}

/* ----------------------------------------------------------------------
 * 兜底回复（未配置 AI_CONCIERGE_URL / 服务异常时使用）
 * 按店里的五个烦恼分类做了简单的关键词匹配，让「小柴」在接上大脑之前
 * 也不至于答非所问。你对接之后，这些就不会再用到了。
 * -------------------------------------------------------------------- */

const CATEGORY_REPLIES: Array<{ keywords: string[]; replies: string[] }> = [
  {
    keywords: ["喜欢", "爱", "表白", "分手", "男朋友", "女朋友", "暗恋", "婚"],
    replies: [
      "喜欢上一个人，心里就像揣了一封没贴邮票的信，总想寄出去，又怕寄错了地址。我的建议是：先问问自己，十年后想起今天，你更希望「说过」还是「没说」？汪。",
      "感情的事没有标准答案，但有一件事是真的——真诚地说出来，至少不会在多年后的夜里反复想「如果当时」。慢慢来，小柴陪着你。",
    ],
  },
  {
    keywords: ["梦想", "理想", "画画", "音乐", "写作", "放弃"],
    replies: [
      "梦想这个东西，不会因为被搁置就消失，它只是躺在抽屉里等你。别急着做决定，先每天给它留半个小时，好不好？汪。",
      "店主说过：地图是一张白纸的人，才可以随心所欲地描绘。你现在觉得迷茫，恰恰说明面前的路还很多。",
    ],
  },
  {
    keywords: ["父母", "妈妈", "爸爸", "家人", "孩子", "家里"],
    replies: [
      "家人之间最难的，是彼此都爱着对方，却说着相反的话。试着把「你应该」换成「我希望你听听我的想法」，也许会有不一样的晚饭桌。汪。",
      "和家人有关的烦恼，往往急不来。今晚先好好吃饭，明天再找一个气氛松一点的时机开口，会顺利得多。",
    ],
  },
  {
    keywords: ["工作", "辞职", "上司", "同事", "加班", "考试", "公务员", "面试"],
    replies: [
      "工作或考试卡壳的时候，先别问自己「要不要逃」，改问「我想要的生活是什么样」。答案清楚了，路就好选了。汪。",
      "辛苦的时候，允许自己先在牛奶箱上坐一会儿。你不是懒，你只是累了。休息够了，答案会自己浮上来的。",
    ],
  },
];

const GENERIC_REPLIES = [
  "嗯，我在听。能把心事说出来，已经很了不起了。再多跟我说一点吧——后来呢？汪。",
  "这件事听起来真的不容易。我想陪你慢慢理一理：最让你难受的，是哪一个部分呢？",
  "店主常说，烦恼就像没贴邮票的信，写出来、寄出去，心就轻了一半。你已经寄出这一半了。",
  "谢谢你的信任。我的话也许不能立刻解决问题，但这家店的灯会一直为你亮着。想再说点什么都可以，汪。",
];

let genericCursor = 0;

const ATTACHMENT_REPLIES = [
  "收到你发来的图片啦，我先替你收进围裙口袋。不过我的眼睛还没接上店主说的「大脑」，看不太懂里面是什么——能用话再跟我说说吗？汪。",
  "唔，这个附件我叼住了！但我现在还不识字也看不懂图……等店主帮我接上真正的本领就能看了。先跟我讲讲它是什么，好吗？",
];

function fallbackReply(message: string, attachmentCount = 0): string {
  if (attachmentCount > 0 && !message.trim()) {
    return ATTACHMENT_REPLIES[
      Math.floor(Math.random() * ATTACHMENT_REPLIES.length)
    ];
  }
  for (const { keywords, replies } of CATEGORY_REPLIES) {
    if (keywords.some((k) => message.includes(k))) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }
  genericCursor = (genericCursor + 1) % GENERIC_REPLIES.length;
  return GENERIC_REPLIES[genericCursor];
}
