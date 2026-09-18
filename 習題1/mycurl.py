#!/usr/bin/env python3
"""
mycurl - 使用 Python 標準函式庫實作的簡易 curl 複製品。

支援：
- 常見 HTTP method（GET/POST/PUT/DELETE/PATCH/HEAD...）
- 自訂標頭 (-H)、資料 (-d / --data-raw / --json)、multipart 表單 (-F)
- 輸出到檔案 (-o / -O)、包含回應標頭 (-i)、只看標頭 (-I)
- 跟隨重新導向 (-L)、詳細模式 (-v)、安靜模式 (-s)
- 略過 TLS 驗證 (-k)、Basic Auth (-u)、自訂 User-Agent (-A)
- Cookie (-b)、Referer (-e)、代理 (-x)
- 逾時控制 (--connect-timeout / -m)、gzip/deflate 解壓縮 (--compressed)
- 格式化輸出 (-w，類似 curl 的 --write-out)
"""

import argparse
import base64
import gzip
import http.client
import io
import mimetypes
import os
import socket
import ssl
import sys
import time
import urllib.parse
import uuid
import zlib

VERSION = "0.1.0"


# ---------------------------------------------------------------------------
# 參數解析
# ---------------------------------------------------------------------------

def build_arg_parser():
    parser = argparse.ArgumentParser(
        prog="mycurl",
        description="一個類似 curl 的簡易 HTTP 命令列工具",
    )
    parser.add_argument("urls", nargs="*", help="要請求的網址（可指定多個）")
    parser.add_argument("-X", "--request", default=None,
                         help="指定 HTTP 方法，如 GET/POST/PUT/DELETE")
    parser.add_argument("-H", "--header", action="append", default=[],
                         help='自訂標頭，如 "Key: Value"，可重複使用')
    parser.add_argument("-d", "--data", action="append", default=[],
                         help="以 application/x-www-form-urlencoded 傳送資料，可重複使用")
    parser.add_argument("--data-raw", action="append", default=[],
                         help="傳送原始資料（不額外處理），可重複使用")
    parser.add_argument("--json", default=None,
                         help="傳送 JSON 字串，自動設定 Content-Type: application/json")
    parser.add_argument("-F", "--form", action="append", default=[],
                         help='multipart 表單欄位，如 "field=value" 或 "field=@file.png"')
    parser.add_argument("-o", "--output", default=None,
                         help="將回應內容寫入指定檔案")
    parser.add_argument("-O", "--remote-name", action="store_true",
                         help="以網址中的檔名儲存回應內容")
    parser.add_argument("-i", "--include", action="store_true",
                         help="輸出時包含回應標頭")
    parser.add_argument("-I", "--head", action="store_true",
                         help="只送出 HEAD 請求，只看標頭")
    parser.add_argument("-L", "--location", action="store_true",
                         help="自動跟隨重新導向 (3xx)")
    parser.add_argument("-v", "--verbose", action="store_true",
                         help="顯示詳細的請求/回應過程（類似 curl -v）")
    parser.add_argument("-s", "--silent", action="store_true",
                         help="安靜模式，不顯示額外訊息")
    parser.add_argument("-k", "--insecure", action="store_true",
                         help="略過 TLS 憑證驗證")
    parser.add_argument("-u", "--user", default=None,
                         help='HTTP Basic Auth，格式為 "user:pass"')
    parser.add_argument("-A", "--user-agent", default=f"mycurl/{VERSION}",
                         help="自訂 User-Agent")
    parser.add_argument("-b", "--cookie", default=None,
                         help='傳送 Cookie，如 "name=value"')
    parser.add_argument("-e", "--referer", default=None,
                         help="設定 Referer 標頭")
    parser.add_argument("-x", "--proxy", default=None,
                         help="使用的代理伺服器，如 http://127.0.0.1:8080")
    parser.add_argument("--connect-timeout", type=float, default=10.0,
                         help="連線逾時秒數（預設 10）")
    parser.add_argument("-m", "--max-time", type=float, default=None,
                         help="整體請求的最大秒數（逾時則中止）")
    parser.add_argument("--compressed", action="store_true",
                         help="要求並自動解壓縮 gzip/deflate 回應")
    parser.add_argument("-w", "--write-out", default=None,
                         help=r"請求完成後依格式輸出資訊，如 '%%{http_code}\n'")
    parser.add_argument("--max-redirs", type=int, default=10,
                         help="最大重新導向次數（預設 10）")
    parser.add_argument("-V", "--version", action="store_true",
                         help="顯示版本資訊")
    return parser


