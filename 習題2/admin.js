/* ------------------------------------------------------------------ */
/*  管理者端元件：系統總覽、學生管理、教師管理、課程管理               */
/* ------------------------------------------------------------------ */

function AdminDashboard({ data, resetData }) {
  const courseCount = data.courses.filter((c) => c.semester === CURRENT_SEMESTER).length;
  const enrollmentCount = data.enrollments.filter((e) => e.semester === CURRENT_SEMESTER).length;
  const deptGroups = {};
  data.courses
    .filter((c) => c.semester === CURRENT_SEMESTER)
    .forEach((c) => {
      deptGroups[c.dept] = (deptGroups[c.dept] || 0) + 1;
    });
  const maxDept = Math.max(1, ...Object.values(deptGroups));

  return (
    <div>
      <PageHeader
        title="系統管理總覽"
        subtitle={`${CURRENT_SEMESTER} 學期`}
        action={
          <button onClick={resetData} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-700 border border-stone-300 hover:border-red-300 rounded-sm px-3 py-2">
            <RotateCcw size={14} /> 重設示範資料
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="學生人數" value={data.students.length} />
        <StatCard label="教師人數" value={data.teachers.length} />
        <StatCard label="本學期開課數" value={courseCount} />
        <StatCard label="本學期選課人次" value={enrollmentCount} />
      </div>
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <p className="text-sm font-medium text-slate-700 mb-4">各系所開課數量分布</p>
        <div className="space-y-3">
          {Object.entries(deptGroups).map(([dept, count]) => (
            <div key={dept}>
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{dept}</span>
                <span>{count} 門</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-700 rounded-full" style={{ width: (count / maxDept) * 100 + "%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentManagementPage({ data, persist, showToast, requestConfirm }) {
  const [modal, setModal] = React.useState(null);
  const [query, setQuery] = React.useState("");

  const fields = [
    { key: "account", label: "學號 / 帳號" },
    { key: "password", label: "密碼" },
    { key: "name", label: "姓名" },
    { key: "dept", label: "系所" },
    { key: "year", label: "年級", type: "number", numeric: true },
    { key: "className", label: "班級" },
  ];

  const filtered = data.students.filter((s) => s.name.includes(query) || s.account.includes(query) || s.dept.includes(query));

  function handleSave(form) {
    if (!form.account || !form.name || !form.password) {
      showToast("請完整填寫學號、姓名與密碼", "error");
      return;
    }
    if (modal.mode === "add") {
      if (data.students.some((s) => s.account === form.account)) {
        showToast("此學號已存在", "error");
        return;
      }
      const rec = { id: form.account, ...form };
      persist({ ...data, students: [...data.students, rec] });
      showToast("已新增學生資料", "success");
    } else {
      persist({ ...data, students: data.students.map((s) => (s.id === modal.initial.id ? { ...s, ...form } : s)) });
      showToast("已更新學生資料", "success");
    }
    setModal(null);
  }

  function handleDelete(row) {
    requestConfirm(`確定要刪除學生「${row.name}」的所有資料（含選課與成績紀錄）嗎？`, () => {
      persist({
        ...data,
        students: data.students.filter((s) => s.id !== row.id),
        enrollments: data.enrollments.filter((e) => e.studentId !== row.id),
        grades: data.grades.filter((g) => g.studentId !== row.id),
      });
      showToast("已刪除學生資料", "success");
    });
  }

  return (
    <div>
      <PageHeader
        title="學生管理"
        subtitle={`共 ${data.students.length} 位學生`}
        action={
          <button onClick={() => setModal({ mode: "add", initial: { year: 1 } })} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded-sm">
            <Plus size={16} /> 新增學生
          </button>
        }
      />
      <div className="mb-4 relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋姓名、學號或系所"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
        />
      </div>
      <DataTable
        columns={[
          { key: "account", label: "學號" },
          { key: "name", label: "姓名" },
          { key: "dept", label: "系所" },
          { key: "year", label: "年級", render: (r) => `${r.year} 年級` },
          { key: "className", label: "班級" },
        ]}
        rows={filtered}
        onEdit={(r) => setModal({ mode: "edit", initial: r })}
        onDelete={handleDelete}
      />
      {modal && <FormModal title={modal.mode === "add" ? "新增學生" : "編輯學生資料"} fields={fields} initial={modal.initial} onCancel={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function TeacherManagementPage({ data, persist, showToast, requestConfirm }) {
  const [modal, setModal] = React.useState(null);
  const [query, setQuery] = React.useState("");

  const fields = [
    { key: "account", label: "教師編號 / 帳號" },
    { key: "password", label: "密碼" },
    { key: "name", label: "姓名" },
    { key: "dept", label: "系所" },
    { key: "title", label: "職稱" },
  ];

  const filtered = data.teachers.filter((t) => t.name.includes(query) || t.account.includes(query) || t.dept.includes(query));

  function handleSave(form) {
    if (!form.account || !form.name || !form.password) {
      showToast("請完整填寫教師編號、姓名與密碼", "error");
      return;
    }
    if (modal.mode === "add") {
      if (data.teachers.some((t) => t.account === form.account)) {
        showToast("此教師編號已存在", "error");
        return;
      }
      const rec = { id: form.account, ...form };
      persist({ ...data, teachers: [...data.teachers, rec] });
      showToast("已新增教師資料", "success");
    } else {
      persist({ ...data, teachers: data.teachers.map((t) => (t.id === modal.initial.id ? { ...t, ...form } : t)) });
      showToast("已更新教師資料", "success");
    }
    setModal(null);
  }

  function handleDelete(row) {
    if (data.courses.some((c) => c.teacherId === row.id)) {
      showToast("此教師仍有開課紀錄，請先調整或刪除相關課程", "error");
      return;
    }
    requestConfirm(`確定要刪除教師「${row.name}」的資料嗎？`, () => {
      persist({ ...data, teachers: data.teachers.filter((t) => t.id !== row.id) });
      showToast("已刪除教師資料", "success");
    });
  }

  return (
    <div>
      <PageHeader
        title="教師管理"
        subtitle={`共 ${data.teachers.length} 位教師`}
        action={
          <button onClick={() => setModal({ mode: "add", initial: {} })} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded-sm">
            <Plus size={16} /> 新增教師
          </button>
        }
      />
      <div className="mb-4 relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋姓名、編號或系所"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
        />
      </div>
      <DataTable
        columns={[
          { key: "account", label: "教師編號" },
          { key: "name", label: "姓名" },
          { key: "dept", label: "系所" },
          { key: "title", label: "職稱" },
        ]}
        rows={filtered}
        onEdit={(r) => setModal({ mode: "edit", initial: r })}
        onDelete={handleDelete}
      />
      {modal && <FormModal title={modal.mode === "add" ? "新增教師" : "編輯教師資料"} fields={fields} initial={modal.initial} onCancel={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function CourseManagementPage({ data, persist, showToast, requestConfirm }) {
  const [modal, setModal] = React.useState(null);
  const [query, setQuery] = React.useState("");

  const fields = [
    { key: "name", label: "課程名稱" },
    { key: "teacherId", label: "授課教師", type: "select", options: data.teachers.map((t) => ({ value: t.id, label: `${t.name}（${t.dept}）` })) },
    { key: "dept", label: "開課系所" },
    { key: "credit", label: "學分數", type: "number", numeric: true },
    { key: "capacity", label: "選課人數上限", type: "number", numeric: true },
    { key: "day", label: "上課星期", type: "select", options: DAYS.map((d) => ({ value: d, label: "星期" + d })) },
    { key: "periods", label: "上課節次", type: "periods" },
    { key: "classroom", label: "教室" },
    { key: "targetYear", label: "建議修習年級", type: "select", numeric: true, options: YEAR_OPTIONS },
  ];

  const filtered = data.courses.filter((c) => c.semester === CURRENT_SEMESTER && (c.name.includes(query) || c.dept.includes(query)));

  function handleSave(form) {
    if (!form.name || !form.teacherId || !form.credit || !form.day || !(form.periods && form.periods.length)) {
      showToast("請完整填寫課程名稱、教師、學分、星期與節次", "error");
      return;
    }
    if (modal.mode === "add") {
      const rec = { id: newId("C"), semester: CURRENT_SEMESTER, capacity: form.capacity || 50, targetYear: form.targetYear || 0, ...form };
      persist({ ...data, courses: [...data.courses, rec] });
      showToast("已新增課程", "success");
    } else {
      persist({ ...data, courses: data.courses.map((c) => (c.id === modal.initial.id ? { ...c, ...form } : c)) });
      showToast("已更新課程資料", "success");
    }
    setModal(null);
  }

  function handleDelete(row) {
    requestConfirm(`確定要刪除課程「${row.name}」嗎？相關選課與成績紀錄亦將一併移除。`, () => {
      persist({
        ...data,
        courses: data.courses.filter((c) => c.id !== row.id),
        enrollments: data.enrollments.filter((e) => e.courseId !== row.id),
      });
      showToast("已刪除課程", "success");
    });
  }

  function teacherName(id) {
    return data.teachers.find((t) => t.id === id)?.name || "－";
  }

  return (
    <div>
      <PageHeader
        title="課程管理"
        subtitle={`${CURRENT_SEMESTER} 學期．共 ${data.courses.filter((c) => c.semester === CURRENT_SEMESTER).length} 門課程`}
        action={
          <button
            onClick={() => setModal({ mode: "add", initial: { periods: [], targetYear: 0, capacity: 50 } })}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded-sm"
          >
            <Plus size={16} /> 新增課程
          </button>
        }
      />
      <div className="mb-4 relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋課程名稱或系所"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
        />
      </div>
      <DataTable
        columns={[
          { key: "name", label: "課程名稱" },
          { key: "teacherId", label: "授課教師", render: (r) => teacherName(r.teacherId) },
          { key: "dept", label: "開課系所" },
          { key: "credit", label: "學分" },
          { key: "time", label: "上課時間", render: (r) => `星期${r.day} 第${periodsLabel(r.periods)}節` },
          { key: "classroom", label: "教室" },
          {
            key: "count",
            label: "選課狀況",
            render: (r) => {
              const count = data.enrollments.filter((e) => e.courseId === r.id && e.semester === CURRENT_SEMESTER).length;
              return `${count} / ${r.capacity}`;
            },
          },
        ]}
        rows={filtered}
        onEdit={(r) => setModal({ mode: "edit", initial: r })}
        onDelete={handleDelete}
      />
      {modal && <FormModal title={modal.mode === "add" ? "新增課程" : "編輯課程資料"} fields={fields} initial={modal.initial} onCancel={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}