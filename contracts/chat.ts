/**
 * AI 解忧（小柴）共享类型
 * 前端、本站后端、以及你即将对接的 LangChain 服务，三方共用这一份契约。
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 聊天附件（多模态）。
 * 图片 / 文档统一用 base64 data URL 随 JSON 传输，
 * 你的 LangChain 服务按 mimeType 解码后即可喂给多模态模型。
 */
export interface ChatAttachment {
  /** 原始文件名，如 "成绩单.png" */
  name: string;
  /** MIME 类型，如 "image/png"、"application/pdf" */
  mimeType: string;
  /** base64 data URL，形如 "data:image/png;base64,iVBOR..." */
  dataUrl: string;
  /** 原始文件大小（字节） */
  size: number;
}

/** 前端 → 本站后端（tRPC chat.send）的入参 */
export interface ChatSendInput {
  /** 用户这次说的话（0~800 字；有附件时可以为空字符串） */
  message: string;
  /** 之前的对话记录（不含本条），时间正序，最多 20 条 */
  history?: ChatMessage[];
  /** 本次随消息上传的附件，最多 3 个（多模态用） */
  attachments?: ChatAttachment[];
}

/** 本站后端 → 前端 的出参 */
export interface ChatSendOutput {
  /** AI 的回复文本 */
  reply: string;
  /** 本次请求 ID，排查问题时用 */
  requestId: string;
}

/**
 * 本站后端 → 你的 LangChain 服务 的 HTTP 契约。
 * 当你在 .env 里配置了 AI_CONCIERGE_URL，后端会向该地址发 POST：
 *   Content-Type: application/json
 *   body: ConciergeServiceRequest
 * 你的服务只需返回：ConciergeServiceResponse
 */
export interface ConciergeServiceRequest {
  message: string;
  history: ChatMessage[];
  requestId: string;
  /** 本次消息的附件（多模态），无附件时不传或为空数组 */
  attachments?: ChatAttachment[];
}

export interface ConciergeServiceResponse {
  reply: string;
}
