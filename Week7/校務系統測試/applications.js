/* ------------------------------------------------------------------ */
/*  學籍與課程異動申請元件（休學／復學／停修）                        */
/* ------------------------------------------------------------------ */

function studentStatusLabel(student) {
  return student && student.status === "leave" ? "休學中" : "在學";
}

function StudentApplicationsPage({ data, persist, showToast, student }) {
  const [type, setType] = React.useState("leave");
  const [courseId, setCourseId] = React.useState("");
  const [reason, setReason] = React.useState("");

  const isOnLeave = student.status === "leave";

  const myEnrollments = data.enrollments.filter((e) => e.studentId === student.id && e.semester === CURRENT_SEMESTER);
  const myCourses = myEnrollments
    .map((e) => ({ enrollment: e, course: data.courses.find((c) => c.id === e.courseId) }))
    .filter((x) => x.course);

  const myApplications = [...data.applications]
    .filter((a) => a.studentId === student.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  function courseName(id) {
    return data.courses.find((c) => c.id === id)?.name || "－";
  }

  function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("請填寫申請原因", "error");
      return;
    }
    if (type === "leave" && isOnLeave) {
      showToast("您目前已為休學狀態，無法再次申請休學", "error");
      return;
    }
    if (type === "resume" && !isOnLeave) {
      showToast("您目前為在學狀態，無需申請復學", "error");
      return;
    }
    if (type === "courseDrop" && !courseId) {
      showToast("請選擇欲停修的課程", "error");
      return;
    }
    const duplicate = myApplications.some(
      (a) => a.status === "pending" && a.type === type && (type !== "courseDrop" || a.courseId === courseId)
    );
    if (duplicate) {
      showToast("已有相同申請案件待審核中，請勿重複送出", "error");
      return;
    }

    const rec = {
      id: newId("APP"),
      studentId: student.id,
      type,
      courseId: type === "courseDrop" ? courseId : null,
      semester: CURRENT_SEMESTER,
      reason: reason.trim(),
      status: "pending",
      createdAt: new Date().toISOString().slice(0, 10),
      reviewedAt: null,
      reviewNote: "",
    };
    persist({ ...data, applications: [rec, ...data.applications] });
    showToast("申請已送出，請等候承辦人員審核", "success");
    setReason("");
    setCourseId("");
  }

  return (
    <div>
      <PageHeader title="學籍與課程異動申請" subtitle={`目前學籍狀態：${studentStatusLabel(student)}`} />

      <div className="bg-white border border-stone-200 rounded-sm p-6 mb-6">
        <p className="text-sm font-medium text-slate-700 mb-4">提出新申請</p>
        <form onSubmit={submit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">申請類別</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setCourseId("");
              }}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            >
              {APPLICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {type === "courseDrop" && (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">選擇課程</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              >
                <option value="">請選擇</option>
                {myCourses.map((x) => (
                  <option key={x.course.id} value={x.course.id}>
                    {x.course.name}
                  </option>
                ))}
              </select>
              {myCourses.length === 0 && <p className="text-xs text-stone-400 mt-1">本學期尚無已選課程可供停修</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">申請原因</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              placeholder="請簡述申請原因"
            />
          </div>

          <button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-sm">
            送出申請
          </button>
        </form>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm">
        <div className="px-5 py-3 border-b border-stone-200">
          <p className="text-sm font-medium text-slate-700">我的申請紀錄</p>
        </div>
        <DataTable
          columns={[
            { key: "type", label: "申請類別", render: (r) => APPLICATION_TYPES.find((t) => t.value === r.type)?.label || r.type },
            { key: "course", label: "相關課程", render: (r) => (r.courseId ? courseName(r.courseId) : "－") },
            { key: "reason", label: "申請原因" },
            { key: "createdAt", label: "申請日期" },
            { key: "status", label: "審核狀態", render: (r) => <StatusBadge status={r.status} /> },
            { key: "reviewNote", label: "審核備註", render: (r) => r.reviewNote || "－" },
          ]}
          rows={myApplications}
        />
      </div>
    </div>
  );
}

function ApplicationReviewPage({ data, persist, showToast, requestConfirm }) {
  const [tab, setTab] = React.useState("pending");
  const [rejectModal, setRejectModal] = React.useState(null);

  const tabs = [
    { key: "pending", label: "待審核" },
    { key: "approved", label: "已核准" },
    { key: "rejected", label: "已駁回" },
    { key: "all", label: "全部" },
  ];

  const filtered = data.applications
    .filter((a) => tab === "all" || a.status === tab)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  function studentName(id) {
    return data.students.find((s) => s.id === id)?.name || "未知學生";
  }
  function courseName(id) {
    return data.courses.find((c) => c.id === id)?.name || "－";
  }

  // 核准後對系統資料產生的實際影響（休學／復學調整學籍狀態，停修移除選課紀錄）
  function applyEffect(app, base) {
    if (app.type === "leave") {
      return { ...base, students: base.students.map((s) => (s.id === app.studentId ? { ...s, status: "leave" } : s)) };
    }
    if (app.type === "resume") {
      return { ...base, students: base.students.map((s) => (s.id === app.studentId ? { ...s, status: "active" } : s)) };
    }
    if (app.type === "courseDrop") {
      return {
        ...base,
        enrollments: base.enrollments.filter(
          (e) => !(e.studentId === app.studentId && e.courseId === app.courseId && e.semester === app.semester)
        ),
      };
    }
    return base;
  }

  function approve(app) {
    const typeLabel = APPLICATION_TYPES.find((t) => t.value === app.type)?.label || app.type;
    requestConfirm(`確定要核准「${studentName(app.studentId)}」的${typeLabel}嗎？`, () => {
      let next = {
        ...data,
        applications: data.applications.map((a) =>
          a.id === app.id ? { ...a, status: "approved", reviewedAt: new Date().toISOString().slice(0, 10), reviewNote: "" } : a
        ),
      };
      next = applyEffect(app, next);
      persist(next);
      showToast("已核准申請案件", "success");
    });
  }

  function confirmReject(form) {
    persist({
      ...data,
      applications: data.applications.map((a) =>
        a.id === rejectModal.app.id
          ? { ...a, status: "rejected", reviewedAt: new Date().toISOString().slice(0, 10), reviewNote: form.reviewNote || "" }
          : a
      ),
    });
    showToast("已駁回申請案件", "success");
    setRejectModal(null);
  }

  return (
    <div>
      <PageHeader title="申請案件審核" subtitle="休學／復學／停修申請審核作業" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-3.5 py-1.5 rounded-sm border ${
              tab === t.key ? "bg-amber-700 text-white border-amber-700" : "border-stone-300 text-stone-600 hover:border-amber-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: "student", label: "學生", render: (r) => studentName(r.studentId) },
          { key: "type", label: "申請類別", render: (r) => APPLICATION_TYPES.find((t) => t.value === r.type)?.label || r.type },
          { key: "course", label: "相關課程", render: (r) => (r.courseId ? courseName(r.courseId) : "－") },
          { key: "reason", label: "申請原因" },
          { key: "createdAt", label: "申請日期" },
          { key: "status", label: "狀態", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "action",
            label: "",
            render: (r) =>
              r.status === "pending" ? (
                <div className="flex gap-2">
                  <button onClick={() => approve(r)} className="text-xs px-2.5 py-1 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white">
                    核准
                  </button>
                  <button
                    onClick={() => setRejectModal({ app: r })}
                    className="text-xs px-2.5 py-1 rounded-sm bg-red-700 hover:bg-red-800 text-white"
                  >
                    駁回
                  </button>
                </div>
              ) : (
                <span className="text-xs text-stone-400">{r.reviewedAt}</span>
              ),
          },
        ]}
        rows={filtered}
      />

      {rejectModal && (
        <FormModal
          title={`駁回申請－${studentName(rejectModal.app.studentId)}`}
          fields={[{ key: "reviewNote", label: "駁回原因", type: "textarea" }]}
          initial={{ reviewNote: "" }}
          onCancel={() => setRejectModal(null)}
          onSave={confirmReject}
        />
      )}
    </div>
  );
}
