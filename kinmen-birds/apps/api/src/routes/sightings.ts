import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { SightingDto } from "@kinmen/shared";
import { getDb } from "../db/client";
import { birds, sightings } from "../db/schema";
import type { AppEnv } from "../env";

export const sightingsRoute = new Hono<AppEnv>();

// GET /api/sightings          → 全部棲地
// GET /api/sightings?bird=slug → 單一鳥種
sightingsRoute.get("/", async (c) => {
  const slug = c.req.query("bird");
  const rows = await getDb(c.env.DB)
    .select({
      id: sightings.id,
      birdSlug: birds.slug,
      nameZh: birds.nameZh,
      nameEn: birds.nameEn,
      residency: birds.residency,
      locationName: sightings.locationName,
      lat: sightings.lat,
      lng: sightings.lng,
      habitatType: sightings.habitatType,
      bestSeason: sightings.bestSeason,
      abundance: sightings.abundance,
      notes: sightings.notes,
    })
    .from(sightings)
    .innerJoin(birds, eq(sightings.birdId, birds.id))
    .where(slug ? eq(birds.slug, slug) : undefined)
    .orderBy(sightings.id);

  c.header("Cache-Control", "public, max-age=300");
  return c.json(rows satisfies SightingDto[]);
});