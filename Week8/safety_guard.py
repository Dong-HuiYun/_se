import sqlglot
from sqlglot import exp

class SQLSafetyGuard:
    @staticmethod
    def validate_and_format_sql(sql_query: str, max_limit: int = 1000) -> str:
        clean_sql = sql_query.strip().replace("```sql", "").replace("```", "").strip()

        # 1. 關鍵字黑名單檢查（防止 AI 耍小聰明把危險指令包在 SELECT 字串中）
        dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT", "GRANT", "REVOKE"]
        upper_sql = clean_sql.upper()
        for kw in dangerous_keywords:
            if kw in upper_sql:
                raise PermissionError(f"🛑 安全警告：檢測到破壞性指令意圖 [{kw}]，系統已主動攔截並拒絕執行！")

        try:
            parsed = sqlglot.parse_one(clean_sql)
        except Exception as e:
            raise ValueError(f"SQL 語法解析失敗: {str(e)}")

        # 2. 嚴格檢查語法樹頂層必須是純查詢 (SELECT)
        if not isinstance(parsed, exp.Select):
            raise PermissionError("🛑 安全警告：僅允許執行唯讀查詢 (SELECT 語句)！")

        # 3. 強制追加 LIMIT 限制
        limit_exp = parsed.find(exp.Limit)
        if not limit_exp:
            parsed = parsed.limit(max_limit)
        else:
            current_limit = int(limit_exp.expression.this)
            if current_limit > max_limit:
                parsed.args["limit"] = exp.Limit(this=exp.Literal.number(max_limit))

        return parsed.sql()