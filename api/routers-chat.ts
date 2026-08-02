import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getConciergeReply } from "./ai/concierge";

/**
 * AI 解忧（小柴）聊天接口。
 * 前端调用：trpc.chat.send.useMutation()
 * 对接说明见 api/ai/concierge.ts 顶部注释 与 docs/AI-CONCIERGE.md。
 */
export const chatRouter = createRouter({
  send: publicQuery
    .input(
      z
        .object({
          message: z.string().trim().max(800, "一次最多说 800 字哦"),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(2000),
              }),
            )
            .max(20)
            .optional(),
          // 多模态附件：最多 3 个，单个原始文件 ≤ 4MB（base64 会再约 +33%）
          attachments: z
            .array(
              z.object({
                name: z.string().min(1).max(120),
                mimeType: z.string().min(1).max(80),
                dataUrl: z.string().startsWith("data:").max(6_000_000),
                size: z.number().int().positive().max(4_000_000),
              }),
            )
            .max(3, "一次最多带 3 个附件哦")
            .optional(),
        })
        .refine(
          (d) => d.message.length > 0 || (d.attachments?.length ?? 0) > 0,
          { message: "先对小柴说点什么，或者发张图吧" },
        ),
    )
    .mutation(({ input }) => getConciergeReply(input)),
});
