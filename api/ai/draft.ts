const AI_DRAFT_URL = process.env.AI_DRAFT_URL;

/**
 * AI 回信起草：把一封来信发给 Agent 服务，拿回一封浪矢爷爷口吻的回信草稿。
 * 店主在前端审阅/修改后，再走现有的 admin.replyLetter 手动发送。
 * 未配置 AI_DRAFT_URL 或服务异常 → 抛错（前端 toast 提示），不影响手动回信。
 */
export async function draftLetterReply(input: {
  penName: string;
  category: string;
  content: string;
}): Promise<string> {
  if (!AI_DRAFT_URL) {
    throw new Error("未配置 AI_DRAFT_URL，无法 AI 起草");
  }
  const res = await fetch(AI_DRAFT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`起草服务异常 (${res.status})`);
  }
  const data = (await res.json()) as { reply?: string };
  if (!data?.reply?.trim()) {
    throw new Error("起草服务返回为空");
  }
  return data.reply.trim();
}