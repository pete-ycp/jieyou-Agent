import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, SendHorizontal, Paperclip, FileText } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import type { ChatAttachment, ChatMessage } from '@contracts/chat';

/**
 * 小柴的聊天面板（信纸风）。
 * 始终挂载、靠 variants 开合 —— 收起后聊天记录不丢。
 * 支持上传附件（图片 / PDF / 文本），随消息一起发给多模态 Agent。
 * 数据走 trpc.chat.send（对接点：api/ai/concierge.ts，详见 docs/AI-CONCIERGE.md）。
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const WELCOME =
  '晚上好呀，我是小柴，店里的见习解忧员。有什么心事，说给我听听吧——店主不在的时候，我先帮你把烦恼收好。汪。';

/* ---------------- 附件规则 ---------------- */
const MAX_FILES = 3; // 一次最多 3 个附件（与后端 zod 校验一致）
const MAX_FILE_SIZE = 4_000_000; // 单个原始文件 ≤ 4MB
const IMAGE_RAW_LIMIT = 900_000; // 小于它的图片不压缩，原样发
const IMAGE_MAX_DIM = 1024; // 大图压缩后的最长边
const ACCEPT = 'image/*,.pdf,.txt,.md,.markdown';

/** 面板内部消息：在共享契约上额外携带附件（仅展示与本次发送用） */
interface UiMessage extends ChatMessage {
  attachments?: ChatAttachment[];
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('文件读取失败'));
    r.readAsDataURL(file);
  });
}

/** 文件 → 附件。大图用 canvas 缩到 1024px 内并转 JPEG，控制 base64 体积 */
async function fileToAttachment(file: File): Promise<ChatAttachment> {
  if (
    file.type.startsWith('image/') &&
    file.type !== 'image/gif' &&
    file.size > IMAGE_RAW_LIMIT
  ) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/jpeg', 0.85),
      );
      if (blob) {
        return {
          name: file.name,
          mimeType: 'image/jpeg',
          dataUrl: await readAsDataUrl(blob),
          size: blob.size,
        };
      }
    } catch {
      // 压缩失败则走原文件
    }
  }
  return {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    dataUrl: await readAsDataUrl(file),
    size: file.size,
  };
}

