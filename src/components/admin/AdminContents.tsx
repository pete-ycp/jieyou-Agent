import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
  ADMIN_THEAD_ROW,
  ADMIN_TR,
  AdminSectionTitle,
  StatusSeal,
  fmtDate,
  type AdminContent,
} from './helpers';

type ContentType = 'quote' | 'story' | 'about';

const TYPE_TABS: { value: ContentType; label: string; note: string }[] = [
  { value: 'quote', label: '语录', note: '钉在店堂墙上的句子' },
  { value: 'story', label: '示例信件', note: '化名故事，只读预览' },
  { value: 'about', label: '关于页文案', note: '浪矢杂货店的故事，只读预览' },
];

/** 内容架：语录 / 示例信件 / 关于页，上下线切换 + 新增语录 */
export default function AdminContents() {
  const utils = trpc.useUtils();
  const [type, setType] = useState<ContentType>('quote');
  const { data, isLoading } = trpc.admin.contents.useQuery({ type });
  const contents = (data ?? []) as AdminContent[];

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', sourceNote: '', sort: '0' });

  const updateMutation = trpc.admin.updateContent.useMutation({
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'online' ? '已挂回墙上。' : '已先收进抽屉。');
      utils.admin.invalidate();
    },
    onError: (e) => toast.error(e.message || '操作失败'),
  });

  const createMutation = trpc.admin.createContent.useMutation({
    onSuccess: () => {
      toast.success('新语录钉上墙了。');
      setDialogOpen(false);
      setForm({ title: '', body: '', sourceNote: '', sort: '0' });
      utils.admin.invalidate();
    },
    onError: (e) => toast.error(e.message || '保存失败，请再试一次'),
  });

  const deleteMutation = trpc.admin.deleteContent.useMutation({
    onSuccess: () => {
      toast.success('已从内容架撤下。');
      utils.admin.invalidate();
    },
    onError: (e) => toast.error(e.message || '操作失败'),
  });

  const toggleStatus = (c: AdminContent) => {
    updateMutation.mutate({
      id: c.id,
      status: c.status === 'online' ? 'offline' : 'online',
    });
  };

  const submit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('标题和正文都要写哦。');
      return;
    }
    const sort = Number(form.sort);
    createMutation.mutate({
      type: 'quote',
      title: form.title.trim(),
      body: form.body.trim(),
      sourceNote: form.sourceNote.trim() || undefined,
      sort: Number.isInteger(sort) ? sort : 0,
    });
  };

  const remove = (c: AdminContent) => {
    if (!window.confirm(`把「${c.title}」从内容架上撤掉吗？`)) return;
    deleteMutation.mutate({ id: c.id });
  };

  const activeTab = TYPE_TABS.find((t) => t.value === type)!;

  return (
    <section>
      <AdminSectionTitle title="内容架" note="语录、示例信件与关于页，都是店里的陈设。" />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value);
              setExpandedId(null);
            }}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              type === t.value
                ? 'border-wood bg-wood text-cream'
                : 'border-[#C9B48C] bg-cream/60 text-wood hover:bg-lamp/15',
            )}
          >
            {t.label}
          </button>
        ))}
        {type === 'quote' && (
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="ml-auto bg-stamp text-cream hover:bg-stamp/90"
          >
            <Plus size={14} /> 新增语录
          </Button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate">{activeTab.note}</p>

      <div className="card-postcard overflow-x-auto p-4">
        <table className={ADMIN_TABLE}>
          <thead>
            <tr className={ADMIN_THEAD_ROW}>
              <th className={ADMIN_TH}>标题</th>
              <th className={ADMIN_TH}>正文</th>
              <th className={ADMIN_TH}>出处</th>
              <th className={ADMIN_TH}>排序</th>
              <th className={ADMIN_TH}>更新</th>
              <th className={ADMIN_TH}>上线</th>
              {type === 'quote' && <th className={`${ADMIN_TH} text-right`}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate">
                  正在擦拭内容架…
                </td>
              </tr>
            )}
            {!isLoading && contents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate">
                  这一格还空着。
                </td>
              </tr>
            )}
            {contents.map((c, i) => {
              const expanded = expandedId === c.id;
              return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(ADMIN_TR, 'cursor-pointer')}
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                >
                  <td className={`${ADMIN_TD} max-w-40`}>
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      {c.title}
                      <ChevronDown
                        size={14}
                        className={cn(
                          'shrink-0 text-slate transition-transform duration-300',
                          expanded && 'rotate-180',
                        )}
                      />
                    </div>
                    {expanded && (
                      <p className="mt-2 whitespace-pre-wrap text-[13px] font-normal leading-6 text-slate">
                        {c.body}
                      </p>
                    )}
                  </td>
                  <td className={`${ADMIN_TD} max-w-56`}>
                    <span className="line-clamp-2 text-[13px] text-slate">{c.body}</span>
                  </td>
                  <td className={ADMIN_TD}>
                    {c.sourceNote ? (
                      <span className="text-xs tracking-[0.08em] text-vermilion">{c.sourceNote}</span>
                    ) : (
                      <span className="text-xs text-slate">—</span>
                    )}
                  </td>
                  <td className={`${ADMIN_TD} font-garamond`}>{c.sort}</td>
                  <td className={`${ADMIN_TD} font-garamond text-slate`}>{fmtDate(c.createdAt)}</td>
                  <td className={ADMIN_TD} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.status === 'online'}
                        disabled={updateMutation.isPending}
                        onCheckedChange={() => toggleStatus(c)}
                        aria-label="上下线切换"
                      />
                      <StatusSeal tone={c.status === 'online' ? 'moss' : 'slate'}>
                        {c.status === 'online' ? '在线' : '下线'}
                      </StatusSeal>
                    </div>
                  </td>
                  {type === 'quote' && (
                    <td className={`${ADMIN_TD} text-right`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => remove(c)}
                        className="text-sm text-wood underline decoration-dotted underline-offset-4 hover:text-stamp disabled:opacity-50"
                      >
                        撤下
                      </button>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 新增语录 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#C9B48C] bg-kraft sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-hand text-2xl text-wood">新增语录</DialogTitle>
            <DialogDescription className="text-slate">
              一句会留在客人心里的话。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="c-title">标题</Label>
              <Input
                id="c-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：关于回答"
                className="border-[#C9B48C] bg-cream/80"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-body">正文</Label>
              <Textarea
                id="c-body"
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="语录内容…"
                className="border-[#C9B48C] bg-cream/80"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="c-source">出处（可空）</Label>
                <Input
                  id="c-source"
                  value={form.sourceNote}
                  onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
                  placeholder="浪矢爷爷的话"
                  className="border-[#C9B48C] bg-cream/80"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-sort">排序号（小在前）</Label>
                <Input
                  id="c-sort"
                  type="number"
                  step="1"
                  value={form.sort}
                  onChange={(e) => setForm({ ...form, sort: e.target.value })}
                  className="border-[#C9B48C] bg-cream/80"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending}>
              再想想
            </Button>
            <Button
              onClick={submit}
              disabled={createMutation.isPending}
              className="bg-stamp text-cream hover:bg-stamp/90"
            >
              {createMutation.isPending ? '正在写下…' : '钉上墙'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
