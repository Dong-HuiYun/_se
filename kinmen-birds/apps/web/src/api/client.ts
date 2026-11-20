import type { BirdDto, SightingDto } from "@kinmen/shared";

const BASE = import.meta.env.VITE_API_BASE ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const fetchBirds = () => get<BirdDto[]>("/api/birds");
export const fetchSightings = () => get<SightingDto[]>("/api/sightings");