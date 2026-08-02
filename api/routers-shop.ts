import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { TRPCError } from "@trpc/server";
import * as shopQ from "./queries/shop";
import * as orderQ from "./queries/orders";
import * as letterQ from "./queries/letters";
import * as contentQ from "./queries/contents";
import { draftLetterReply } from "./ai/draft";
import {
  EGG_REPLY,
  LETTER_RATE_LIMIT_PER_HOUR,
  REPLY_SLA_HOURS,
  THANKS_AFTER_DAYS,
} from "@contracts/labels";

// ============ 商城 ============
export const shopRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z.enum(["stationery", "kitchen", "healing"]).optional(),
        keyword: z.string().max(100).optional(),
        sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(48).default(12),
      }),
    )
    .query(({ input }) => shopQ.listProducts(input)),

  featured: publicQuery.query(() => shopQ.listFeaturedProducts(8)),

  detail: publicQuery
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const p = await shopQ.findProductById(input.id);
      if (!p || p.status !== "on_sale") {
        throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在或已下架" });
      }
      return p;
    }),
});

// ============ 购物车 ============
export const cartRouter = createRouter({
  list: authedQuery.query(({ ctx }) => orderQ.listCart(ctx.user.id)),
  count: authedQuery.query(({ ctx }) => orderQ.cartCount(ctx.user.id)),

  add: authedQuery
    .input(z.object({ productId: z.number().int(), quantity: z.number().int().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const p = await shopQ.findProductById(input.productId);
      if (!p || p.status !== "on_sale") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "商品不存在或已下架" });
      }
      if (p.stock < input.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `「${p.name}」库存不足` });
      }
      await orderQ.addToCart(ctx.user.id, input.productId, input.quantity);
      return { ok: true };
    }),

  update: authedQuery
    .input(z.object({ itemId: z.number().int(), quantity: z.number().int().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      await orderQ.updateCartQuantity(ctx.user.id, input.itemId, input.quantity);
      return { ok: true };
    }),

  remove: authedQuery
    .input(z.object({ itemId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await orderQ.removeCartItem(ctx.user.id, input.itemId);
      return { ok: true };
    }),
});

// ============ 订单 ============
export const orderRouter = createRouter({
  /** 下单：items 为商品+数量（从购物车勾选或立即购买）；可选 cartItemIds 用于下单后清车 */
  create: authedQuery
    .input(
      z.object({
        items: z
          .array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1).max(99) }))
          .min(1),
        cartItemIds: z.array(z.number().int()).optional(),
        receiver: z.string().min(1).max(128),
        phone: z.string().min(5).max(32),
        address: z.string().min(5).max(512),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await orderQ.createOrder({
          userId: ctx.user.id,
          items: input.items,
          receiver: input.receiver,
          phone: input.phone,
          address: input.address,
        });
        // 清理已结算的购物车条目
        if (input.cartItemIds?.length) {
          for (const id of input.cartItemIds) {
            await orderQ.removeCartItem(ctx.user.id, id);
          }
        }
        return result;
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "下单失败",
        });
      }
    }),

  pay: authedQuery
    .input(z.object({ orderNo: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await orderQ.payOrder(ctx.user.id, input.orderNo);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "支付失败",
        });
      }
    }),

  cancel: authedQuery
    .input(z.object({ orderNo: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ok = await orderQ.cancelOrder(ctx.user.id, input.orderNo);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "仅待支付订单可取消" });
      return { ok: true };
    }),

  mine: authedQuery
    .input(z.object({ status: z.string().optional() }))
    .query(({ ctx, input }) => orderQ.listMyOrders(ctx.user.id, input.status)),

  detail: authedQuery
    .input(z.object({ orderNo: z.string() }))
    .query(async ({ ctx, input }) => {
      const o = await orderQ.findOrderDetail(ctx.user.id, input.orderNo, ctx.user.role === "admin");
      if (!o) throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      return o;
    }),
});

// ============ 解忧信箱 ============
export const letterRouter = createRouter({
  /** 写信投递（含白纸彩蛋分支与温和限流） */
  create: authedQuery
    .input(
      z.object({
        penName: z.string().min(1).max(64),
        category: z.enum(["love", "dream", "family", "career", "life"]),
        content: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isBlank = input.content.trim().length === 0;

      if (!isBlank) {
        // 温和限流：1 小时最多 3 封
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await letterQ.countRecentLetters(ctx.user.id, since);
        if (recent >= LETTER_RATE_LIMIT_PER_HOUR) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "店主正在认真读上一封信，请稍后再来。",
          });
        }
      }

      const id = await letterQ.createLetter({
        userId: ctx.user.id,
        penName: input.penName,
        category: input.category,
        content: input.content,
        status: isBlank ? "egg" : "pending",
        ...(isBlank ? { replyContent: EGG_REPLY, repliedAt: new Date() } : {}),
      });
      return { id, egg: isBlank };
    }),

  mine: authedQuery.query(({ ctx }) => letterQ.listMyLetters(ctx.user.id)),

  unreadCount: authedQuery.query(({ ctx }) => letterQ.countUnreadReplies(ctx.user.id)),

  detail: authedQuery
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const letter = await letterQ.findMyLetter(ctx.user.id, input.id, true);
      if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "信件不存在" });
      return letter;
    }),

  /** 感谢信：回信送达 THANKS_AFTER_DAYS 天后开放 */
  thanks: authedQuery
    .input(z.object({ id: z.number().int(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const letter = await letterQ.findLetterForThanks(ctx.user.id, input.id);
      if (!letter || letter.status !== "replied" || !letter.repliedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "这封信还不能写感谢信" });
      }
      const openAt = letter.repliedAt.getTime() + THANKS_AFTER_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() < openAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `回信送达 ${THANKS_AFTER_DAYS} 天后，感谢信才会开放哦`,
        });
      }
      const ok = await letterQ.addThanks(ctx.user.id, input.id, input.content);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "感谢信已写过了" });
      return { ok: true };
    }),

  /** 公开精选墙 */
  featured: publicQuery.query(() => letterQ.listFeaturedLetters()),

  /** 信箱首页展示的承诺信息 */
  promise: publicQuery.query(() => ({
    slaHours: REPLY_SLA_HOURS,
    text: "晚上把烦恼投进投递口，明早 8:30 前，回信会放进牛奶箱。",
  })),
});

