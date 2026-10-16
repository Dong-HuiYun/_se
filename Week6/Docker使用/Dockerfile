# 使用官方輕量級 Python 鏡像
FROM python:3.9-slim

# 設定容器內的工作目錄
WORKDIR /app

# 將本地的程式碼複製到容器內
COPY app.py .

# 暴露容器的 8080 連接埠
EXPOSE 8080

# 容器啟動時執行的指令（啟動一個簡易 HTTP 伺服器）
CMD ["python", "app.py"]