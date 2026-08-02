import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PackagePlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { PRODUCT_CATEGORIES } from '@contracts/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
  ADMIN_THEAD_ROW,
  ADMIN_TR,
  AdminSectionTitle,
  PRODUCT_IMAGE_CHOICES,
  StatusSeal,
  fmtDate,
  productCategoryLabel,
  type AdminProduct,
} from './helpers';

interface ProductFormState {
  name: string;
  category: 'stationery' | 'kitchen' | 'healing';
  price: string;
  stock: string;
  imageUrl: string;
  description: string;
  keeperNote: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  category: 'stationery',
  price: '',
  stock: '',
  imageUrl: '/product-placeholder.png',
  description: '',
  keeperNote: '',
};

function productToForm(p: AdminProduct): ProductFormState {
  return {
    name: p.name,
    category: p.category,
    price: String(p.price),
    stock: String(p.stock),
    imageUrl: p.imageUrl || '/product-placeholder.png',
    description: p.description ?? '',
    keeperNote: p.keeperNote ?? '',
  };
}

/** 货架管理：商品表格 + 新增/编辑对话框 + 上下架切换 */
export default function AdminProducts() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.products.useQuery();
  const products = (data ?? []) as AdminProduct[];

  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const refresh = () => utils.admin.invalidate();

  const createMutation = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success('已包好，放上货架了。');
      setDialogOpen(false);
      refresh();
    },
    onError: (e) => toast.error(e.message || '保存失败，请再试一次'),
  });
  const updateMutation = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success('货架信息已更新。');
      setDialogOpen(false);
      refresh();
    },
    onError: (e) => toast.error(e.message || '保存失败，请再试一次'),
  });
  const statusMutation = trpc.admin.setProductStatus.useMutation({
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'on_sale' ? '已重新上架。' : '已从货架撤下。');
      refresh();
    },
    onError: (e) => toast.error(e.message || '操作失败'),
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (kw && !p.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [products, keyword, categoryFilter, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setForm(productToForm(p));
    setFormError('');
    setDialogOpen(true);
  };

  const submit = () => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) return setFormError('给商品起个名字吧。');
    if (!Number.isFinite(price) || price <= 0) return setFormError('价格要是大于 0 的数字。');
    if (!Number.isInteger(stock) || stock < 0) return setFormError('库存要是不是负数的整数。');
    setFormError('');
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price,
      stock,
      imageUrl: form.imageUrl || undefined,
      description: form.description.trim() || undefined,
      keeperNote: form.keeperNote.trim() || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <section>
      <AdminSectionTitle
        title="货架管理"
        note="货架上寥寥的商品，但每一件都用纸包好了。"
      />

      {/* 工具条 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} className="bg-stamp text-cream hover:bg-stamp/90">
          <PackagePlus size={16} /> 上架新商品
        </Button>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 border-[#C9B48C] bg-cream/80">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 border-[#C9B48C] bg-cream/80">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="on_sale">在售</SelectItem>
            <SelectItem value="off_shelf">下架</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="找找货架上的名字…"
            className="w-52 border-[#C9B48C] bg-cream/80 pl-8"
          />
        </div>
      </div>

      {/* 商品表格 */}
      <div className="card-postcard overflow-x-auto p-4">
        <table className={ADMIN_TABLE}>
          <thead>
            <tr className={ADMIN_THEAD_ROW}>
              <th className={ADMIN_TH}>图</th>
              <th className={ADMIN_TH}>名称</th>
              <th className={ADMIN_TH}>分类</th>
              <th className={ADMIN_TH}>价格</th>
              <th className={ADMIN_TH}>库存</th>
              <th className={ADMIN_TH}>上架日期</th>
              <th className={ADMIN_TH}>状态</th>
              <th className={`${ADMIN_TH} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate">
                  店主正在清点货架…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate">
                  货架这一层空着，去上架点什么吧。
                </td>
              </tr>
            )}
            {filtered.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={ADMIN_TR}
              >
                <td className={ADMIN_TD}>
                  <img
                    src={p.imageUrl || '/product-placeholder.png'}
                    alt={p.name}
                    className="h-14 w-14 rounded-md border border-[#C9B48C] object-cover"
                    loading="lazy"
                  />
                </td>
                <td className={`${ADMIN_TD} max-w-44`}>
                  <div className="font-medium text-ink">{p.name}</div>
                  {p.keeperNote && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate">手记：{p.keeperNote}</div>
                  )}
                </td>
                <td className={ADMIN_TD}>
                  <span className="rounded bg-milk/70 px-1.5 py-0.5 text-xs text-slate">
                    {productCategoryLabel(p.category)}
                  </span>
                </td>
                <td className={`${ADMIN_TD} font-garamond text-lg`}>
                  <span className="text-xs">¥</span>
                  {p.price.toFixed(2)}
                </td>
                <td className={ADMIN_TD}>
                  {p.stock === 0 ? (
                    <span className="font-medium text-vermilion">售罄</span>
                  ) : (
                    <span className={p.stock < 10 ? 'font-medium text-moss' : ''}>{p.stock}</span>
                  )}
                </td>
                <td className={`${ADMIN_TD} font-garamond text-slate`}>{fmtDate(p.createdAt)}</td>
                <td className={ADMIN_TD}>
                  <StatusSeal tone={p.status === 'on_sale' ? 'moss' : 'slate'}>
                    {p.status === 'on_sale' ? '在售' : '下架'}
                  </StatusSeal>
                </td>
                <td className={`${ADMIN_TD} text-right`}>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-sm text-wood underline decoration-dotted underline-offset-4 hover:text-stamp"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: p.id,
                          status: p.status === 'on_sale' ? 'off_shelf' : 'on_sale',
                        })
                      }
                      className="text-sm text-wood underline decoration-dotted underline-offset-4 hover:text-stamp disabled:opacity-50"
                    >
                      {p.status === 'on_sale' ? '下架' : '上架'}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新增 / 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-[#C9B48C] bg-kraft sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-hand text-2xl text-wood">
              {editing ? '整理这件商品' : '上架新商品'}
            </DialogTitle>
            <DialogDescription className="text-slate">
              保存后前台货架立即生效。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">商品名称</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：和纸信笺套装"
                className="border-[#C9B48C] bg-cream/80"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>分类</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as ProductFormState['category'] })
                  }
                >
                  <SelectTrigger className="border-[#C9B48C] bg-cream/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>商品图片（店内已有素材）</Label>
                <Select
                  value={form.imageUrl}
                  onValueChange={(v) => setForm({ ...form, imageUrl: v })}
                >
                  <SelectTrigger className="border-[#C9B48C] bg-cream/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_IMAGE_CHOICES.map((img) => (
                      <SelectItem key={img.value} value={img.value}>
                        {img.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="p-price">价格（元）</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="36.00"
                  className="border-[#C9B48C] bg-cream/80"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-stock">库存</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="12"
                  className="border-[#C9B48C] bg-cream/80"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-desc">商品描述</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="摆在货架第几层、什么来头、适合谁…"
                className="border-[#C9B48C] bg-cream/80"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-note">店主手记</Label>
              <Textarea
                id="p-note"
                rows={2}
                value={form.keeperNote}
                onChange={(e) => setForm({ ...form, keeperNote: e.target.value })}
                placeholder="写给客人的一句悄悄话…"
                className="border-[#C9B48C] bg-cream/80"
              />
              {form.keeperNote.trim() && (
                <p className="-rotate-1 border-l-2 border-vermilion/70 pl-3 pt-1 font-hand text-lg text-wood">
                  {form.keeperNote}
                </p>
              )}
            </div>

            {formError && (
              <p className="rounded border border-moss/50 bg-moss/10 px-3 py-2 text-sm text-moss">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              先放一放
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-stamp text-cream hover:bg-stamp/90"
            >
              {saving ? '正在包好…' : editing ? '保存修改' : '放上货架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
