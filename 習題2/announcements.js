/* ------------------------------------------------------------------ */
/*  校園公告元件（共用於學生、教師、管理者）                          */
/* ------------------------------------------------------------------ */

function AnnouncementsPage({ data, persist, showToast, canManage, canPost, authorName, requestConfirm }) {
  const [modal, setModal] = React.useState(null);
  const [expanded, setExpanded] = React.useState(null);

  const sorted = [...data.announcements].sort((a, b) => (a.date < b.date ? 1 : -1));

  const fields = [
    { key: "title", label: "標題" },
    { key: "category", label: "類別", type: "select", options: ANNOUNCEMENT_CATEGORIES.map((c) => ({ value: c, label: c })) },
    { key: "date", label: "發布日期", type: "date" },
    { key: "content", label: "內容", type: "textarea" },
  ];

  function handleSave(form) {
    if (!form.title || !form.content || !form.category || !form.date) {
      showToast("請完整填寫公告內容", "error");
      return;
    }
    if (modal.mode === "add") {
      const rec = { id: newId("AN"), author: authorName, ...form };
      persist({ ...data, announcements: [rec, ...data.announcements] });
      showToast("公告已發布", "success");
    } else {
      persist({ ...data, announcements: data.announcements.map((a) => (a.id === modal.initial.id ? { ...a, ...form } : a)) });
      showToast("公告已更新", "success");
    }
    setModal(null);
  }

  function handleDelete(row) {
    requestConfirm(`確定要刪除公告「${row.title}」嗎？`, () => {
      persist({ ...data, announcements: data.announcements.filter((a) => a.id !== row.id) });
      showToast("公告已刪除", "success");
    });
  }

  return (
    <div>
      <PageHeader
        title="校園公告"
        subtitle="教務處、學務處及各單位最新消息"
        action={
          (canManage || canPost) && (
            <button
              onClick={() => setModal({ mode: "add", initial: { category: ANNOUNCEMENT_CATEGORIES[0], date: "2026-09-11" } })}
              className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded-sm"
            >
              <Plus size={16} /> 發布公告
            </button>
          )
        }
      />
      <div className="space-y-3">
        {sorted.map((a) => (
          <div key={a.id} className="bg-white border border-stone-200 rounded-sm px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <button className="text-left flex-1" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <CategoryBadge category={a.category} />
                  <span className="text-xs text-stone-400">{a.date}</span>
                  <span className="text-xs text-stone-400">．{a.author}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                {expanded === a.id && <p className="text-sm text-stone-600 mt-2 leading-relaxed">{a.content}</p>}
              </button>
              {canManage && (
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <button onClick={() => setModal({ mode: "edit", initial: a })} className="text-stone-400 hover:text-amber-700">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(a)} className="text-stone-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-sm text-stone-400 text-center py-10">目前尚無公告</p>}
      </div>
      {modal && <FormModal title={modal.mode === "add" ? "發布公告" : "編輯公告"} fields={fields} initial={modal.initial} onCancel={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
