import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/shop/PageLoading';
import LampGlow from '@/components/shop/LampGlow';
import LetterPaper from '@/components/shop/LetterPaper';
import PaperUnfold from '@/components/shop/PaperUnfold';
import Postmark from '@/components/shop/Postmark';
import CategorySeal from '@/components/shop/CategorySeal';
import CountdownTag from '@/components/shop/CountdownTag';
import { LETTER_STATUS_LABELS, THANKS_AFTER_DAYS } from '@contracts/labels';
import { CATEGORY_LABELS, excerpt, fmtPostmarkDate, replyDeadline } from '@/components/shop/letter-utils';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ---------------- 分享卡（1080×1350 canvas 生成） ---------------- */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function downloadShareCard(opts: { replyExcerpt: string; date: string }) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 信纸底
  ctx.fillStyle = '#F7F0E1';
  ctx.fillRect(0, 0, W, H);
  // 横线纹理
  ctx.strokeStyle = 'rgba(217,201,168,0.6)';
  ctx.lineWidth = 1;
  for (let y = 96; y < H - 80; y += 32) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(W - 80, y);
    ctx.stroke();
  }
  // 双线边框
  ctx.strokeStyle = '#C9B48C';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // 回信金句节选
  ctx.fillStyle = '#3A2E24';
  ctx.font = '500 44px "Noto Serif SC", serif';
  ctx.textBaseline = 'top';
  const lines = wrapCanvasText(ctx, opts.replyExcerpt, W - 240).slice(0, 12);
  let y = 200;
  for (const line of lines) {
    ctx.fillText(line, 120, y);
    y += 76;
  }

  // 落款手写体
  ctx.fillStyle = '#6B4A32';
  ctx.font = '64px "Ma Shan Zheng", "Noto Serif SC", serif';
  ctx.textAlign = 'right';
  ctx.fillText('—— 浪矢杂货店', W - 140, y + 60);
  ctx.textAlign = 'left';

  // 邮戳（右上）
  ctx.save();
  ctx.translate(W - 210, 190);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.strokeStyle = '#A63A2E';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#A63A2E';
  ctx.font = '26px "EB Garamond", serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.date, 0, 8);
  ctx.restore();
  ctx.globalAlpha = 1;

  // 底部店名 + 二维码位
  ctx.strokeStyle = '#B9A67F';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(120, H - 220);
  ctx.lineTo(W - 120, H - 220);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#B85C38';
  ctx.font = '52px "Ma Shan Zheng", "Noto Serif SC", serif';
  ctx.fillText('解忧杂货店', 120, H - 180);
  ctx.fillStyle = '#4E5D5A';
  ctx.font = '28px "Noto Serif SC", serif';
  ctx.fillText('写下烦恼，明天来牛奶箱取回答。', 120, H - 110);
  // 二维码占位
  ctx.strokeStyle = '#C9B48C';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 260, H - 190, 120, 120);
  ctx.fillStyle = '#4E5D5A';
  ctx.font = '20px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('扫码进店', W - 200, H - 46);
  ctx.textAlign = 'left';

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'namiya-letter-share.png';
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- 手写落款描边出现 ---------------- */
function HandSignature({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('inline-flex', className)}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.13, ease: EASE }}
          className="inline-block"
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function LetterDetail() {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { id } = useParams();
  const letterId = Number(id);
  const [searchParams] = useSearchParams();
  const isEggArrival = searchParams.get('egg') === '1';
  const utils = trpc.useUtils();

  const { data: letter, isLoading: loading, error } = trpc.letter.detail.useQuery(
    { id: letterId },
    { enabled: isAuthenticated && Number.isFinite(letterId), retry: false },
  );

  // 详情接口会自动标记回信已读 → 同步 Navbar 角标与列表
  useEffect(() => {
    if (letter) {
      utils.letter.unreadCount.invalidate();
      utils.letter.mine.invalidate();
    }
  }, [letter, utils]);

  const [sharing, setSharing] = useState(false);

  const paragraphs = useMemo(
    () => (letter?.content ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean),
    [letter],
  );
  const replyParagraphs = useMemo(
    () => (letter?.replyContent ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean),
    [letter],
  );

  if (isLoading || !isAuthenticated) return <PageLoading note="正在从牛奶箱里取信……" />;
  if (loading) return <PageLoading note="正在从牛奶箱里取信……" />;
  if (error || !letter) {
    return (
      <div className="mx-auto max-w-letter px-4 py-24 text-center">
        <p className="font-hand text-3xl text-wood">这封信不在你的牛奶箱里。</p>
        <Link to="/letters/mine" className="link-underline-hand mt-6 inline-block text-sm text-slate hover:text-stamp">
          回到我的牛奶箱 →
        </Link>
      </div>
    );
  }

  const isEgg = letter.status === 'egg';
  const hasReply = (letter.status === 'replied' || isEgg) && !!letter.replyContent;
  const thanksEligible =
    letter.status === 'replied' &&
    !!letter.repliedAt &&
    !letter.thanksContent &&
    Date.now() >= new Date(letter.repliedAt).getTime() + THANKS_AFTER_DAYS * 24 * 3600 * 1000;

  const share = async () => {
    setSharing(true);
    try {
      await downloadShareCard({
        replyExcerpt: excerpt(letter.replyContent ?? '', 220),
        date: fmtPostmarkDate(letter.repliedAt ?? letter.createdAt),
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="relative overflow-hidden py-14">
      {/* 顶部台灯暖光 */}
      <LampGlow size={380} bright className="absolute -top-16 left-1/2 -translate-x-1/2" />

      <div className="relative mx-auto max-w-letter px-4">
        {/* 白纸彩蛋惊喜提示 */}
        {isEgg && isEggArrival && (
          <motion.div
            initial={{ y: -100, opacity: 0, rotate: 2 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            className="mb-8 rounded-lg bg-night px-6 py-5 text-center shadow-paper-deep"
          >
            <p className="font-hand text-2xl text-lamp-glow">一张白纸，也收到了回信。</p>
            <p className="mt-2 text-sm leading-7 text-night-text/80">
              你什么都没写——但店主说，没有字的信，更要认真回。这就是「白纸回信」。
            </p>
          </motion.div>
        )}

        {/* Section 2 · 来信（整页 PaperUnfold 进入） */}
        <PaperUnfold stamp={<Postmark date={fmtPostmarkDate(letter.createdAt)} size={88} />}>
          <LetterPaper date={undefined} signature="" lines>
            {/* 首行让位右上角邮戳：窄屏少让 16px（pr-20），sm 以上恢复 pr-24 */}
            <div className="flex items-center gap-3 pr-20 sm:pr-24">
              <CategorySeal category={letter.category} size={40} />
              <p className="font-garamond text-xs tracking-[0.12em] text-slate">
                {fmtPostmarkDate(letter.createdAt)} · 投进投递口
              </p>
            </div>
            {paragraphs.length > 0 ? (
              <div className="mt-6 space-y-0">
                {paragraphs.map((p, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.9 + i * 0.2, ease: EASE }}
                    className="indent-8 leading-8"
                  >
                    {p}
                  </motion.p>
                ))}
              </div>
            ) : (
              <p className="mt-6 leading-8 text-slate">（一张白纸，什么也没写。）</p>
            )}
            <p className="mt-8 text-right font-hand text-2xl text-wood">——{letter.penName}</p>
            <p className="mt-4 text-right text-xs tracking-[0.12em] text-slate">
              {CATEGORY_LABELS[letter.category]}
            </p>
          </LetterPaper>
        </PaperUnfold>

        {/* Section 3 · 回信（三态） */}
        <div className="mt-12">
          {!hasReply && letter.status === 'pending' && (
            /* 状态 A · 待回信 */
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="card-postcard flex flex-col items-center gap-4 px-8 py-8 text-center"
            >
              <div className="relative h-14 w-14">
                <LampGlow size={80} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                <img src="/night-lamp.svg" alt="台灯" className="relative mx-auto h-14 w-14" />
              </div>
              <p className="text-sm leading-7 text-ink">
                店主正在认真读你的信。回信会在{' '}
                <span className="font-garamond text-stamp">
                  {fmtPostmarkDate(replyDeadline(letter.createdAt))}
                </span>{' '}
                前放进牛奶箱。
              </p>
              <CountdownTag target={replyDeadline(letter.createdAt)} />
            </motion.div>
          )}

          {hasReply && (
            /* 状态 B/C · 已回信 / 白纸彩蛋（缩版 PaperUnfold 入视口再播） */
            <PaperUnfold
              onScroll
              stamp={<Postmark date={fmtPostmarkDate(letter.repliedAt)} size={88} />}
            >
              <div
                className="kraft-lines relative rounded-md p-8 shadow-paper md:px-10"
                style={{
                  border: '1px solid #D9C9A8',
                  background: 'linear-gradient(160deg, #F9F3E6 0%, #F3EAD6 100%)',
                }}
              >
                {isEgg && (
                  <span className="absolute -right-2 -top-2 rotate-6 rounded-sm border border-moss bg-milk px-2 py-0.5 text-[11px] tracking-[0.12em] text-moss">
                    {LETTER_STATUS_LABELS.egg} · 彩蛋
                  </span>
                )}
                <p className="pr-20 text-[17px] leading-8 text-ink sm:pr-24">{letter.penName} 收：</p>
                <div className="mt-8 text-[17px] text-ink">
                  {replyParagraphs.map((p, i) => (
                    <p key={i} className="indent-8 leading-8">
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-8 text-right font-hand text-base leading-8 text-slate">一切全在你自己。</p>
                <p className="mt-6 text-right font-hand text-3xl leading-10 text-wood">
                  <HandSignature text="浪矢杂货店" />
                </p>
              </div>
            </PaperUnfold>
          )}
        </div>

        {/* Section 4 · 回信后动作条 */}
        {hasReply && (
          <motion.section
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-12 flex flex-col gap-6"
          >
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={share}
                disabled={sharing}
                className="inline-flex items-center gap-2 rounded-lg bg-wood px-6 py-3 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110 disabled:opacity-60"
              >
                <Share2 size={15} />
                {sharing ? '正在包纸……' : '把这封回信分享给需要的人'}
              </button>
              <p className="text-xs leading-6 text-slate">生成一张信纸分享卡，把这家店告诉一个需要的人。</p>
            </div>

            {thanksEligible && (
              <div className="rounded-xl border border-moss/60 bg-moss/10 px-6 py-5">
                <p className="font-hand text-xl text-wood">后来怎么样了？</p>
                <p className="mt-1 text-sm leading-7 text-slate">
                  回信送到已经满 {THANKS_AFTER_DAYS} 天了。给店主写封感谢信吧。
                </p>
                <Link
                  to={`/letters/${letter.id}/thanks`}
                  className="mt-3 inline-flex rounded-lg bg-moss px-6 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110"
                >
                  给店主写封感谢信 →
                </Link>
              </div>
            )}

            {letter.thanksContent && (
              /* 已写感谢信：第三张小信纸 */
              <PaperUnfold onScroll>
                <div
                  className="kraft-lines relative rounded-md bg-cream/90 px-6 py-8 shadow-paper md:px-8"
                  style={{ border: '1px solid #D9C9A8' }}
                >
                  <span className="absolute right-4 top-4 rotate-[-8deg] rounded-sm border border-moss px-2 py-0.5 text-[11px] tracking-[0.12em] text-moss">
                    店主已读
                  </span>
                  <p className="font-garamond text-xs leading-5 tracking-[0.12em] text-slate">
                    {fmtPostmarkDate(letter.thanksAt)} · 你的感谢信
                  </p>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-ink">
                    {letter.thanksContent}
                  </p>
                </div>
              </PaperUnfold>
            )}
          </motion.section>
        )}

        <p className="mt-14 text-center">
          <Link to="/letters/mine" className="link-underline-hand text-sm text-slate hover:text-stamp">
            ← 回到牛奶箱
          </Link>
        </p>
      </div>
    </div>
  );
}
