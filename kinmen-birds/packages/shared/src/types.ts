export type Residency = "resident" | "summer" | "winter" | "passage";
export type Abundance = "rare" | "uncommon" | "common" | "abundant";

export interface BirdDto {
  id: number;
  slug: string;
  nameZh: string;
  nameEn: string;
  scientificName: string;
  familyZh: string | null;
  description: string;
  habits: string | null;
  residency: Residency;
  presentMonths: number[];
  iucnStatus: string | null;
  twProtectionLevel: string | null;
  imageKey: string | null;
  audioKey: string | null;
  modelKey: string | null;
  modelScale: number;
}

export interface SightingDto {
  id: number;
  birdSlug: string;
  nameZh: string;
  nameEn: string;
  residency: Residency;
  locationName: string;
  lat: number;
  lng: number;
  habitatType: string | null;
  bestSeason: string | null;
  abundance: Abundance | null;
  notes: string | null;
}

export const RESIDENCY_LABEL: Record<Residency, string> = {
  resident: "留鳥",
  summer: "夏候鳥",
  winter: "冬候鳥",
  passage: "過境鳥",
};

export const ABUNDANCE_LABEL: Record<Abundance, string> = {
  rare: "稀少",
  uncommon: "不常見",
  common: "常見",
  abundant: "大量",
};