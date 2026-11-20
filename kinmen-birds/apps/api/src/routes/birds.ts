import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { BirdDto } from "@kinmen/shared";
import { getDb } from "../db/client";
import { birds } from "../db/schema";
import type { AppEnv } from "../env";

const parseMonths = (raw: string | null): number[] => {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
};

export const toBirdDto = (row: typeof birds.$inferSelect): BirdDto => {
  const { createdAt: _c, presentMonths, modelScale, ...rest } = row;
  return { ...rest, presentMonths: parseMonths(presentMonths), modelScale: modelScale ?? 1 };
};

export const birdsRoute = new Hono<AppEnv>();

birdsRoute.get("/", async (c) => {
  const rows = await getDb(c.env.DB).select().from(birds).orderBy(birds.id);
  c.header("Cache-Control", "public, max-age=300");
  return c.json(rows.map(toBirdDto));
});

birdsRoute.get("/:slug", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(birds)
    .where(eq(birds.slug, c.req.param("slug")))
    .limit(1);
  if (rows.length === 0) return c.json({ error: "Bird not found" }, 404);
  c.header("Cache-Control", "public, max-age=300");
  return c.json(toBirdDto(rows[0]));
});