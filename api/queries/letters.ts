import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function createLetter(data: {
  userId: number;
  penName: string;
  category: "love" | "dream" | "family" | "career" | "life";
  content: string;
  status: "pending" | "egg";
  replyContent?: string;
  repliedAt?: Date;
}) {
  const [r] = await getDb().insert(schema.letters).values(data).$returningId();
  return r.id;
}

/** 近一小时投信数（温和限流用） */
export async function countRecentLetters(userId: number, since: Date) {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.letters)
    .where(and(eq(schema.letters.userId, userId), gte(schema.letters.createdAt, since)));
  return Number(rows.at(0)?.count ?? 0);
}

export async function listMyLetters(userId: number) {
  return getDb()
    .select()
    .from(schema.letters)
    .where(eq(schema.letters.userId, userId))
    .orderBy(desc(schema.letters.createdAt));
}

/** 未读回信数（已回信但未读取） */
export async function countUnreadReplies(userId: number) {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.letters)
    .where(
      and(
        eq(schema.letters.userId, userId),
        eq(schema.letters.status, "replied"),
        sql`${schema.letters.readAt} is null`,
      ),
    );
  return Number(rows.at(0)?.count ?? 0);
}

/** 读取信件（属主校验在后端）；可顺带标记回信已读 */
export async function findMyLetter(userId: number, id: number, markRead: boolean) {
  const letter = await getDb()
    .select()
    .from(schema.letters)
    .where(and(eq(schema.letters.id, id), eq(schema.letters.userId, userId)))
    .limit(1)
    .then((r) => r.at(0));
  if (!letter) return undefined;
  if (markRead && letter.status === "replied" && !letter.readAt) {
    await getDb()
      .update(schema.letters)
      .set({ readAt: new Date() })
      .where(eq(schema.letters.id, id));
    letter.readAt = new Date();
  }
  return letter;
}

export async function addThanks(userId: number, id: number, thanksContent: string) {
  const res = await getDb()
    .update(schema.letters)
    .set({ thanksContent, thanksAt: new Date() })
    .where(
      and(
        eq(schema.letters.id, id),
        eq(schema.letters.userId, userId),
        eq(schema.letters.status, "replied"),
        sql`${schema.letters.thanksContent} is null`,
      ),
    );
  return ((res[0] as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function findLetterForThanks(userId: number, id: number) {
  return getDb()
    .select()
    .from(schema.letters)
    .where(and(eq(schema.letters.id, id), eq(schema.letters.userId, userId)))
    .limit(1)
    .then((r) => r.at(0));
}

// ---------- admin 回信工作台 ----------
export async function adminListLetters(filter?: "pending" | "replied" | "all") {
  const conds =
    filter === "pending"
      ? [eq(schema.letters.status, "pending" as const)]
      : filter === "replied"
        ? [eq(schema.letters.status, "replied" as const)]
        : [];
  return getDb()
    .select()
    .from(schema.letters)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(schema.letters.createdAt))
    .limit(300);
}

export async function adminFindLetter(id: number) {
  return getDb()
    .select()
    .from(schema.letters)
    .where(eq(schema.letters.id, id))
    .limit(1)
    .then((r) => r.at(0));
}

export async function replyLetter(id: number, replyContent: string, repliedBy: number) {
  const res = await getDb()
    .update(schema.letters)
    .set({ replyContent, repliedAt: new Date(), repliedBy, status: "replied" })
    .where(and(eq(schema.letters.id, id), eq(schema.letters.status, "pending")));
  return ((res[0] as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function setLetterFeatured(id: number, isFeatured: boolean) {
  await getDb().update(schema.letters).set({ isFeatured }).where(eq(schema.letters.id, id));
}

/** 公开精选墙（店主脱敏后发布） */
export async function listFeaturedLetters() {
  return getDb()
    .select({
      id: schema.letters.id,
      penName: schema.letters.penName,
      category: schema.letters.category,
      content: schema.letters.content,
      replyContent: schema.letters.replyContent,
      thanksContent: schema.letters.thanksContent,
      createdAt: schema.letters.createdAt,
      repliedAt: schema.letters.repliedAt,
    })
    .from(schema.letters)
    .where(eq(schema.letters.isFeatured, true))
    .orderBy(desc(schema.letters.repliedAt))
    .limit(50);
}
