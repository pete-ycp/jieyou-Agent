import { and, desc, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

// ---------- 购物车 ----------
export async function listCart(userId: number) {
  const rows = await getDb()
    .select({
      id: schema.cartItems.id,
      productId: schema.cartItems.productId,
      quantity: schema.cartItems.quantity,
      name: schema.products.name,
      price: schema.products.price,
      stock: schema.products.stock,
      imageUrl: schema.products.imageUrl,
      status: schema.products.status,
    })
    .from(schema.cartItems)
    .innerJoin(schema.products, eq(schema.cartItems.productId, schema.products.id))
    .where(eq(schema.cartItems.userId, userId))
    .orderBy(desc(schema.cartItems.createdAt));
  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}

export async function cartCount(userId: number) {
  const rows = await getDb()
    .select({ total: sql<number>`coalesce(sum(${schema.cartItems.quantity}),0)` })
    .from(schema.cartItems)
    .where(eq(schema.cartItems.userId, userId));
  return Number(rows.at(0)?.total ?? 0);
}

export async function addToCart(userId: number, productId: number, quantity: number) {
  await getDb()
    .insert(schema.cartItems)
    .values({ userId, productId, quantity })
    .onDuplicateKeyUpdate({
      set: { quantity: sql`${schema.cartItems.quantity} + ${quantity}` },
    });
}

export async function updateCartQuantity(userId: number, itemId: number, quantity: number) {
  await getDb()
    .update(schema.cartItems)
    .set({ quantity })
    .where(and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.userId, userId)));
}

export async function removeCartItem(userId: number, itemId: number) {
  await getDb()
    .delete(schema.cartItems)
    .where(and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.userId, userId)));
}

export async function findCartItemsByIds(userId: number, ids: number[]) {
  if (ids.length === 0) return [];
  return getDb()
    .select()
    .from(schema.cartItems)
    .where(and(eq(schema.cartItems.userId, userId), inArray(schema.cartItems.id, ids)));
}

// ---------- 订单 ----------
export function generateOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NMY${ymd}${rand}`;
}

export async function createOrder(opts: {
  userId: number;
  items: { productId: number; quantity: number }[];
  receiver: string;
  phone: string;
  address: string;
}) {
  const { userId, items, receiver, phone, address } = opts;
  const productIds = items.map((i) => i.productId);
  const prows = await getDb()
    .select()
    .from(schema.products)
    .where(inArray(schema.products.id, productIds));
  const pmap = new Map(prows.map((p) => [p.id, p]));

  for (const it of items) {
    const p = pmap.get(it.productId);
    if (!p || p.status !== "on_sale") throw new Error("商品不存在或已下架");
    if (p.stock < it.quantity) throw new Error(`「${p.name}」库存不足`);
  }

  const total = items.reduce(
    (sum, it) => sum + Number(pmap.get(it.productId)!.price) * it.quantity,
    0,
  );
  const orderNo = generateOrderNo();

  const orderId = await getDb().transaction(async (tx) => {
    const [r] = await tx
      .insert(schema.orders)
      .values({
        orderNo,
        userId,
        totalAmount: total.toFixed(2),
        status: "pending_pay",
        receiver,
        phone,
        address,
      })
      .$returningId();
    await tx.insert(schema.orderItems).values(
      items.map((it) => ({
        orderId: r.id,
        productId: it.productId,
        productName: pmap.get(it.productId)!.name,
        unitPrice: pmap.get(it.productId)!.price,
        quantity: it.quantity,
      })),
    );
    return r.id;
  });

  // 从购物车结算的条目在下单成功后移除（静默处理）
  return { orderId, orderNo, totalAmount: total };
}

/** 模拟支付成功：事务内扣库存（条件更新防超卖）+ 状态流转 */
export async function payOrder(userId: number, orderNo: string) {
  return getDb().transaction(async (tx) => {
    const order = await tx
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.orderNo, orderNo), eq(schema.orders.userId, userId)))
      .limit(1)
      .then((r) => r.at(0));
    if (!order) throw new Error("订单不存在");
    if (order.status === "paid" || order.status === "shipped" || order.status === "done")
      return { alreadyPaid: true };
    if (order.status !== "pending_pay") throw new Error("订单状态不可支付");

    const items = await tx
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    // 条件扣减：库存不足则报错回滚，并发下不超卖
    for (const it of items) {
      const res = await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} - ${it.quantity}` })
        .where(
          and(
            eq(schema.products.id, it.productId),
            sql`${schema.products.stock} >= ${it.quantity}`,
          ),
        );
      if ((res[0] as { affectedRows?: number }).affectedRows === 0) {
        throw new Error(`「${it.productName}」库存不足，支付失败`);
      }
    }

    await tx
      .update(schema.orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(schema.orders.id, order.id));
    return { alreadyPaid: false };
  });
}

export async function cancelOrder(userId: number, orderNo: string) {
  const res = await getDb()
    .update(schema.orders)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.orders.orderNo, orderNo),
        eq(schema.orders.userId, userId),
        eq(schema.orders.status, "pending_pay"),
      ),
    );
  return ((res[0] as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function listMyOrders(userId: number, status?: string) {
  const conds = [eq(schema.orders.userId, userId)];
  if (status) {
    conds.push(
      eq(
        schema.orders.status,
        status as "pending_pay" | "paid" | "shipped" | "done" | "cancelled",
      ),
    );
  }
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(and(...conds))
    .orderBy(desc(schema.orders.createdAt));
  return rows.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) }));
}

export async function findOrderDetail(userId: number, orderNo: string, isAdmin = false) {
  const conds = [eq(schema.orders.orderNo, orderNo)];
  if (!isAdmin) conds.push(eq(schema.orders.userId, userId));
  const order = await getDb()
    .select()
    .from(schema.orders)
    .where(and(...conds))
    .limit(1)
    .then((r) => r.at(0));
  if (!order) return undefined;
  const items = await getDb()
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
  };
}

// ---------- admin 订单 ----------
export async function adminListOrders(status?: string) {
  const conds = status
    ? [
        eq(
          schema.orders.status,
          status as "pending_pay" | "paid" | "shipped" | "done" | "cancelled",
        ),
      ]
    : [];
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);
  return rows.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) }));
}

export async function shipOrder(orderNo: string) {
  const res = await getDb()
    .update(schema.orders)
    .set({ status: "done", shippedAt: new Date() })
    .where(and(eq(schema.orders.orderNo, orderNo), eq(schema.orders.status, "paid")));
  return ((res[0] as { affectedRows?: number }).affectedRows ?? 0) > 0;
}