// ============ 内容（语录/示例信件/关于） ============
export const contentRouter = createRouter({
  quotes: publicQuery.query(() => contentQ.listContents("quote")),
  stories: publicQuery.query(() => contentQ.listContents("story")),
  about: publicQuery.query(() => contentQ.listContents("about")),
});

// ============ 管理后台 ============
export const adminRouter = createRouter({
  // 商品
  products: adminQuery.query(() => shopQ.adminListProducts()),
  createProduct: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        category: z.enum(["stationery", "kitchen", "healing"]),
        price: z.number().positive(),
        stock: z.number().int().min(0),
        imageUrl: z.string().max(512).optional(),
        description: z.string().optional(),
        keeperNote: z.string().optional(),
      }),
    )
    .mutation(({ input }) =>
      shopQ.createProduct({ ...input, price: input.price.toFixed(2) }),
    ),
  updateProduct: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        category: z.enum(["stationery", "kitchen", "healing"]).optional(),
        price: z.number().positive().optional(),
        stock: z.number().int().min(0).optional(),
        imageUrl: z.string().max(512).optional(),
        description: z.string().optional(),
        keeperNote: z.string().optional(),
      }),
    )
    .mutation(({ input }) => {
      const { id, price, ...rest } = input;
      return shopQ.updateProduct(id, {
        ...rest,
        ...(price !== undefined ? { price: price.toFixed(2) } : {}),
      });
    }),
  setProductStatus: adminQuery
    .input(z.object({ id: z.number().int(), status: z.enum(["on_sale", "off_shelf"]) }))
    .mutation(({ input }) => shopQ.setProductStatus(input.id, input.status)),

  // 信件
  letters: adminQuery
    .input(z.object({ filter: z.enum(["pending", "replied", "all"]).optional() }))
    .query(({ input }) => letterQ.adminListLetters(input.filter)),
  letterDetail: adminQuery
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => letterQ.adminFindLetter(input.id)),
  replyLetter: adminQuery
    .input(z.object({ id: z.number().int(), replyContent: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const ok = await letterQ.replyLetter(input.id, input.replyContent, ctx.user.id);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "该信件不在待回队列中" });
      return { ok: true };
    }),
  /** AI 起草回信：把来信发给 Agent 拿草稿，店主审阅/修改后手动发送（走 replyLetter） */
  aiDraftReply: adminQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const letter = await letterQ.adminFindLetter(input.id);
      if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "信件不存在" });
      const draft = await draftLetterReply({
        penName: letter.penName,
        category: letter.category,
        content: letter.content,
      });
      return { draft };
    }),
  featureLetter: adminQuery
    .input(z.object({ id: z.number().int(), featured: z.boolean() }))
    .mutation(({ input }) => letterQ.setLetterFeatured(input.id, input.featured)),

  // 订单
  orders: adminQuery
    .input(z.object({ status: z.string().optional() }))
    .query(({ input }) => orderQ.adminListOrders(input.status)),
  shipOrder: adminQuery
    .input(z.object({ orderNo: z.string() }))
    .mutation(async ({ input }) => {
      const ok = await orderQ.shipOrder(input.orderNo);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "仅待发货订单可发货" });
      return { ok: true };
    }),

  // 内容
  contents: adminQuery
    .input(z.object({ type: z.enum(["quote", "story", "about"]).optional() }))
    .query(({ input }) => contentQ.adminListContents(input.type)),
  createContent: adminQuery
    .input(
      z.object({
        type: z.enum(["quote", "story", "about"]),
        title: z.string().min(1).max(255),
        body: z.string().min(1),
        sourceNote: z.string().max(255).optional(),
        sort: z.number().int().optional(),
      }),
    )
    .mutation(({ input }) => contentQ.createContent(input)),
  updateContent: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(255).optional(),
        body: z.string().min(1).optional(),
        sourceNote: z.string().max(255).optional(),
        sort: z.number().int().optional(),
        status: z.enum(["online", "offline"]).optional(),
      }),
    )
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return contentQ.updateContent(id, rest);
    }),
  deleteContent: adminQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => contentQ.deleteContent(input.id)),
});
