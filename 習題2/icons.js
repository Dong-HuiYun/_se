/* ------------------------------------------------------------------ */
/*  Lucide Icons 相容元件封裝                                         */
/* ------------------------------------------------------------------ */

function makeIcon(name) {
  return function IconComponent({ size = 18, className = "" }) {
    const spanRef = React.useRef(null);
    React.useEffect(() => {
      if (spanRef.current && window.lucide) {
        spanRef.current.innerHTML = `<i data-lucide="${name}"></i>`;
        window.lucide.createIcons({
          root: spanRef.current,
          attrs: { width: size, height: size, class: className }
        });
      }
    }, [size, className]);
    return <span ref={spanRef} className="inline-flex items-center justify-center align-middle" />;
  };
}

const GraduationCap = makeIcon("graduation-cap");
const LogOut = makeIcon("log-out");
const User = makeIcon("user");
const CalendarDays = makeIcon("calendar-days");
const BookOpen = makeIcon("book-open");
const ClipboardList = makeIcon("clipboard-list");
const Megaphone = makeIcon("megaphone");
const Users = makeIcon("users");
const LayoutDashboard = makeIcon("layout-dashboard");
const Plus = makeIcon("plus");
const Pencil = makeIcon("pencil");
const Trash2 = makeIcon("trash-2");
const X = makeIcon("x");
const KeyRound = makeIcon("key-round");
const Building2 = makeIcon("building-2");
const Search = makeIcon("search");
const AlertCircle = makeIcon("alert-circle");
const CheckCircle2 = makeIcon("check-circle-2");
const ChevronRight = makeIcon("chevron-right");
const RotateCcw = makeIcon("rotate-ccw");
const FileText = makeIcon("file-text");
const XCircle = makeIcon("x-circle");
const History = makeIcon("history");

/* ------------------------------------------------------------------ */
/*  共用 UI 元件                                                       */
/* ------------------------------------------------------------------ */

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 font-brand">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white border border-stone-200 border-l-4 border-l-amber-700 rounded-sm px-5 py-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1 font-brand">{value}</p>
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

function DataTable({ columns, rows, onEdit, onDelete, keyField = "id" }) {
  return (
    <div className="overflow-x-auto border border-stone-200 rounded-sm bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-4 py-3 font-medium text-stone-500 whitespace-nowrap">
                {c.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-3 w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[keyField]} className="border-b border-stone-100 hover:bg-stone-50/70 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-stone-700 whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="text-stone-400 hover:text-amber-700 mr-3" title="編輯">
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} className="text-stone-400 hover:text-red-600" title="刪除">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-stone-400">
                尚無資料
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FormModal({ title, fields, initial, onCancel, onSave }) {
  const [form, setForm] = React.useState(initial || {});
  React.useEffect(() => setForm(initial || {}), [initial]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-t-4 border-amber-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800 font-brand">{title}</h3>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-stone-600 mb-1">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => update(f.key, f.numeric ? Number(e.target.value) : e.target.value)}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                >
                  <option value="">請選擇</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "periods" ? (
                <div className="flex flex-wrap gap-2">
                  {PERIODS.map((p) => {
                    const active = (form[f.key] || []).includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          const cur = form[f.key] || [];
                          update(f.key, active ? cur.filter((x) => x !== p) : [...cur, p].sort((a, b) => a - b));
                        }}
                        className={`w-9 h-9 rounded-sm text-sm border transition-colors ${
                          active ? "bg-amber-700 text-white border-amber-700" : "border-stone-300 text-stone-600 hover:border-amber-700"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              ) : f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => update(f.key, e.target.value)}
                  rows={4}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              ) : (
                <input
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => update(f.key, f.numeric ? Number(e.target.value) : e.target.value)}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-sm border border-stone-300 text-stone-600 hover:bg-stone-50">
              取消
            </button>
            <button type="submit" className="px-4 py-2 text-sm rounded-sm bg-amber-700 text-white hover:bg-amber-800">
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ confirmState, onCancel, onConfirm }) {
  if (!confirmState) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-sm border-t-4 border-red-700">
        <div className="p-6">
          <p className="text-stone-700 text-sm leading-relaxed">{confirmState.message}</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onCancel} className="px-4 py-2 text-sm rounded-sm border border-stone-300 text-stone-600 hover:bg-stone-50">
              取消
            </button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-sm bg-red-700 text-white hover:bg-red-800">
              確定刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg text-sm text-white ${
        isError ? "bg-red-700" : "bg-emerald-700"
      }`}
    >
      {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.message}
    </div>
  );
}

function CategoryBadge({ category }) {
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
      {category}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-sm border ${map[status] || map.pending}`}>
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

function PasswordChangePromptModal({ userName, onSkip, onSubmit }) {
  const [stage, setStage] = React.useState("ask"); // "ask" | "form"
  const [oldPw, setOldPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const ok = onSubmit(oldPw, newPw, confirmPw);
    if (ok) {
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-sm border-t-4 border-amber-700">
        <div className="p-6">
          {stage === "ask" ? (
            <>
              <p className="text-sm font-medium text-slate-800 mb-1 flex items-center gap-2">
                <KeyRound size={16} className="text-amber-700" /> 您好，{userName}
              </p>
              <p className="text-sm text-stone-600 leading-relaxed mb-6 mt-2">
                為了帳號安全，建議您定期修改密碼（管理者無法得知您變更後的密碼）。是否要現在修改？
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={onSkip} className="px-4 py-2 text-sm rounded-sm border border-stone-300 text-stone-600 hover:bg-stone-50">
                  稍後再說
                </button>
                <button onClick={() => setStage("form")} className="px-4 py-2 text-sm rounded-sm bg-amber-700 text-white hover:bg-amber-800">
                  修改密碼
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2">
                <KeyRound size={16} className="text-amber-700" /> 修改密碼
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="password"
                  placeholder="目前密碼"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
                <input
                  type="password"
                  placeholder="新密碼（至少4碼）"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
                <input
                  type="password"
                  placeholder="確認新密碼"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onSkip} className="px-4 py-2 text-sm rounded-sm border border-stone-300 text-stone-600 hover:bg-stone-50">
                    取消
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-sm bg-amber-700 text-white hover:bg-amber-800">
                    更新密碼
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ roleLabel, extraFields, onChangePassword }) {
  const [oldPw, setOldPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");

  function submit(e) {
    e.preventDefault();
    const ok = onChangePassword(oldPw, newPw, confirmPw);
    if (ok) {
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }

  return (
    <div>
      <PageHeader title="個人資料" subtitle={roleLabel} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-sm p-6">
          <p className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
            <User size={16} className="text-amber-700" /> 基本資料
          </p>
          <dl className="space-y-3 text-sm">
            {extraFields.map((f) => (
              <div key={f.label} className="flex justify-between border-b border-stone-100 pb-2">
                <dt className="text-stone-500">{f.label}</dt>
                <dd className="text-stone-800 font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-6">
          <p className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-amber-700" /> 修改密碼
          </p>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              placeholder="目前密碼"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
            <input
              type="password"
              placeholder="新密碼（至少4碼）"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
            <input
              type="password"
              placeholder="確認新密碼"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
            <button type="submit" className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-sm py-2 text-sm font-medium">
              更新密碼
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
