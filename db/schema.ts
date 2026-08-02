
import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  boolean,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }), // 本地账号密码哈希（OAuth 用户为 null）
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ 解忧杂货店业务表 ============

/** 商品（杂货店货架） */
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["stationery", "kitchen", "healing"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  imageUrl: varchar("imageUrl", { length: 512 }),
  description: text("description"),
  keeperNote: text("keeperNote"), // 店主手记
  status: mysqlEnum("status", ["on_sale", "off_shelf"]).notNull().default("on_sale"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/** 购物车（落库持久化） */
export const cartItems = mysqlTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
    quantity: int("quantity").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("cart_user_product").on(t.userId, t.productId)],
);

export type CartItem = typeof cartItems.$inferSelect;

/** 订单 */
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending_pay", "paid", "shipped", "done", "cancelled"])
    .notNull()
    .default("pending_pay"),
  receiver: varchar("receiver", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  address: varchar("address", { length: 512 }).notNull(),
  paidAt: timestamp("paidAt"),
  shippedAt: timestamp("shippedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Order = typeof orders.$inferSelect;

/** 订单明细（下单时快照，不受商品改价影响） */
export const orderItems = mysqlTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;

/** 解忧信件（来信 + 回信 + 感谢信） */
export const letters = mysqlTable("letters", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  penName: varchar("penName", { length: 128 }).notNull(), // 笔名（自填或随机生成）
  category: mysqlEnum("category", ["love", "dream", "family", "career", "life"]).notNull(),
  content: text("content").notNull(), // 来信正文
  status: mysqlEnum("status", ["pending", "replied", "egg"]).notNull().default("pending"),
  replyContent: text("replyContent"),
  repliedAt: timestamp("repliedAt"),
  repliedBy: bigint("repliedBy", { mode: "number", unsigned: true }),
  readAt: timestamp("readAt"), // 用户读取回信的时间（未读=回信已发布但 readAt 为空）
  thanksContent: text("thanksContent"), // 感谢信回访
  thanksAt: timestamp("thanksAt"),
  isFeatured: boolean("isFeatured").notNull().default(false), // 店主精选（脱敏后公开）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Letter = typeof letters.$inferSelect;

/** 运营内容（语录 / 示例信件 / 关于页） */
export const contents = mysqlTable("contents", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["quote", "story", "about"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  sourceNote: varchar("sourceNote", { length: 255 }), // 出处标注
  sort: int("sort").notNull().default(0),
  status: mysqlEnum("status", ["online", "offline"]).notNull().default("online"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Content = typeof contents.$inferSelect;