export default function ShibaChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [errorTip, setErrorTip] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    },
    onError: () => {
      setErrorTip('小柴好像打了个盹，没能把信送出去。再试一次吧。');
      setTimeout(() => setErrorTip(''), 4000);
    },
  });

  useEffect(() => {
    const el = listRef.current;
    if (el && open) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, sendMutation.isPending, open]);

  // 防止滚动穿透：面板内滚动到边界、或在非滚动区滚动时，拦截 wheel，不让页面跟着滚。
  // 必须用非 passive 监听（React onWheel 是 passive，preventDefault 无效）。
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const scroller = panel.querySelector<HTMLElement>('[data-shiba-scroll]');
      if (!scroller) return;
      const overScroller = (e.target as HTMLElement | null)?.closest(
        '[data-shiba-scroll]',
      );
      const atTop = scroller.scrollTop <= 0;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      // 在滚动区内且还能滚 → 放行；到边界或不在滚动区 → 拦截
      if (!overScroller || (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    };
    panel.addEventListener('wheel', onWheel, { passive: false });
    return () => panel.removeEventListener('wheel', onWheel);
  }, []);

  const flashTip = (tip: string) => {
    setErrorTip(tip);
    setTimeout(() => setErrorTip(''), 4000);
  };

  /* ---------------- 附件选择 ---------------- */
  const pickFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const room = MAX_FILES - pending.length;
    if (room <= 0) {
      flashTip(`一次最多带 ${MAX_FILES} 个附件哦`);
      return;
    }
    const files = Array.from(list).slice(0, room);
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        flashTip(`「${f.name}」超过 4MB 啦，换个小一点的吧`);
        continue;
      }
      try {
        const att = await fileToAttachment(f);
        setPending((prev) => [...prev, att]);
      } catch {
        flashTip(`「${f.name}」读取失败，再试一次吧`);
      }
    }
  };

  const canSend =
    (draft.trim().length > 0 || pending.length > 0) && !sendMutation.isPending;

  const send = () => {
    const text = draft.trim();
    const atts = pending;
    if ((!text && atts.length === 0) || sendMutation.isPending) return;
    const next: UiMessage[] = [
      ...messages,
      { role: 'user', content: text, attachments: atts.length ? atts : undefined },
    ];
    setMessages(next);
    setDraft('');
    setPending([]);
    // history 只带文本；附过附件的消息补个文字标记，让 Agent 知道上下文里有过图
    const history = next.slice(-21, -1).map((m) => ({
      role: m.role,
      content:
        m.attachments && m.attachments.length > 0
          ? `${m.content}${m.content ? '\n' : ''}[附件：${m.attachments.map((a) => a.name).join('、')}]`
          : m.content,
    }));
    sendMutation.mutate({
      message: text,
      history,
      attachments: atts.length ? atts : undefined,
    });
  };

  return (
    <motion.section
      ref={panelRef}
      data-lenis-prevent
      aria-label="小柴的解忧角"
      aria-hidden={!open}
      className="fixed inset-x-3 bottom-24 z-[60] mx-auto flex h-[68vh] max-h-[560px] w-auto max-w-sm flex-col overflow-hidden rounded-xl bg-cream shadow-paper-deep md:inset-x-auto md:bottom-28 md:right-8 md:mx-0 md:w-[380px]"
      style={{ border: '1px solid #D9C9A8', pointerEvents: open ? 'auto' : 'none' }}
      initial={false}
      variants={{
        open: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
        closed: { opacity: 0, y: 32, scale: 0.96, transition: { duration: 0.28, ease: EASE } },
      }}
      animate={open ? 'open' : 'closed'}
    >
      {/* 头部 */}
      <header className="flex items-center gap-3 bg-kraft px-4 py-3" style={{ borderBottom: '1px dashed #C9B48C' }}>
        <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-cream" style={{ border: '1px solid #D9C9A8' }}>
          <img src="/shiba-happy.png" alt="" className="h-full w-full scale-[1.35] object-cover object-top" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-hand text-xl leading-6 text-wood">小柴的解忧角</p>
          <p className="mt-0.5 text-[11px] tracking-[0.12em] text-slate">见习解忧员 · 即问即答 · 可以看图</p>
        </div>
        <button
          type="button"
          aria-label="收起"
          onClick={onClose}
          className="rounded-full p-1.5 text-slate transition-colors hover:bg-cream hover:text-wood"
        >
          <X size={18} />
        </button>
      </header>

      {/* 消息列表 */}
      <div ref={listRef} data-shiba-scroll className="kraft-lines flex-1 space-y-3 overscroll-contain overflow-y-auto px-4 py-4" style={{ backgroundPosition: '0 16px' }}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[82%] space-y-1.5">
                {m.attachments?.map((a, j) =>
                  a.mimeType.startsWith('image/') ? (
                    <img
                      key={j}
                      src={a.dataUrl}
                      alt={a.name}
                      className="ml-auto block max-h-36 rounded-lg shadow-paper"
                      style={{ border: '1px solid #D9C9A8' }}
                    />
                  ) : (
                    <span
                      key={j}
                      className="ml-auto flex items-center gap-1.5 rounded-lg bg-kraft/80 px-2.5 py-1.5 text-[12px] text-wood"
                      style={{ border: '1px solid #E3D2B2' }}
                    >
                      <FileText size={13} className="shrink-0 text-slate" />
                      <span className="max-w-40 truncate">{a.name}</span>
                    </span>
                  ),
                )}
                {m.content && (
                  <p className="whitespace-pre-wrap rounded-lg rounded-br-sm bg-wood px-3.5 py-2.5 text-[14px] leading-6 text-cream shadow-paper">
                    {m.content}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2">
              <span className="block h-7 w-7 shrink-0 overflow-hidden rounded-full bg-cream" style={{ border: '1px solid #D9C9A8' }}>
                <img src="/shiba-happy.png" alt="" className="h-full w-full scale-[1.4] object-cover object-top" />
              </span>
              <p className="max-w-[82%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-kraft/80 px-3.5 py-2.5 text-[14px] leading-6 text-ink" style={{ border: '1px solid #E3D2B2' }}>
                {m.content}
              </p>
            </div>
          ),
        )}
        {sendMutation.isPending && (
          <div className="flex items-end gap-2">
            <span className="block h-7 w-7 shrink-0 overflow-hidden rounded-full bg-cream" style={{ border: '1px solid #D9C9A8' }}>
              <img src="/shiba-happy.png" alt="" className="h-full w-full scale-[1.4] object-cover object-top" />
            </span>
            <p className="rounded-lg rounded-bl-sm bg-kraft/80 px-3.5 py-2.5 text-[14px] leading-6 text-slate" style={{ border: '1px solid #E3D2B2' }}>
              小柴正在认真想
              <span className="animate-pulse">……</span>
            </p>
          </div>
        )}
        {errorTip && <p className="text-center text-xs text-vermilion">{errorTip}</p>}
      </div>

      {/* 输入区 */}
      <div className="bg-cream px-3 py-3" style={{ borderTop: '1px dashed #C9B48C' }}>
        {/* 待发送附件预览 */}
        {pending.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pending.map((a, i) => (
              <span
                key={i}
                className="group relative flex items-center gap-1.5 rounded-lg bg-kraft/70 py-1 pl-1 pr-6 text-[11px] text-wood"
                style={{ border: '1px solid #D9C9A8' }}
              >
                {a.mimeType.startsWith('image/') ? (
                  <img src={a.dataUrl} alt={a.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText size={14} className="mx-1.5 shrink-0 text-slate" />
                )}
                <span className="max-w-28 truncate">{a.name}</span>
                <button
                  type="button"
                  aria-label={`移除 ${a.name}`}
                  onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate transition-colors hover:bg-cream hover:text-vermilion"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              void pickFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="添加图片或文件"
            title="发图片或文件给小柴看"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kraft/70 text-slate transition-all duration-300 hover:text-wood"
            style={{ border: '1px solid #D9C9A8', boxShadow: '0 1px 3px rgba(107,74,50,.10)' }}
            tabIndex={open ? 0 : -1}
          >
            <Paperclip size={16} />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={800}
            placeholder="把心事说给小柴听，也可以发图……（Enter 发送）"
            className="max-h-28 flex-1 resize-none rounded-lg bg-white/50 px-3 py-2.5 text-[14px] leading-6 text-ink outline-none placeholder:text-slate/50"
            style={{ border: '1px solid #D9C9A8' }}
            tabIndex={open ? 0 : -1}
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="发送"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stamp text-cream transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate/40"
            style={{ boxShadow: '0 1px 3px rgba(107,74,50,.10)' }}
            tabIndex={open ? 0 : -1}
          >
            <SendHorizontal size={17} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] tracking-[0.1em] text-slate/70">
          小柴是 AI 见习解忧员；写下正式的信，店主会在 24 小时内回信
        </p>
      </div>
    </motion.section>
  );
}
