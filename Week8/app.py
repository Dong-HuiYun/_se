import streamlit as st
import pandas as pd
import plotly.express as px
from sqlalchemy import create_engine
import os
from datetime import datetime, timedelta
from db_engine import DatabaseManager
from sql_agent import AIAgent

st.set_page_config(page_title="AI 商業數據查詢代理", page_icon="📊", layout="wide")

# --- 初始化示範資料庫 ---
def init_demo_db():
    engine = create_engine("sqlite:///demo_ecommerce.db")
    customers = pd.DataFrame({
        "customer_id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "David", "Eva"],
        "region": ["台北", "台中", "高雄", "台北", "新竹"]
    })
    orders = pd.DataFrame({
        "order_id": [101, 102, 103, 104, 105, 106, 107, 108],
        "customer_id": [1, 1, 1, 2, 2, 3, 4, 1],
        "total_amount": [1200, 3400, 1500, 2200, 800, 5600, 3100, 2900],
        "status": ["completed", "completed", "completed", "completed", "cancelled", "completed", "completed", "completed"],
        "order_date": ["2026-03-01", "2026-03-12", "2026-03-25", "2026-03-05", "2026-03-18", "2026-03-20", "2026-03-22", "2026-03-28"]
    })
    customers.to_sql("customers", engine, if_exists="replace", index=False)
    orders.to_sql("orders", engine, if_exists="replace", index=False)

if not os.path.exists("demo_ecommerce.db"):
    init_demo_db()

# --- 側邊欄設定 ---
with st.sidebar:
    st.title("⚙️ 系統設定")

    # 1. 切換模型來源
    ai_source = st.radio(
        "🧠 選擇 AI 引擎來源：",
        ["本地 Ollama (免費 / 私密安全)", "雲端 OpenAI API"]
    )

    if ai_source == "本地 Ollama (免費 / 私密安全)":
        base_url = st.text_input("Ollama 接口網址", value="http://localhost:11434/v1")
        model_name = st.text_input("本地模型名稱", value="qwen2.5-coder:7b", help="請確保終端機已先執行過 ollama run 下載此模型")
        api_key = "ollama"
    else:
        api_key = st.text_input("OpenAI API Key", type="password", value=os.getenv("OPENAI_API_KEY", ""))
        model_name = st.selectbox("OpenAI 模型", ["gpt-4o", "gpt-4o-mini"], index=0)
        base_url = None  # None 代表使用 OpenAI 官方端點

    st.divider()

    # 2. 資料庫連線設定
    st.subheader("💾 資料庫設定")
    db_conn_str = st.text_input("Database URI", value="sqlite:///demo_ecommerce.db")
    
    with st.expander("👀 預覽內建資料庫內容"):
        db_mgr = DatabaseManager(db_conn_str)
        st.caption("📋 customers (客戶表)")
        st.dataframe(db_mgr.execute_query("SELECT * FROM customers"), use_container_width=True)
        st.caption("📋 orders (訂單表)")
        st.dataframe(db_mgr.execute_query("SELECT * FROM orders"), use_container_width=True)

# --- 主畫面 ---
st.title("📈 Talk-to-Database AI 商業查詢助手")
st.caption("專為非技術高管打造：免寫 SQL、自動出圖、即時洞察")

query = st.chat_input("請輸入你想了解的商業數據（例如：各個地區的總銷售金額排序）")

if query:
    if ai_source == "雲端 OpenAI API" and not api_key:
        st.error("請在左側輸入 OpenAI API Key！")
        st.stop()

    with st.spinner(f"🤖 正在呼叫 [{model_name}] 分析資料庫架構並構建查詢..."):
        try:
            db_mgr = DatabaseManager(db_conn_str)
            # 動態傳入使用者選好的模型與端點
            agent = AIAgent(
                db_manager=db_mgr,
                model=model_name,
                api_key=api_key,
                base_url=base_url
            )

            # 1. 執行查詢
            sql, df = agent.generate_sql_with_retry(query)

            # 2. 顯示結果分頁
            col1, col2 = st.columns([1, 1])

            with col1:
                st.subheader("💡 商業洞察與摘要")
                insight = agent.generate_business_insight(query, df)
                st.write(insight)

                with st.expander("🔍 檢視產生的 SQL 語句 (安全已審查)"):
                    st.code(sql, language="sql")

            with col2:
                st.subheader("📊 統計圖表")
                if not df.empty:
                    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                    categorical_cols = df.select_dtypes(include=['object', 'string']).columns.tolist()

                    if len(numeric_cols) >= 1 and len(categorical_cols) >= 1:
                        fig = px.bar(df, x=categorical_cols[0], y=numeric_cols[0], 
                                     title=f"{categorical_cols[0]} vs {numeric_cols[0]}")
                        st.plotly_chart(fig, use_container_width=True)
                    elif len(numeric_cols) >= 2:
                        fig = px.scatter(df, x=numeric_cols[0], y=numeric_cols[1])
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("當前查詢結構較適合以表格閱讀。")
                else:
                    st.warning("查詢結果無數據。")

            st.subheader("📋 原始查詢結果表格")
            st.dataframe(df, use_container_width=True)

        except Exception as e:
            st.error(f"查詢過程發生錯誤: {str(e)}")