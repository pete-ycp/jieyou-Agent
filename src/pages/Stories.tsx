import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { BookOpenText, PenLine } from 'lucide-react';
import CategorySeal, { CATEGORIES } from '@/components/shop/CategorySeal';
import type { CategoryKey } from '@/components/shop/CategorySeal';
import LetterPaper from '@/components/shop/LetterPaper';
import Reveal from '@/components/shop/Reveal';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** 分类 → 对应插画 */
const CATEGORY_IMAGES: Record<CategoryKey, string> = {
  love: '/story-moon-rabbit.png',
  dream: '/story-musician.png',
  family: '/story-family.png',
  career: '/story-career.png',
  life: '/story-life.png',
};

interface StoryItem {
  id: string;
  penName: string;
  category: CategoryKey;
  /** 烦恼一句话钩子 */
  hook: string;
  /** 回信金句 */
  golden: string;
  letter: string;
  reply: string;
  image: string;
  sourceNote: string;
}

/** 静态兜底：五篇化名示例信件（接口加载中/失败时展示，不白屏） */
const FALLBACK_STORIES: StoryItem[] = [
  {
    id: 'moon-rabbit',
    penName: '月兔',
    category: 'love',
    hook: '他的梦想和我的陪伴，只能选一个吗？',
    golden: '你问出口的时候，心里其实已经有答案了。',
    letter:
      '浪矢爷爷：\n\n我喜欢的人要去很远的城市治病，至少一年。教练说，只要我留下集训，今年就能进省队——那是我练了八年的目标。我每天都在想，是陪他走，还是留下。想得头疼，还是决定不了。请您告诉我，哪条路是对的？',
    reply:
      '月兔：\n\n你的信我看了三遍。恕我直言，你心里其实早有答案，只是需要有人替你确认。\n\n我想问你一个问题：如果他去治病前对你说「我希望你站在赛场上」，你会怎么选？真正在意你的人，往往希望看到你成为你想成为的样子。陪伴有许多种方式，不一定都要站在原地。\n\n无论选哪条路，都不要选「后悔」这条路。',
    image: CATEGORY_IMAGES.love,
    sourceNote: '化名故事 · 爱情',
  },
  {
    id: 'musician',
    penName: '鱼店音乐人',
    category: 'dream',
    hook: '继承鱼店，还是去追看不见头的音乐路？',
    golden: '坚持不是一条路走到黑，是走了很远还愿意回头确认。',
    letter:
      '店主：\n\n我在城里唱了三年，livehouse 的观众从来没有超过二十个人。家里打来电话，说父亲的店需要人接手。我该继续唱下去，还是回家？继续唱，怕十年后还是二十个观众；回家，又怕这辈子就这样了。',
    reply:
      '鱼店音乐人：\n\n先告诉你一件事：你的歌能被二十个人听见，就说明它值得被唱出来。二十个人里，也许就有一个人会一直记得它。\n\n梦想和现实不是非此即彼的敌人。回家看店不代表放弃音乐，继续唱也不代表不顾家人。真正的问题是：十年后回头看，哪一种「怕」你更承受得起？\n\n想清楚了，就大胆去走。你的音乐，一定会以某种方式留下来。',
    image: CATEGORY_IMAGES.dream,
    sourceNote: '化名故事 · 梦想',
  },
  {
    id: 'paul',
    penName: '迷路的保罗',
    category: 'family',
    hook: '父母要带我连夜搬走，我该原谅他们吗？',
    golden: '家人这艘船，有时要各自游一段，再重新靠岸。',
    letter:
      '浪矢杂货店：\n\n爸妈的生意出了很大的问题，家里每天都很吵。昨天我听见他们说，要「离开这里重新开始」。我才十五岁，我不知道该不该跟他们走，也不知道走了以后我还是谁。',
    reply:
      '迷路的保罗：\n\n十五岁就要想这些，真是难为你了。\n\n家不只是房子和街道，家是人。只要一家人还想在一起，搬到哪里都还是家。但如果有一天你发现彼此的方向不同了，也不必用「走散」来惩罚自己——家人之间最深的牵绊，是希望对方过得好。\n\n你现在能做的，是好好吃饭，好好念书。其他的，让大人先扛一扛。',
    image: CATEGORY_IMAGES.family,
    sourceNote: '化名故事 · 家庭',
  },
  {
    id: 'dog',
    penName: '迷途的小狗',
    category: 'career',
    hook: '白天的工作安稳，夜里的机会危险，选哪个？',
    golden: '想清楚你想成为谁，再决定今晚去哪。',
    letter:
      '店主：\n\n我白天上班，晚上还打一份工。很多人背后说我「太拼了」「一个女孩子何必」。可是我想快点攒够钱，让我在乎的人过上好日子，也想有一家自己的小店。是我太贪心了吗？',
    reply:
      '迷途的小狗：\n\n想让自己在乎的人过得好，这不是贪心，这是温柔。\n\n别人说什么并不重要——他们没有走过你走的路，也没有点过你夜里那盏灯。只是提醒你一句：赚钱是长跑，别在最开始就把力气用光。学一点东西，留一点时间给身体，你的路还很长。\n\n我相信，你的店会开起来的。到时候记得写信告诉我地址。',
    image: CATEGORY_IMAGES.career,
    sourceNote: '化名故事 · 事业',
  },
  {
    id: 'green-river',
    penName: '绿河',
    category: 'life',
    hook: '站在岔路口，我的地图上一片空白。',
    golden: '地图是白纸，才好随心画。一切全在你自己。',
    letter:
      '浪矢爷爷：\n\n我站在人生的岔路口：一份安稳但不喜欢的工作，和一条完全陌生、谁都说不准的路。所有人都劝我选安稳。可是每次想到「就这样过一辈子」，我就觉得透不过气。我该怎么办？',
    reply:
      '绿河：\n\n「所有人都劝你」——这句话里有答案的一半：你的烦恼不是不知道选什么，而是你选的那个，没人替你点头。\n\n那么我来替你点个头吧：想走的那条路，就去走。走错了可以回来，没走过才会想一辈子。人生这张地图，本来就是要一边走一边画的。\n\n一路顺风。到了新的地方，记得来信。',
    image: CATEGORY_IMAGES.life,
    sourceNote: '化名故事 · 人生方向',
  },
];

