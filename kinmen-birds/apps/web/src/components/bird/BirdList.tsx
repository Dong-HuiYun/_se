import { RESIDENCY_LABEL, type BirdDto } from "@kinmen/shared";

interface Props {
  birds: BirdDto[];
  filterSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export default function BirdList({ birds, filterSlug, onSelect }: Props) {
  const month = new Date().getMonth() + 1;

  return (
    <ul className="space-y-2 p-3">
      <li>
        <button
          onClick={() => onSelect(null)}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            filterSlug === null ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
        >
          顯示全部鳥類
        </button>
      </li>
      {birds.map((b) => {
        const active = filterSlug === b.slug;
        const seenNow = b.presentMonths.includes(month);
        return (
          <li key={b.slug}>
            <button
              onClick={() => onSelect(active ? null : b.slug)}
              className={`w-full rounded-lg px-3 py-2 text-left transition ${
                active ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.nameZh}</span>
                <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs">{RESIDENCY_LABEL[b.residency]}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs opacity-75">
                <span>{b.nameEn}</span>
                <span>{seenNow ? "● 本月可見" : "○ 本月較難見"}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}