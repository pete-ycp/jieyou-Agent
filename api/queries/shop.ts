import { and, desc, asc, eq, like, or, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

/** decimal 字段 Drizzle 返回 string，统一转 number 供前端直接使用 */
function normalizeProduct<T extends { price: unknown }>(p: T) {
  return { ...p, price: Number(p.price) };
}

export async function listProducts(opts: {
  category?: "stationery" | "kitchen" | "healing";
  keyword?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page: number;
  pageSize: number;
}) {
  const { category, keyword, sort = "newest", page, pageSize } = opts;
  const conds = [eq(schema.products.status, "on_sale")];
  if (category) conds.push(eq(schema.products.category, category));
  if (keyword) {
    const kw = `%${keyword}%`;
    conds.push(
      or(like(schema.products.name, kw), like(schema.products.description, kw))!,
    );
  }
  const orderBy =
    sort === "price_asc"
      ? asc(schema.products.price)
      : sort === "price_desc"
        ? desc(schema.products.price)
        : desc(schema.products.createdAt);

  const where = and(...conds);
  const [rows, countRows] = await Promise.all([
    getDb()
      .select()
      .from(schema.products)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    getDb()
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(where),
  ]);
  return {
    items: rows.map(normalizeProduct),
    total: Number(countRows.at(0)?.count ?? 0),
    page,
    pageSize,
  };
}

export async function listFeaturedProducts(limit = 8) {
  const rows = await getDb()
    .select()
    .from(schema.products)
    .where(eq(schema.products.status, "on_sale"))
    .orderBy(desc(schema.products.createdAt))
    .limit(limit);
  return rows.map(normalizeProduct);
}

export async function findProductById(id: number) {
  const row = await getDb()
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1)
    .then((r) => r.at(0));
  return row ? normalizeProduct(row) : undefined;
}

// ---------- admin ----------
export async function adminListProducts() {
  const rows = await getDb()
    .select()
    .from(schema.products)
    .orderBy(desc(schema.products.createdAt));
  return rows.map(normalizeProduct);
}

export async function createProduct(data: schema.InsertProduct) {
  const [r] = await getDb().insert(schema.products).values(data).$returningId();
  return r.id;
}

export async function updateProduct(id: number, data: Partial<schema.InsertProduct>) {
  await getDb().update(schema.products).set(data).where(eq(schema.products.id, id));
}

export async function setProductStatus(id: number, status: "on_sale" | "off_shelf") {
  await getDb().update(schema.products).set({ status }).where(eq(schema.products.id, id));
}