function isCategory(v: unknown): v is CategoryKey {
  return typeof v === 'string' && v in CATEGORIES;
}

/** 来信正文里挑一句烦恼钩子：跳过称呼与空行 */
function pickHook(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const body = lines.find((l) => !(l.length <= 12 && /[：:]$/.test(l))) ?? lines[0] ?? '';
  return body.length > 38 ? `${body.slice(0, 38)}……` : body;
}

/** 回信正文里挑一句金句：跳过称呼、落款 */
function pickGolden(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates = lines.filter(
    (l) => !(l.length <= 12 && /[：:]$/.test(l)) && !l.includes('浪矢杂货店') && !l.startsWith('——'),
  );
  const line = candidates[candidates.length - 1] ?? '';
  return line.length > 42 ? `${line.slice(0, 42)}……` : line;
}

/* ---------------- Section 1 · 页头 ---------------- */
function PageHeader({ stories }: { stories: StoryItem[] }) {
  const scrollTo = (id: string) => {
    document.getElementById(`story-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-page">
      <div className="mx-auto flex max-w-shop flex-col gap-8 px-6 pb-4 pt-16 md:flex-row md:items-end md:justify-between md:pt-20">
        <div>
          <h1 className="font-hand text-4xl text-page-fg md:text-5xl">
            {'他们曾这样写信'.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: EASE }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
            className="mt-3 text-sm text-slate"
          >
            五封化名故事信。名字是取的，心事是真的。
          </motion.p>
        </div>
        {/* 分类快捷锚点：五枚小印章，点击滚动定位 */}
        <div className="flex flex-wrap items-end gap-4">
          {stories.slice(0, 5).map((s, i) => (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              initial={{ opacity: 0, scale: 1.4, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.45, ease: EASE }}
              className="transition-transform duration-400 ease-shop hover:-translate-y-1"
              aria-label={`跳到${CATEGORIES[s.category].label}的信`}
            >
              <CategorySeal category={s.category} size={46} withLabel />
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 2 · 故事大卡 ---------------- */
function StoryCard({
  story,
  index,
  onOpen,
}: {
  story: StoryItem;
  index: number;
  onOpen: (s: StoryItem) => void;
}) {
  const even = index % 2 === 1;

  return (
    <Reveal x={even ? 60 : -60} y={0} duration={0.9} start="top 80%">
      <article
        id={`story-${story.id}`}
        className="card-postcard group scroll-mt-32 overflow-hidden transition-all duration-500 ease-shop hover:-translate-y-1 hover:shadow-paper-deep"
      >
        <div className="grid md:grid-cols-12">
          {/* 插画：双线框 + 角落「化名故事」朱红小章 */}
          <div className={cn('relative p-4 md:col-span-5', even && 'md:order-2')}>
            <div
              className="relative h-full overflow-hidden rounded-lg bg-cream"
              style={{ border: '1px solid #C9B48C', boxShadow: 'inset 0 0 0 3px #EBDCC3, inset 0 0 0 4px rgba(201,180,140,.5)' }}
            >
              <img
                src={story.image}
                alt={`${story.penName}的故事插画`}
                loading="lazy"
                className="aspect-[4/5] h-full w-full object-cover sepia-[0.15] transition-transform duration-600 ease-shop group-hover:scale-[1.03]"
              />
              <span
                className="absolute right-3 top-3 rounded-sm border-2 border-stamp/80 bg-cream/70 px-2 py-0.5 font-hand text-base text-stamp"
                style={{ transform: 'rotate(-10deg)' }}
              >
                化名故事
              </span>
            </div>
          </div>

          {/* 文案 */}
          <div className={cn('flex flex-col p-7 md:col-span-7 md:p-10', even && 'md:order-1')}>
            <div className="flex items-center gap-4">
              <CategorySeal category={story.category} size={56} withLabel />
              <div>
                <h2 className="font-hand text-3xl text-wood md:text-4xl">{story.penName}</h2>
                <p className="mt-1 text-xs tracking-[0.12em] text-slate">
                  {story.sourceNote} · 原创改写，灵感源自《解忧杂货店》
                </p>
              </div>
            </div>
            <h3 className="mt-6 text-lg font-semibold leading-8 text-ink">「{story.hook}」</h3>
            <p className="mt-3 line-clamp-3 leading-8 text-ink/85">{story.letter}</p>
            <p className="mt-5 border-l-2 border-stamp pl-4 font-hand text-xl leading-8 text-stamp">
              {story.golden}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-5 pt-7">
              <button
                type="button"
                onClick={() => onOpen(story)}
                className="inline-flex items-center gap-2 rounded-lg bg-stamp px-6 py-2.5 text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
              >
                <BookOpenText size={16} />
                展开读这一封
              </button>
              <Link to="/letters/new" className="link-underline-hand text-[15px] text-wood">
                我也有类似的烦恼 → 去写信
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* ---------------- Section 3 · 故事展开抽屉 ---------------- */
function StoryDrawer({ story, onClose }: { story: StoryItem | null; onClose: () => void }) {
  return (
    <Sheet open={!!story} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-l-0 bg-kraft p-0 sm:max-w-2xl"
      >
        {story && (
          <div className="mx-auto max-w-letter px-5 py-10 md:px-8">
            <SheetTitle className="sr-only">{story.penName}的来信与回信</SheetTitle>
            <div className="flex items-center gap-4">
              <CategorySeal category={story.category} size={52} withLabel />
              <div>
                <p className="font-hand text-3xl text-wood">{story.penName}</p>
                <p className="mt-1 text-xs tracking-[0.12em] text-slate">
                  {story.sourceNote} · 原创改写，灵感源自《解忧杂货店》
                </p>
              </div>
            </div>

            {/* 来信：纸面展开缩版 */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0.6, transformOrigin: 'top' }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mt-8"
            >
              <LetterPaper signature={story.penName}>
                <p className="mb-3 text-sm tracking-[0.12em] text-slate">来 信</p>
                <p className="whitespace-pre-line">{story.letter}</p>
              </LetterPaper>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scaleY: 0.6, transformOrigin: 'top' }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
              className="mt-8"
            >
              <LetterPaper signature="浪矢杂货店">
                <p className="mb-3 text-sm tracking-[0.12em] text-slate">回 信</p>
                <p className="whitespace-pre-line">{story.reply}</p>
              </LetterPaper>
            </motion.div>

            {/* 常驻 CTA */}
            <div className="mt-10 flex flex-col items-center gap-3 pb-4">
              <Link
                to="/letters/new"
                className="inline-flex items-center gap-2 rounded-lg bg-stamp px-8 py-3 text-cream shadow-paper-deep transition-transform duration-500 ease-shop hover:translate-y-[1px]"
                style={{ animation: 'cta-breathe 3.2s ease-in-out infinite' }}
              >
                <PenLine size={17} />
                我也有类似的烦恼 → 去写信
              </Link>
              <p className="text-xs text-slate">只需一个笔名，今晚就能投信。</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Section 4 · 底部导流带 ---------------- */
function ClosingBand() {
  const text = '下一封信，写你自己的。';
  return (
    <section className="bg-night">
      <div className="mx-auto flex max-w-shop flex-col items-center gap-8 px-6 py-16 text-center md:py-20">
        <p className="font-hand text-3xl text-cream md:text-4xl">
          {text.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
            >
              {ch}
            </motion.span>
          ))}
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
        >
          <Link
            to="/letters/new"
            className="inline-flex items-center gap-2 rounded-lg bg-stamp px-8 py-3 text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
          >
            <PenLine size={17} />
            写一封信
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- 示例信件墙 ---------------- */
export default function Stories() {
  const { data } = trpc.content.stories.useQuery(undefined, { retry: false });
  const [openStory, setOpenStory] = useState<StoryItem | null>(null);

  const stories = useMemo<StoryItem[]>(() => {
    if (!data || data.length === 0) return FALLBACK_STORIES;
    const parsed = data
      .map((row): StoryItem | null => {
        try {
          const body = JSON.parse(row.body) as {
            penName?: string;
            category?: string;
            letter?: string;
            reply?: string;
          };
          if (!body.letter || !body.reply) return null;
          const category = isCategory(body.category) ? body.category : 'life';
          return {
            id: String(row.id),
            penName: body.penName ?? '无名氏',
            category,
            hook: pickHook(body.letter),
            golden: pickGolden(body.reply),
            letter: body.letter,
            reply: body.reply,
            image: CATEGORY_IMAGES[category],
            sourceNote: row.sourceNote ?? '化名故事',
          };
        } catch {
          return null;
        }
      })
      .filter((s): s is StoryItem => s !== null);
    return parsed.length > 0 ? parsed : FALLBACK_STORIES;
  }, [data]);

  return (
    <>
      <PageHeader stories={stories} />
      <section className="bg-page">
        <div className="mx-auto flex max-w-shop flex-col gap-12 px-6 py-12 md:gap-16 md:py-16">
          {stories.map((s, i) => (
            <StoryCard key={s.id} story={s} index={i} onOpen={setOpenStory} />
          ))}
        </div>
      </section>
      <ClosingBand />
      <StoryDrawer story={openStory} onClose={() => setOpenStory(null)} />
    </>
  );
}
