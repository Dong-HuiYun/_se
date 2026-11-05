import json
from openai import OpenAI
from safety_guard import SQLSafetyGuard

class AIAgent:
    def __init__(self, db_manager, model: str, api_key: str = None, base_url: str = None):
        """
        支援切換不同的 LLM 來源：
        - 若為 Ollama：傳入 base_url="http://localhost:11434/v1"
        - 若為 OpenAI：base_url 為 None（預設連官方 API）
        """
        client_kwargs = {}
        if base_url:
            client_kwargs["base_url"] = base_url
            client_kwargs["api_key"] = api_key or "ollama"  # Ollama 填任意值即可
        else:
            client_kwargs["api_key"] = api_key

        self.client = OpenAI(**client_kwargs)
        self.db_manager = db_manager
        self.model = model
        self.schema = self.db_manager.get_database_schema()

        # 企業語義層
        self.business_metrics = """
        【常用業務指標定義】：
        - 客單價 (AOV) = SUM(total_amount) / COUNT(DISTINCT order_id)
        - 活躍客戶 = 最近 30 天內有過付款成功的訂單的客戶
        - 舊客戶/回頭客 = 歷史購買次數 >= 2 次的客戶
        - 有效訂單 = status = 'completed' 或 'delivered'
        """

    def generate_sql_with_retry(self, user_query: str, max_retries: int = 2) -> tuple:
        error_context = ""
        current_sql = ""

        for attempt in range(max_retries + 1):
            prompt = f"""
你是一名頂尖的企業級資深資料工程師。請根據以下資料庫 Schema 與業務邏輯，將使用者的自然語言問題轉換為合法的 SQL。

### 資料庫 Schema:
{self.schema}

### 企業指標與業務規則:
{self.business_metrics}

{error_context}

### 使用者問題:
{user_query}

### 要求:
1. 僅輸出合法的 SQL 語句，禁止輸出任何解釋文字或 Markdown。
2. 盡量使用標準 SQL 聚合函數處理指標。
3. 表名與欄位名嚴格符合 Schema。
"""
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            raw_sql = response.choices[0].message.content.strip()

            try:
                safe_sql = SQLSafetyGuard.validate_and_format_sql(raw_sql)
                df = self.db_manager.execute_query(safe_sql)
                return safe_sql, df
            except Exception as e:
                error_context = f"\n前一次生成的 SQL: {raw_sql}\n資料庫報錯信息: {str(e)}\n請修正此 SQL 錯誤。"
                current_sql = raw_sql
                if attempt == max_retries:
                    raise RuntimeError(f"SQL 執行失敗（重試多次仍未成功）: {str(e)}\n最後產生的 SQL: {current_sql}")

    def generate_business_insight(self, user_query: str, df) -> str:
        if df.empty:
            return "查無符合條件的數據。"

        sample_data = df.head(10).to_json(orient='records')
        prompt = f"""
使用者提問：{user_query}
查詢結果數據摘要（前 10 筆）：
{sample_data}
數據總筆數：{len(df)}

請用非技術主管看得懂的專業商業中文，針對這批數據給出 2~3 點關鍵洞察與建議。
"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return response.choices[0].message.content