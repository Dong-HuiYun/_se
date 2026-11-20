import { ABUNDANCE_LABEL, RESIDENCY_LABEL, type BirdDto, type SightingDto } from "@kinmen/shared";

interface Props {
  bird: BirdDto;
  sightings: SightingDto[]; // 該鳥種所有棲地
  selected: SightingDto | null;
  onPickSighting: (s: SightingDto) => void;
  onClose: () => void;
}

export default function DetailPanel({ bird, sightings, selected, onPickSighting, onClose }: Props) {
  return (
    <div className="absolute inset-x-3 bottom-3 max-h-[48%] overflow-y-auto rounded-xl bg-slate-900/90 p-4 text-slate-100 shadow-xl backdrop-blur md:right-auto md:w-96">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{bird.nameZh}</h2>
          <p className="text-xs text-slate-400">
            {bird.nameEn} · <i>{bird.scientificName}</i>
          </p>
        </div>
        <button onClick={onClose} className="rounded px-2 text-slate-400 hover:text-white" aria-label="關閉">
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded bg-emerald-700 px-2 py-0.5">{RESIDENCY_LABEL[bird.residency]}</span>
        {bird.iucnStatus && <span className="rounded bg-slate-700 px-2 py-0.5">IUCN {bird.iucnStatus}</span>}
        {bird.twProtectionLevel && (
          <span className="rounded bg-red-700 px-2 py-0.5">保育類 {bird.twProtectionLevel} 級</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-12 gap-0.5" title="出現月份">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <div
            key={m}
            className={`rounded py-0.5 text-center text-[10px] ${
              bird.presentMonths.includes(m) ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"
            }`}
          >
            {m}
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-200">{bird.description}</p>
      {bird.habits && <p className="mt-2 text-sm text-slate-400">習性：{bird.habits}</p>}

      <h3 className="mt-4 text-sm font-semibold">觀察地點</h3>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {sightings.map((s) => (
          <button
            key={s.id}
            onClick={() => onPickSighting(s)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              selected?.id === s.id ? "bg-amber-500 text-slate-950" : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            {s.locationName}
          </button>
        ))}
      </div>

      {selected && (
        <dl className="mt-3 space-y-1 rounded-lg bg-slate-800/70 p-3 text-xs">
          <div><dt className="inline text-slate-400">地點：</dt><dd className="inline">{selected.locationName}</dd></div>
          {selected.habitatType && <div><dt className="inline text-slate-400">棲地：</dt><dd className="inline">{selected.habitatType}</dd></div>}
          {selected.bestSeason && <div><dt className="inline text-slate-400">最佳季節：</dt><dd className="inline">{selected.bestSeason}</dd></div>}
          {selected.abundance && <div><dt className="inline text-slate-400">數量：</dt><dd className="inline">{ABUNDANCE_LABEL[selected.abundance]}</dd></div>}
          {selected.notes && <div><dt className="inline text-slate-400">備註：</dt><dd className="inline">{selected.notes}</dd></div>}
        </dl>
      )}
    </div>
  );
}