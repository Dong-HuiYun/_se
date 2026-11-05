from sqlalchemy import create_engine, inspect, text
import pandas as pd

class DatabaseManager:
    def __init__(self, connection_url: str):
        # 實務上請務必使用企業 DB 的唯讀 (Read-Only) 帳號連線
        self.engine = create_engine(connection_url)
        self.inspector = inspect(self.engine)

    def get_database_schema(self) -> str:
        """獲取所有表格欄位、型態與註解，提供給 LLM 作為 Prompt Context"""
        schema_info = []
        table_names = self.inspector.get_table_names()

        for table in table_names:
            columns = self.inspector.get_columns(table)
            col_desc = [f"  - {col['name']} ({str(col['type'])})" for col in columns]
            schema_info.append(f"Table: {table}\n" + "\n".join(col_desc))

        return "\n\n".join(schema_info)

    def execute_query(self, sql: str) -> pd.DataFrame:
        """安全執行 SQL 並返回 DataFrame"""
        with self.engine.connect() as conn:
            result = conn.execute(text(sql))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df