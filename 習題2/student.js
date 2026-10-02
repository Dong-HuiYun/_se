/* ------------------------------------------------------------------ */
/*  學生端元件：儀表板、課表、選課、成績                             */
/* ------------------------------------------------------------------ */

function StudentDashboard({ data, student, setPage }) {
  const currentCredits = data.enrollments
    .filter((e) => e.studentId === student.id && e.semester === CURRENT_SEMESTER)
    .reduce((sum, e) => {
      const c = data.courses.find((c) => c.id === e.courseId);
      return sum + (c ? c.credit : 0);
    }, 0);
  const allGraded = data.grades.filter((g) => g.studentId === student.id && g.score !== null && g.score !== undefined);
  const gpa = computeGpa(allGraded) ?? "—";
  const earnedCredits = allGraded.filter((g) => g.score >= 60).reduce((s, g) => s + g.credit, 0);
  const graduationTarget = 128;
  const progress = Math.min(100, Math.round((earnedCredits / graduationTarget) * 100));
  const recentAnnouncements = [...data.announcements].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);

  return (
    <div>
      <PageHeader title={`您好，${student.name} 同學`} subtitle={`${student.dept}．${student.className}`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="本學期修習學分" value={currentCredits} hint={CURRENT_SEMESTER + " 學期"} />
        <StatCard label="累計 GPA" value={gpa} hint="採加權平均計算" />
        <StatCard label="已修得學分" value={earnedCredits} hint={`畢業門檻 ${graduationTarget} 學分`} />
      </div>
      <div className="bg-white border border-stone-200 rounded-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">畢業學分達成度</p>
          <p className="text-sm text-stone-500">{progress}%</p>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-700 rounded-full" style={{ width: progress + "%" }} />
        </div>
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

function SchedulePage({ data, studentId }) {
  const myCourses = data.enrollments
    .filter((e) => e.studentId === studentId && e.semester === CURRENT_SEMESTER)
    .map((e) => data.courses.find((c) => c.id === e.courseId))
    .filter(Boolean);

  function findCourse(day, period) {
    return myCourses.find((c) => c.day === day && c.periods.includes(period));
  }

  return (
    <div>
      <PageHeader title="課表查詢" subtitle={`${CURRENT_SEMESTER} 學期`} />
      <div className="overflow-x-auto border border-stone-200 rounded-sm bg-white">
        <table className="min-w-full text-sm text-center border-collapse">
          <thead>
            <tr className="bg-stone-50">
              <th className="border border-stone-200 px-3 py-2 w-16 text-stone-500">節次</th>
              {DAYS.map((d) => (
                <th key={d} className="border border-stone-200 px-3 py-2 text-stone-600">
                  星期{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="border border-stone-200 px-3 py-2 text-stone-400">{p}</td>
                {DAYS.map((d) => {
                  const c = findCourse(d, p);
                  return (
                    <td key={d} className="border border-stone-200 px-2 py-2 align-top min-w-[110px]">
                      {c && (
                        <div className="bg-amber-50 border-l-2 border-amber-700 rounded-sm px-2 py-1 text-xs text-left">
                          <p className="font-medium text-slate-800">{c.name}</p>
                          <p className="text-stone-500">{c.classroom}</p>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseSelectionPage({ data, persist, showToast, student, requestConfirm }) {
  const [query, setQuery] = React.useState("");
  const myEnrollments = data.enrollments.filter((e) => e.studentId === student.id && e.semester === CURRENT_SEMESTER);
  const myCourses = myEnrollments
    .map((e) => ({ id: e.id, enrollment: e, course: data.courses.find((c) => c.id === e.courseId) }))
    .filter((x) => x.course);
  const myCredits = myCourses.reduce((s, x) => s + x.course.credit, 0);

  const available = data.courses.filter((c) => {
    if (c.semester !== CURRENT_SEMESTER) return false;
    if (myEnrollments.some((e) => e.courseId === c.id)) return false;
    if (query && !(c.name.includes(query) || c.dept.includes(query))) return false;
    return true;
  });

  function teacherName(id) {
    return data.teachers.find((t) => t.id === id)?.name || "－";
  }
  function enrolledCount(courseId) {
    return data.enrollments.filter((e) => e.courseId === courseId && e.semester === CURRENT_SEMESTER).length;
  }

  function addCourse(course) {
    const count = enrolledCount(course.id);
    if (count >= course.capacity) {
      showToast("本課程選課人數已額滿", "error");
      return;
    }
    const conflict = myCourses.some((x) => x.course.day === course.day && x.course.periods.some((p) => course.periods.includes(p)));
    if (conflict) {
      showToast("與已選課程時間衝堂，無法加選", "error");
      return;
    }
    const rec = { id: newId("E"), studentId: student.id, courseId: course.id, semester: CURRENT_SEMESTER };
    persist({ ...data, enrollments: [...data.enrollments, rec] });
    showToast(`已加選「${course.name}」`, "success");
  }

  function dropCourse(enrollment, courseName) {
    requestConfirm(`確定要退選「${courseName}」嗎？`, () => {
      persist({ ...data, enrollments: data.enrollments.filter((e) => e.id !== enrollment.id) });
      showToast(`已退選「${courseName}」`, "success");
    });
  }

  return (
    <div>
      <PageHeader title="加退選課" subtitle={`${CURRENT_SEMESTER} 學期．目前已選 ${myCourses.length} 門課，共 ${myCredits} 學分`} />

      <div className="bg-white border border-stone-200 rounded-sm mb-6">
        <div className="px-5 py-3 border-b border-stone-200">
          <p className="text-sm font-medium text-slate-700">已選課程</p>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "課程名稱", render: (r) => r.course.name },
            { key: "teacher", label: "授課教師", render: (r) => teacherName(r.course.teacherId) },
            { key: "credit", label: "學分", render: (r) => r.course.credit },
            { key: "time", label: "上課時間", render: (r) => `星期${r.course.day} 第${periodsLabel(r.course.periods)}節` },
            { key: "classroom", label: "教室", render: (r) => r.course.classroom },
          ]}
          rows={myCourses}
          onDelete={(r) => dropCourse(r.enrollment, r.course.name)}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-sm">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-medium text-slate-700">可加選課程</p>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋課程名稱或系所"
              className="pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
          </div>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "課程名稱" },
            { key: "teacher", label: "授課教師", render: (r) => teacherName(r.teacherId) },
            { key: "credit", label: "學分" },
            { key: "dept", label: "開課系所" },
            { key: "time", label: "上課時間", render: (r) => `星期${r.day} 第${periodsLabel(r.periods)}節` },
            {
              key: "capacity",
              label: "選課人數",
              render: (r) => {
                const count = enrolledCount(r.id);
                const full = count >= r.capacity;
                return <span className={full ? "text-red-600" : "text-stone-600"}>{count} / {r.capacity}{full ? "（額滿）" : ""}</span>;
              },
            },
            {
              key: "action",
              label: "",
              render: (r) => (
                <button
                  onClick={() => addCourse(r)}
                  disabled={enrolledCount(r.id) >= r.capacity}
                  className="text-xs px-3 py-1.5 rounded-sm bg-amber-700 hover:bg-amber-800 disabled:bg-stone-200 disabled:text-stone-400 text-white"
                >
                  加選
                </button>
              ),
            },
          ]}
          rows={available}
        />
      </div>
    </div>
  );
}

function GradesPage({ data, studentId }) {
  const [semester, setSemester] = React.useState(CURRENT_SEMESTER);

  let rows = [];
  if (semester === CURRENT_SEMESTER) {
    rows = data.enrollments
      .filter((e) => e.studentId === studentId && e.semester === semester)
      .map((e) => {
        const course = data.courses.find((c) => c.id === e.courseId);
        const gradeRecord = data.grades.find((g) => g.studentId === studentId && g.courseId === e.courseId && g.semester === semester);
        const teacher = course ? data.teachers.find((t) => t.id === course.teacherId) : null;
        return {
          id: e.id,
          courseName: course ? course.name : "未知課程",
          credit: course ? course.credit : 0,
          teacherName: teacher ? teacher.name : "－",
          score: gradeRecord ? gradeRecord.score : null,
        };
      });
  } else {
    rows = data.grades.filter((g) => g.studentId === studentId && g.semester === semester);
  }

  const semesterGpa = computeGpa(rows.filter((r) => r.score !== null));
  const allGraded = data.grades.filter((g) => g.studentId === studentId && g.score !== null && g.score !== undefined);
  const cumulativeGpa = computeGpa(allGraded) ?? "—";
  const earnedCredits = allGraded.filter((g) => g.score >= 60).reduce((s, g) => s + g.credit, 0);

  return (
    <div>
      <PageHeader
        title="成績查詢"
        subtitle="依學期查詢修課成績與學期平均"
        action={
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s} 學期
              </option>
            ))}
          </select>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="本學期平均 GPA" value={semesterGpa ?? "—"} />
        <StatCard label="累計 GPA" value={cumulativeGpa} />
        <StatCard label="累計已修得學分" value={earnedCredits} />
      </div>
      <DataTable
        columns={[
          { key: "courseName", label: "課程名稱" },
          { key: "credit", label: "學分" },
          { key: "teacherName", label: "授課教師" },
          {
            key: "score",
            label: "分數",
            render: (r) => (r.score === null || r.score === undefined ? <span className="text-stone-400">尚未登錄</span> : r.score),
          },
          {
            key: "grade",
            label: "等第",
            render: (r) => {
              const g = scoreToGrade(r.score);
              return g ? g.grade : "－";
            },
          },
        ]}
        rows={rows}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  歷年成績總表：一次顯示所有學期的修課成績與各學期／累計 GPA          */
/* ------------------------------------------------------------------ */
function TranscriptPage({ data, studentId }) {
  const student = data.students.find((s) => s.id === studentId);

  function semesterRows(semester) {
    if (semester === CURRENT_SEMESTER) {
      return data.enrollments
        .filter((e) => e.studentId === studentId && e.semester === semester)
        .map((e) => {
          const course = data.courses.find((c) => c.id === e.courseId);
          const gradeRecord = data.grades.find((g) => g.studentId === studentId && g.courseId === e.courseId && g.semester === semester);
          const teacher = course ? data.teachers.find((t) => t.id === course.teacherId) : null;
          return {
            id: e.id,
            courseName: course ? course.name : "未知課程",
            credit: course ? course.credit : 0,
            teacherName: teacher ? teacher.name : "－",
            score: gradeRecord ? gradeRecord.score : null,
          };
        });
    }
    return data.grades.filter((g) => g.studentId === studentId && g.semester === semester);
  }

  const semesterData = SEMESTERS.map((sem) => {
    const rows = semesterRows(sem);
    const graded = rows.filter((r) => r.score !== null && r.score !== undefined && r.score !== "");
    const gpa = computeGpa(graded);
    const earnedCredits = graded.filter((r) => r.score >= 60).reduce((s, r) => s + r.credit, 0);
    return { semester: sem, rows, gpa, earnedCredits };
  });

  const cumulativeGraded = data.grades.filter((g) => g.studentId === studentId && g.score !== null && g.score !== undefined);
  const cumulativeGpa = computeGpa(cumulativeGraded) ?? "—";
  const cumulativeCredits = cumulativeGraded.filter((g) => g.score >= 60).reduce((s, g) => s + g.credit, 0);

  return (
    <div>
      <PageHeader title="歷年成績總表" subtitle={student ? `${student.name}．${student.dept}` : ""} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="累計 GPA" value={cumulativeGpa} />
        <StatCard label="累計已修得學分" value={cumulativeCredits} />
      </div>
      <div className="space-y-5">
        {semesterData.map((s) => (
          <div key={s.semester} className="bg-white border border-stone-200 rounded-sm">
            <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium text-slate-700">{s.semester} 學期</p>
              <p className="text-xs text-stone-500">
                學期 GPA：{s.gpa ?? "—"}．修得學分：{s.earnedCredits}
              </p>
            </div>
            <DataTable
              columns={[
                { key: "courseName", label: "課程名稱" },
                { key: "credit", label: "學分" },
                { key: "teacherName", label: "授課教師", render: (r) => r.teacherName || "－" },
                {
                  key: "score",
                  label: "分數",
                  render: (r) => (r.score === null || r.score === undefined ? <span className="text-stone-400">尚未登錄</span> : r.score),
                },
                { key: "grade", label: "等第", render: (r) => scoreToGrade(r.score)?.grade || "－" },
              ]}
              rows={s.rows}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
