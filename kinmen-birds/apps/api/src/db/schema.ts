import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── 鳥類基本資料 ───
export const birds = sqliteTable("birds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),            // 例：black-faced-spoonbill
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  scientificName: text("scientific_name").notNull(),
  familyZh: text("family_zh"),
  description: text("description").notNull(),
  habits: text("habits"),                            // 習性、食性
  residency: text("residency", {
    enum: ["resident", "summer", "winter", "passage"], // 留鳥/夏候鳥/冬候鳥/過境鳥
  }).notNull(),
  presentMonths: text("present_months"),             // JSON 陣列字串，如 "[10,11,12,1,2,3]"
  iucnStatus: text("iucn_status"),                   // LC / NT / VU / EN / CR
  twProtectionLevel: text("tw_protection_level"),    // 台灣保育等級（I/II/III 或 null）
  // R2 物件鍵（存 key，不存完整 URL）
  imageKey: text("image_key"),                       // images/xxx.jpg
  audioKey: text("audio_key"),                       // audio/xxx.mp3
  modelKey: text("model_key"),                       // models/xxx.glb
  modelScale: real("model_scale").default(1),        // Three.js 縮放係數
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull().default(sql`(unixepoch())`),
});

// ─── 棲地座標分佈（官方/研究資料，管理員維護） ───
export const sightings = sqliteTable(
  "sightings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    birdId: integer("bird_id").notNull().references(() => birds.id, { onDelete: "cascade" }),
    locationName: text("location_name").notNull(),   // 慈湖、陵水湖...
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    habitatType: text("habitat_type"),               // 濕地/水庫/海岸/農田...
    bestSeason: text("best_season"),                 // 建議觀察季節
    abundance: text("abundance", {
      enum: ["rare", "uncommon", "common", "abundant"],
    }).default("common"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    birdIdx: index("idx_sightings_bird").on(t.birdId),
    geoIdx: index("idx_sightings_geo").on(t.lat, t.lng),
  })
);

// ─── 使用者打卡回報（需通過 Turnstile） ───
export const userReports = sqliteTable(
  "user_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    birdId: integer("bird_id").notNull().references(() => birds.id),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    observedAt: integer("observed_at", { mode: "timestamp" }).notNull(),
    count: integer("count").notNull().default(1),
    observerName: text("observer_name"),             // 暱稱，可匿名
    notes: text("notes"),
    photoKey: text("photo_key"),                     // 使用者上傳至 R2（階段三）
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull().default("pending"),                 // 審核機制，避免垃圾資料直接上圖
    ipHash: text("ip_hash"),                         // SHA-256(IP + salt)，用於 rate limit，不存明碼
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    birdIdx: index("idx_reports_bird").on(t.birdId),
    statusIdx: index("idx_reports_status").on(t.status),
  })
);