# ---------------------------------------------------------------------------
# 請求內容建構
# ---------------------------------------------------------------------------

def parse_headers(header_list):
    headers = {}
    for h in header_list:
        if ":" not in h:
            continue
        k, v = h.split(":", 1)
        headers[k.strip()] = v.strip()
    return headers


def build_multipart(fields):
    boundary = uuid.uuid4().hex
    buf = io.BytesIO()
    for field in fields:
        if "=" not in field:
            continue
        key, value = field.split("=", 1)
        buf.write(f"--{boundary}\r\n".encode())
        if value.startswith("@"):
            filepath = value[1:]
            filename = os.path.basename(filepath)
            mimetype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            buf.write(
                f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode()
            )
            buf.write(f"Content-Type: {mimetype}\r\n\r\n".encode())
            with open(filepath, "rb") as f:
                buf.write(f.read())
            buf.write(b"\r\n")
        else:
            buf.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
            buf.write(value.encode())
            buf.write(b"\r\n")
    buf.write(f"--{boundary}--\r\n".encode())
    return buf.getvalue(), f"multipart/form-data; boundary={boundary}"


def build_body(args):
    """依 --json / -F / -d / --data-raw 建立 request body 及對應的 Content-Type。"""
    if args.json is not None:
        return args.json.encode("utf-8"), "application/json"

    if args.form:
        return build_multipart(args.form)

    parts = list(args.data) + list(args.data_raw)
    if parts:
        return "&".join(parts).encode("utf-8"), "application/x-www-form-urlencoded"

    return None, None


def build_headers(args, body, content_type_from_body):
    headers = {
        "User-Agent": args.user_agent,
        "Accept": "*/*",
    }

    if args.compressed:
        headers["Accept-Encoding"] = "gzip, deflate"

    if args.referer:
        headers["Referer"] = args.referer

    if args.cookie:
        headers["Cookie"] = args.cookie

    if args.user:
        token = base64.b64encode(args.user.encode()).decode()
        headers["Authorization"] = f"Basic {token}"

    if content_type_from_body:
        headers["Content-Type"] = content_type_from_body

    if body is not None:
        headers["Content-Length"] = str(len(body))

    # 使用者自訂標頭優先權最高，可覆蓋以上任何預設值
    headers.update(parse_headers(args.header))
    return headers


def determine_method(args, has_body):
    if args.head:
        return "HEAD"
    if args.request:
        return args.request.upper()
    return "POST" if has_body else "GET"


# ---------------------------------------------------------------------------
# 送出請求
# ---------------------------------------------------------------------------

class Response:
    def __init__(self, status, reason, headers, body, url, elapsed):
        self.status = status
        self.reason = reason
        self.headers = headers  # list[(k, v)]
        self.body = body
        self.url = url
        self.elapsed = elapsed


def make_connection(scheme, host, port, args):
    context = None
    if scheme == "https":
        context = ssl._create_unverified_context() if args.insecure else ssl.create_default_context()

    if args.proxy:
        proxy = urllib.parse.urlparse(args.proxy)
        proxy_host, proxy_port = proxy.hostname, proxy.port or 80
        if scheme == "https":
            conn = http.client.HTTPSConnection(
                proxy_host, proxy_port, timeout=args.connect_timeout, context=context
            )
            conn.set_tunnel(host, port)
        else:
            conn = http.client.HTTPConnection(proxy_host, proxy_port, timeout=args.connect_timeout)
        return conn, True

    if scheme == "https":
        conn = http.client.HTTPSConnection(host, port, timeout=args.connect_timeout, context=context)
    else:
        conn = http.client.HTTPConnection(host, port, timeout=args.connect_timeout)
    return conn, False


