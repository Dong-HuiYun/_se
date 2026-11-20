import { useEffect, useMemo, useState } from "react";
import type { BirdDto, SightingDto } from "@kinmen/shared";
import { fetchBirds, fetchSightings } from "./api/client";
import KinmenMap from "./components/map/KinmenMap";
import BirdList from "./components/bird/BirdList";
import DetailPanel from "./components/bird/DetailPanel";

export default function App() {
  const [birds, setBirds] = useState<BirdDto[]>([]);
  const [sightings, setSightings] = useState<SightingDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterSlug, setFilterSlug] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchBirds(), fetchSightings()])
      .then(([b, s]) => {
        setBirds(b);
        setSightings(s);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const visible = useMemo(
    () => (filterSlug ? sightings.filter((s) => s.birdSlug === filterSlug) : sightings),
    [sightings, filterSlug]
  );

  const selected = sightings.find((s) => s.id === selectedId) ?? null;
  const panelSlug = selected?.birdSlug ?? filterSlug;
  const panelBird = birds.find((b) => b.slug === panelSlug) ?? null;

  const handleFilter = (slug: string | null) => {
    setFilterSlug(slug);
    setSelectedId(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100 md:flex-row">
      <aside className="max-h-[34dvh] w-full shrink-0 overflow-y-auto border-slate-800 md:max-h-none md:w-80 md:border-r">
        <header className="border-b border-slate-800 p-4">
          <h1 className="text-lg font-bold">🐦 金門鳥類生態互動地圖</h1>
          <p className="mt-1 text-xs text-slate-400">點選鳥種篩選棲地，或直接點擊地圖上的 3D 鳥類</p>
        </header>
        {error ? (
          <p className="p-4 text-sm text-red-400">載入失敗：{error}</p>
        ) : (
          <BirdList birds={birds} filterSlug={filterSlug} onSelect={handleFilter} />
        )}
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1">
        <KinmenMap birds={birds} sightings={visible} selectedSightingId={selectedId} onPick={(s) => setSelectedId(s?.id ?? null)} />
        {panelBird && (
          <DetailPanel
            bird={panelBird}
            sightings={sightings.filter((s) => s.birdSlug === panelBird.slug)}
            selected={selected}
            onPickSighting={(s) => setSelectedId(s.id)}
            onClose={() => {
              setSelectedId(null);
              setFilterSlug(null);
            }}
          />
        )}
      </main>
    </div>
  );
}