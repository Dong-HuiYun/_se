/* ------------------------------------------------------------------ */
/*  教師端元件：儀表板、任教課程、成績登錄                             */
/* ------------------------------------------------------------------ */

function TeacherDashboard({ data, teacher, setPage }) {
  const myCourses = data.courses.filter((c) => c.teacherId === teacher.id && c.semester === CURRENT_SEMESTER);
  const studentCount = data.enrollments.filter((e) => myCourses.some((c) => c.id === e.courseId) && e.semester === CURRENT_SEMESTER).length;
  const recentAnnouncements = [...data.announcements].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);

  return (
    <div>
      <PageHeader title={`您好，${teacher.name} ${teacher.title}`} subtitle={teacher.dept} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="本學期任教課程" value={myCourses.length} hint={CURRENT_SEMESTER + " 學期"} />
        <StatCard label="授課學生總人次" value={studentCount} />
        <StatCard label="總開課學分數" value={myCourses.reduce((s, c) => s + c.credit, 0)} />
      </div>
      <div className="bg-white border border-stone-200 rounded-sm">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">最新公告</p>
          <button onClick={() => setPage("announcements")} className="text-xs text-amber-700 flex items-center gap-0.5 hover:underline">
            查看全部 <ChevronRight size={12} />
          </button>
        </div>
        {recentAnnouncements.map((a) => (
          <div key={a.id} className="px-5 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
            <CategoryBadge category={a.category} />
            <p className="text-sm text-stone-700 flex-1">{a.title}</p>
            <p className="text-xs text-stone-400">{a.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyCoursesPage({ data, teacherId }) {
  const myCourses = data.courses.filter((c) => c.teacherId === teacherId && c.semester === CURRENT_SEMESTER);
  return (
    <div>
      <PageHeader title="任教課程" subtitle={`${CURRENT_SEMESTER} 學期`} />
      <DataTable
        columns={[
          { key: "name", label: "課程名稱" },
          { key: "dept", label: "開課系所" },
          { key: "credit", label: "學分" },
          { key: "time", label: "上課時間", render: (r) => `星期${r.day} 第${periodsLabel(r.periods)}節` },
          { key: "classroom", label: "教室" },
          {
            key: "count",
            label: "選課人數",
            render: (r) => {
              const count = data.enrollments.filter((e) => e.courseId === r.id && e.semester === CURRENT_SEMESTER).length;
              return `${count} / ${r.capacity}`;
            },
          },
        ]}
        rows={myCourses}
      />
    </div>
  );
}

function GradeEntryPage({ data, persist, showToast, teacherId }) {
  const myCourses = data.courses.filter((c) => c.teacherId === teacherId && c.semester === CURRENT_SEMESTER);
  const [courseId, setCourseId] = React.useState(myCourses[0]?.id || "");
  const [scores, setScores] = React.useState({});

  const course = myCourses.find((c) => c.id === courseId);
  const roster = React.useMemo(() => {
    if (!course) return [];
    return data.enrollments
      .filter((e) => e.courseId === course.id && e.semester === CURRENT_SEMESTER)
      .map((e) => {
        const student = data.students.find((s) => s.id === e.studentId);
        const gradeRecord = data.grades.find((g) => g.studentId === e.studentId && g.courseId === course.id && g.semester === CURRENT_SEMESTER);
        return { student, gradeRecord };
      })
      .filter((r) => r.student);
  }, [data, course]);

  React.useEffect(() => {
    const init = {};
    roster.forEach((r) => {
      init[r.student.id] = r.gradeRecord ? String(r.gradeRecord.score) : "";
    });
    setScores(init);
  }, [courseId, data]);

  function updateScore(studentId, value) {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  }

  function saveAll() {
    if (!course) return;
    const teacher = data.teachers.find((t) => t.id === teacherId);
    let updatedGrades = [...data.grades];
    let hasInvalid = false;
    let changed = 0;

    roster.forEach((r) => {
      const raw = scores[r.student.id];
      if (raw === "" || raw === undefined) return;
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        hasInvalid = true;
        return;
      }
      const existingIdx = updatedGrades.findIndex((g) => g.studentId === r.student.id && g.courseId === course.id && g.semester === CURRENT_SEMESTER);
      if (existingIdx >= 0) {
        if (updatedGrades[existingIdx].score !== num) {
          updatedGrades[existingIdx] = { ...updatedGrades[existingIdx], score: num };
          changed++;
        }
      } else {
        updatedGrades.push({
          id: newId("G"),
          studentId: r.student.id,
          courseId: course.id,
          semester: CURRENT_SEMESTER,
          courseName: course.name,
          credit: course.credit,
          teacherName: teacher ? teacher.name : "",
          score: num,
        });
        changed++;
      }
    });

    if (hasInvalid) {
      showToast("分數需介於 0 至 100 之間，請檢查後再儲存", "error");
      return;
    }
    if (changed === 0) {
      showToast("沒有變更的成績可以儲存", "error");
      return;
    }
    persist({ ...data, grades: updatedGrades });
    showToast(`已儲存 ${changed} 筆成績`, "success");
  }

  return (
    <div>
      <PageHeader
        title="成績登錄"
        subtitle={`${CURRENT_SEMESTER} 學期`}
        action={
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
          >
            {myCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />
      {!course ? (
        <p className="text-sm text-stone-400 text-center py-10">本學期尚無任教課程</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-500">學號</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">姓名</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">系級</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 w-32">分數</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">等第</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.student.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-stone-700">{r.student.account}</td>
                  <td className="px-4 py-3 text-stone-700">{r.student.name}</td>
                  <td className="px-4 py-3 text-stone-700">{r.student.className}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scores[r.student.id] ?? ""}
                      onChange={(e) => updateScore(r.student.id, e.target.value)}
                      className="w-20 border border-stone-300 rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                    />
                  </td>
                  <td className="px-4 py-3 text-stone-500">{scoreToGrade(scores[r.student.id])?.grade ?? "－"}</td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                    本課程尚無選課學生
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {roster.length > 0 && (
            <div className="px-4 py-4 border-t border-stone-200 flex justify-end">
              <button onClick={saveAll} className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-sm">
                儲存全部成績
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}