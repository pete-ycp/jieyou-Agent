import { and, asc, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function listContents(type: "quote" | "story" | "about") {
  return getDb()
    .select()
    .from(schema.contents)
    .where(and(eq(schema.contents.type, type), eq(schema.contents.status, "online")))
    .orderBy(asc(schema.contents.sort), asc(schema.contents.id));
}

export async function adminListContents(type?: "quote" | "story" | "about") {
  return getDb()
    .select()
    .from(schema.contents)
    .where(type ? eq(schema.contents.type, type) : undefined)
    .orderBy(asc(schema.contents.type), asc(schema.contents.sort), asc(schema.contents.id));
}

export async function createContent(data: {
  type: "quote" | "story" | "about";
  title: string;
  body: string;
  sourceNote?: string;
  sort?: number;
  status?: "online" | "offline";
}) {
  const [r] = await getDb().insert(schema.contents).values(data).$returningId();
  return r.id;
}

export async function updateContent(
  id: number,
  data: Partial<{
    title: string;
    body: string;
    sourceNote: string;
    sort: number;
    status: "online" | "offline";
  }>,
) {
  await getDb().update(schema.contents).set(data).where(eq(schema.contents.id, id));
}

export async function deleteContent(id: number) {
  await getDb().delete(schema.contents).where(eq(schema.contents.id, id));
}
