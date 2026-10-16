import http.server
import socketserver

PORT = 8080

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Docker 測試成功</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
                h1 { color: #007bf1; }
                .card { background: white; padding: 20px; border-radius: 8px; inline-size: 300px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🎉 恭喜！</h1>
                <p>你的 Docker 容器已經成功建立並順利執行！</p>
            </div>
        </body>
        </html>
        """
        self.wfile.write(html_content.encode("utf-8"))

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), SimpleHandler) as httpd:
        print(f"伺服器已啟動：http://localhost:{PORT}")
        httpd.serve_forever()