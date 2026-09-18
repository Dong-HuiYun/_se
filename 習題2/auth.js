/* ------------------------------------------------------------------ */
/*  登入頁面模組                                                       */
/* ------------------------------------------------------------------ */

function LoginScreen({ data, onLogin }) {
  const [role, setRole] = React.useState("student");
  const [account, setAccount] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const roleTabs = [
    { key: "student", label: "學生" },
    { key: "teacher", label: "教師" },
    { key: "admin", label: "管理者" },
  ];

  const demoAccounts = {
    student: [
      { account: "S001", password: "1234", name: "王小明" },
      { account: "S002", password: "1234", name: "陳雅婷" },
    ],
    teacher: [{ account: "T001", password: "1234", name: "林志明" }],
    admin: [{ account: "A001", password: "1234", name: "系統管理員" }],
  };

  function pools() {
    if (role === "student") return data.students;
    if (role === "teacher") return data.teachers;
    return data.admins;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const found = pools().find((u) => u.account === account && u.password === password);
    if (!found) {
      setError("帳號或密碼錯誤，請重新輸入");
      return;
    }
    setError("");
    onLogin(role, found.id);
  }

  function fillDemo(item) {
    setAccount(item.account);
    setPassword(item.password);
    setError("");
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">

          <div class="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-md flex items-center justify-center">
            <img 
              src="images/nqu_logo.png" 
              alt="國立金門大學校徽" 
              class="w-full h-full object-cover" 
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 font-brand">國立金門大學</h1>
          <p className="text-sm text-stone-500 mt-1">教務資訊系統．115學年度第1學期</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-sm shadow-sm">
          <div className="flex border-b border-stone-200">
            {roleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setRole(t.key);
                  setAccount("");
                  setPassword("");
                  setError("");
                }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  role === t.key ? "text-amber-700 border-b-2 border-amber-700" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}登入
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">帳號 / 學號</label>
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                placeholder="請輸入帳號"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                placeholder="請輸入密碼"
              />
            </div>
            {error && (
              <p className="text-sm text-red-700 flex items-center gap-1.5">
                <AlertCircle size={14} /> {error}
              </p>
            )}
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-sm py-2.5 text-sm font-medium">
              登入系統
            </button>
          </form>

          <div className="px-6 pb-6">
            <p className="text-xs text-stone-400 mb-2">示範帳號（點擊自動帶入）</p>
            <div className="flex flex-wrap gap-2">
              {demoAccounts[role].map((item) => (
                <button
                  key={item.account}
                  onClick={() => fillDemo(item)}
                  className="text-xs px-2.5 py-1.5 rounded-sm bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  {item.name}（{item.account} / {item.password}）
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 text-center mt-6">
          本系統為模擬示範用途，資料儲存於本機瀏覽器（localStorage），可自由測試。
        </p>
      </div>
    </div>
  );
}