def send_once(method, url, headers, body, args):
    parsed = urllib.parse.urlsplit(url)
    scheme = parsed.scheme or "http"
    host = parsed.hostname
    port = parsed.port or (443 if scheme == "https" else 80)
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query

    conn, use_proxy = make_connection(scheme, host, port, args)
    request_target = url if (use_proxy and scheme == "http") else path

    headers_with_host = dict(headers)
    headers_with_host.setdefault("Host", host)

    if args.verbose:
        print(f"> {method} {request_target} HTTP/1.1", file=sys.stderr)
        for k, v in headers_with_host.items():
            print(f"> {k}: {v}", file=sys.stderr)
        print(">", file=sys.stderr)

    start = time.time()
    conn.request(method, request_target, body=body, headers=headers_with_host)
    resp = conn.getresponse()
    raw_body = resp.read()
    elapsed = time.time() - start
    resp_headers = resp.getheaders()

    if args.verbose:
        print(f"< HTTP/1.1 {resp.status} {resp.reason}", file=sys.stderr)
        for k, v in resp_headers:
            print(f"< {k}: {v}", file=sys.stderr)
        print("<", file=sys.stderr)

    conn.close()

    encoding = dict((k.lower(), v) for k, v in resp_headers).get("content-encoding", "")
    if encoding == "gzip":
        try:
            raw_body = gzip.decompress(raw_body)
        except OSError:
            pass
    elif encoding == "deflate":
        try:
            raw_body = zlib.decompress(raw_body)
        except zlib.error:
            pass

    return Response(resp.status, resp.reason, resp_headers, raw_body, url, elapsed)


def request_with_redirects(method, url, headers, body, args):
    redirects = 0
    current_url, current_method, current_body = url, method, body

    while True:
        response = send_once(current_method, current_url, headers, current_body, args)

        if response.status in (301, 302, 303, 307, 308) and args.location:
            location = dict((k.lower(), v) for k, v in response.headers).get("location")
            if not location:
                break
            redirects += 1
            if redirects > args.max_redirs:
                if not args.silent:
                    print(f"mycurl: 已達最大重新導向次數 ({args.max_redirs})", file=sys.stderr)
                break
            current_url = urllib.parse.urljoin(current_url, location)
            if response.status == 303:
                current_method, current_body = "GET", None
            if args.verbose:
                print(f"* 重新導向至: {current_url}", file=sys.stderr)
            continue

        break

    return response


# ---------------------------------------------------------------------------
# 輸出
# ---------------------------------------------------------------------------

def write_response(response, args):
    if args.head:
        for k, v in response.headers:
            sys.stdout.write(f"{k}: {v}\r\n")
        sys.stdout.write("\r\n")
        return

    out_path = None
    if args.output:
        out_path = args.output
    elif args.remote_name:
        parsed = urllib.parse.urlsplit(response.url)
        out_path = os.path.basename(parsed.path) or "index.html"

    if out_path:
        with open(out_path, "wb") as f:
            f.write(response.body)
        if not args.silent:
            print(f"已將回應內容存至 {out_path}", file=sys.stderr)
        return

    if args.include:
        sys.stdout.write(f"HTTP/1.1 {response.status} {response.reason}\r\n")
        for k, v in response.headers:
            sys.stdout.write(f"{k}: {v}\r\n")
        sys.stdout.write("\r\n")

    try:
        sys.stdout.buffer.write(response.body)
    except AttributeError:
        sys.stdout.write(response.body.decode(errors="replace"))


def apply_write_out(fmt, response):
    if not fmt:
        return
    content_type = dict((k.lower(), v) for k, v in response.headers).get("content-type", "")
    replacements = {
        "%{http_code}": str(response.status),
        "%{time_total}": f"{response.elapsed:.3f}",
        "%{size_download}": str(len(response.body)),
        "%{url_effective}": response.url,
        "%{content_type}": content_type,
    }
    out = fmt
    for token, val in replacements.items():
        out = out.replace(token, val)
    out = out.replace("\\n", "\n").replace("\\t", "\t")
    sys.stdout.write(out)


# ---------------------------------------------------------------------------
# 主程式
# ---------------------------------------------------------------------------

def main(argv=None):
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    if args.version:
        print(f"mycurl {VERSION}")
        return 0

    if not args.urls:
        parser.error("請至少指定一個網址")

    body, content_type_from_body = build_body(args)
    method = determine_method(args, body is not None)
    headers = build_headers(args, body, content_type_from_body)

    exit_code = 0
    for raw_url in args.urls:
        url = raw_url if raw_url.startswith(("http://", "https://")) else "http://" + raw_url
        try:
            response = request_with_redirects(method, url, headers, body, args)
        except (http.client.HTTPException, OSError, socket.timeout) as exc:
            if not args.silent:
                print(f"mycurl: 無法連線至 {url}: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        write_response(response, args)
        apply_write_out(args.write_out, response)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
