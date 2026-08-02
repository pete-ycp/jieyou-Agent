import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, Star } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { LETTER_STATUS_LABELS, REPLY_SLA_HOURS } from '@contracts/labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import LampGlow from '@/components/shop/LampGlow';
import Postmark from '@/components/shop/Postmark';
import {
  AdminSectionTitle,
  StatusSeal,
  fmtDate,
  fmtDateTime,
  fmtRemain,
  letterCategoryLabel,
  replyDeadline,
  type AdminLetter,
} from './helpers';

type LetterFilter = 'pending' | 'replied' | 'all';

const FILTER_TABS: { value: LetterFilter; label: string }[] = [
  { value: 'pending', label: '待回信' },
  { value: 'replied', label: '已回信' },
  { value: 'all', label: '全部' },
];

const SOP_RULES = [
  '绝不无视任何一封信——包括测试信与恶作剧信。',
  '不替对方做决定：咨询的人心里已经有了答案。',
  '先共情，后建议：先复述确认处境，再给方向。',
  '认真思考后再回：宁可慢，不可敷衍。',
  '保护隐私与匿名，不窥探身份；结尾把选择权交还对方（「一切全在你自己」）。',
];

/** 回信工作台：左=待回队列 ｜ 中=来信+回信编辑器 ｜ 右=回信语气 SOP 常驻侧栏 */
export default function AdminLetters() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<LetterFilter>('pending');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [justReplied, setJustReplied] = useState(false);

  // 倒计时每分钟刷新一次
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading } = trpc.admin.letters.useQuery({ filter });
  const letters = (data ?? []) as AdminLetter[];

  // 待回：超时置顶，其余按投信时间升序（后端已升序）
  const sorted = useMemo(() => {
    const overdue: AdminLetter[] = [];
    const normal: AdminLetter[] = [];
    for (const l of letters) {
      if (l.status === 'pending' && replyDeadline(l.createdAt).overdue) overdue.push(l);
      else normal.push(l);
    }
    return [...overdue, ...normal];
  }, [letters]);

  const selected = sorted.find((l) => l.id === selectedId) ?? null;

  const { data: detailData } = trpc.admin.letterDetail.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null },
  );
  const detail = (detailData ?? selected) as AdminLetter | null;

  // 选中变化时重置编辑器
  useEffect(() => {
    setReply('');
    setJustReplied(false);
  }, [selectedId]);

  // 自动选中第一封待回信
  useEffect(() => {
    if (selectedId === null && sorted.length > 0) {
      setSelectedId(sorted[0].id);
    }
  }, [selectedId, sorted]);

  const replyMutation = trpc.admin.replyLetter.useMutation({
    onSuccess: (_d, vars) => {
      toast.success('回信已放进牛奶箱。');
      setJustReplied(true);
      const next = sorted.find((l) => l.status === 'pending' && l.id !== vars.id);
      utils.admin.invalidate().then(() => {
        setSelectedId(next ? next.id : null);
      });
    },
    onError: (e) => toast.error(e.message || '投递失败，请再试一次'),
  });

  const featureMutation = trpc.admin.featureLetter.useMutation({
    onSuccess: (_d, vars) => {
      toast.success(vars.featured ? '已挂上示例信件墙。' : '已从示例信件墙取下。');
      utils.admin.invalidate();
    },
    onError: (e) => toast.error(e.message || '操作失败'),
  });

  // AI 起草回信：把草稿填进编辑器，店主审阅/修改后手动「放入牛奶箱」
  const draftMutation = trpc.admin.aiDraftReply.useMutation({
    onSuccess: (d) => {
      setReply(d.draft);
      toast.success('AI 已起草一封回信，读一遍、改一改，再放进牛奶箱。');
    },
    onError: (e) => toast.error(e.message || '起草失败，稍后再试'),
  });

  const submitReply = () => {
    if (!detail) return;
    if (!reply.trim()) {
      toast.error('信纸还空着，写点什么再放出去吧。');
      return;
    }
    replyMutation.mutate({ id: detail.id, replyContent: reply.trim() });
  };

  const toggleFeature = (l: AdminLetter) => {
    if (!l.isFeatured) {
      const ok = window.confirm('将脱敏后展示到示例信件墙，已隐去一切身份信息？');
      if (!ok) return;
    }
    featureMutation.mutate({ id: l.id, featured: !l.isFeatured });
  };

  return (
    <section>
      <AdminSectionTitle
        title="回信工作台"
        note={`晚上把烦恼投进投递口，回信会在 ${REPLY_SLA_HOURS} 小时内放进牛奶箱。`}
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        {/* 左 · 队列 */}
        <div className="card-postcard flex max-h-[70vh] flex-col p-3">
          <div className="mb-2 flex gap-1 border-b border-[#C9B48C]/70 pb-2">
            {FILTER_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setFilter(t.value);
                  setSelectedId(null);
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sm transition-colors',
                  filter === t.value
                    ? 'bg-wood text-cream'
                    : 'text-wood hover:bg-lamp/15',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading && <p className="py-8 text-center text-sm text-slate">正在清点投递口…</p>}
            {!isLoading && sorted.length === 0 && (
              <div className="py-8 text-center">
                <Inbox size={28} className="mx-auto text-slate/60" />
                <p className="mt-2 text-sm text-slate">
                  {filter === 'pending' ? '投递口安安静静的，没有待回的信。' : '这里还没有记录。'}
                </p>
              </div>
            )}
            <ul className="space-y-2">
              {sorted.map((l, i) => {
                const { remainMs, overdue } = replyDeadline(l.createdAt);
                const urgent = l.status === 'pending' && !overdue && remainMs < 4 * 3600_000;
                const active = l.id === selectedId;
                return (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.06, 0.5), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(l.id)}
                      className={cn(
                        'w-full rounded-lg border bg-cream/70 p-2.5 text-left transition-all',
                        overdue && l.status === 'pending'
                          ? 'border-stamp/80 shadow-[0_0_0_1px_rgba(166,58,46,0.25)] animate-pulse [animation-duration:3.2s]'
                          : 'border-[#C9B48C]',
                        active && 'bg-lamp/15 ring-1 ring-lamp/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-hand text-lg leading-6 text-wood">
                          {l.penName}
                        </span>
                        <span className="shrink-0 rounded bg-milk/70 px-1.5 py-0.5 text-[11px] text-slate">
                          {letterCategoryLabel(l.category)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate">
                        <span className="font-garamond">{fmtDateTime(l.createdAt)}</span>
                        {l.status === 'pending' ? (
                          <StatusSeal tone={overdue ? 'stamp' : urgent ? 'stamp' : 'lamp'}>
                            {overdue ? '超时' : fmtRemain(remainMs)}
                          </StatusSeal>
                        ) : (
                          <StatusSeal tone={l.status === 'egg' ? 'lamp' : 'moss'}>
                            {LETTER_STATUS_LABELS[l.status] ?? l.status}
                          </StatusSeal>
                        )}
                      </div>
                      {l.status === 'pending' && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-kraft">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              overdue || urgent ? 'bg-vermilion' : 'bg-lamp',
                            )}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, (remainMs / (REPLY_SLA_HOURS * 3600_000)) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                      {l.thanksContent && (
                        <p className="mt-1 text-[11px] text-moss">收到了感谢信</p>
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 中 · 来信 + 回信编辑器 */}
        <div className="min-w-0">
          {!detail ? (
            <div className="card-postcard flex h-full min-h-72 items-center justify-center p-8">
              <p className="text-center text-slate">
                从左边挑一封信，
                <br />
                台灯下慢慢读。
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={detail.id}
                initial={{ opacity: 0, scaleY: 0.85 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'top' }}
                className="space-y-5"
              >
                {/* 来信全文 */}
                <div className="relative rounded-md bg-cream px-6 py-8 shadow-paper md:px-8 kraft-lines" style={{ border: '1px solid #D9C9A8' }}>
                  <div className="absolute right-4 top-4 opacity-80">
                    <Postmark date={fmtDate(detail.createdAt)} size={70} />
                  </div>
                  <div className="mb-8 flex flex-wrap items-center gap-3 pr-16">
                    <span className="font-hand text-2xl text-wood">{detail.penName}</span>
                    <span className="rounded bg-milk/70 px-1.5 py-0.5 text-xs text-slate">
                      {letterCategoryLabel(detail.category)}
                    </span>
                    <span className="font-garamond text-xs text-slate">
                      {fmtDateTime(detail.createdAt)} 投入投递口
                    </span>
                    {detail.isFeatured && <StatusSeal tone="stamp">精选</StatusSeal>}
                  </div>
                  <p className="whitespace-pre-wrap text-[17px] leading-8 text-ink">
                    {detail.content.trim() ? detail.content : '（一张白纸，一个字也没有。）'}
                  </p>
                </div>

                {/* 已有回信（已回/彩蛋） */}
                {detail.status !== 'pending' && detail.replyContent && (
                  <div className="rounded-md border border-[#C9B48C] bg-kraft/80 px-6 py-8 md:px-8 kraft-lines">
                    <div className="mb-0 flex items-center justify-between">
                      <span className="text-xs tracking-[0.12em] text-slate">
                        店主的回信 · {fmtDateTime(detail.repliedAt)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={featureMutation.isPending}
                        onClick={() => toggleFeature(detail)}
                        className={cn(
                          'h-8 border-[#C9B48C]',
                          detail.isFeatured && 'border-stamp/60 text-stamp',
                        )}
                      >
                        <Star
                          size={14}
                          className={detail.isFeatured ? 'fill-stamp text-stamp' : ''}
                        />
                        {detail.isFeatured ? '取消精选' : '精选到示例墙'}
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap text-[16px] leading-8 text-ink">
                      {detail.replyContent}
                    </p>
                    <p className="mt-8 text-right font-hand text-xl leading-8 text-wood">浪矢杂货店</p>
                    {detail.thanksContent && (
                      <div className="divider-sew mt-4 pt-4">
                        <p className="text-xs leading-8 tracking-[0.12em] text-moss">
                          {detail.penName} 的感谢信 · {fmtDateTime(detail.thanksAt)}
                        </p>
                        <p className="mt-0 whitespace-pre-wrap text-[15px] leading-8 text-ink">
                          {detail.thanksContent}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 回信编辑器（仅待回） */}
                {detail.status === 'pending' && (
                  <div className="rounded-md bg-cream px-6 py-8 shadow-paper md:px-8 kraft-lines" style={{ border: '1px solid #D9C9A8' }}>
                    <p className="mb-4 text-xs tracking-[0.12em] text-slate">
                      回信 · 想想再写，写完放进牛奶箱
                    </p>
                    <Textarea
                      rows={10}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={`致 ${detail.penName}：\n\n先说说你读到了什么，再谈谈你的想法……`}
                      className="border-0 bg-transparent p-0 text-[17px] leading-8 text-ink shadow-none focus-visible:ring-0"
                    />
                    {/* 窄屏允许按钮组整体换行，避免签名被挤压 */}
                    <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                      <p className="font-hand text-2xl text-wood">浪矢杂货店</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => draftMutation.mutate({ id: detail.id })}
                          disabled={draftMutation.isPending}
                          className="h-8 border-[#C9B48C] text-wood"
                        >
                          {draftMutation.isPending ? '正在起草…' : '✨ AI 起草'}
                        </Button>
                        <Button
                          onClick={submitReply}
                          disabled={replyMutation.isPending || draftMutation.isPending || !reply.trim()}
                          className="h-8 bg-stamp text-cream hover:bg-stamp/90"
                        >
                          {replyMutation.isPending ? '正在封缄…' : '放入牛奶箱'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {justReplied && (
                  <div className="flex justify-center">
                    <StatusSeal tone="moss" className="px-3 py-1 text-sm">
                      已入牛奶箱
                    </StatusSeal>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* 右 · SOP 常驻侧栏 */}
        <aside className="card-postcard relative overflow-hidden p-4 lg:max-h-[70vh]">
          <div className="relative">
            <div className="relative mx-auto w-40">
              <LampGlow className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" size={210} />
              <img
                src="/admin-lamp.png"
                alt="深夜矮桌前的台灯与信纸"
                className="relative mx-auto w-40 rounded-lg border border-[#C9B48C]"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-center font-hand text-lg text-wood">
              每天五点半起床写回信
            </p>
            <h3 className="mt-4 text-center text-sm tracking-[0.2em] text-wood">
              回信的规矩
            </h3>
            <div className="divider-sew mt-2" />
            <ol className="mt-3 space-y-3">
              {SOP_RULES.map((rule, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-6 text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-vermilion/60 font-garamond text-[11px] text-vermilion">
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-center text-xs leading-5 text-slate">
              牛奶箱会在明早 8:30 前打开。
              <br />
              今晚写下的每一个字，都算数。
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
