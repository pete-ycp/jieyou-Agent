import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser, User } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

/** 本地注册：新建用户（调用方需先确认用户名未被占用）。 */
export async function createUser(data: InsertUser) {
  await getDb().insert(schema.users).values(data);
}

/** 更新最近登录时间。 */
export async function updateLastSignIn(userId: number) {
  await getDb()
    .update(schema.users)
    .set({ lastSignInAt: new Date() })
    .where(eq(schema.users.id, userId));
}

/** 剔除敏感字段（passwordHash），用于任何返回给前端的位置。 */
export function publicUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}
