import json, os, re, sys, threading, time, urllib.request
from collections import Counter
import pika
import psycopg2
from flask import Flask, jsonify

app = Flask(__name__)
QUEUE = "note.created"
NODE_API = os.environ["NODE_API"]
DELAY = float(os.getenv("PROCESS_DELAY", "0"))


def tx(fn):
    """開一個連線與交易，執行 fn(cursor)。"""
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn, conn.cursor() as cur:
            return fn(cur)
    finally:
        conn.close()


def process(note, source):
    """把一則留言寫入 Python 自己的資料庫；note_id 重複就略過（冪等）。"""
    words = re.findall(r"\w+", note["text"].lower())

    def run(cur):
        cur.execute(
            "INSERT INTO processed_notes (note_id, length, word_count, source) "
            "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (note["id"], len(note["text"]), len(words), source),
        )
        if cur.rowcount:
            for w, c in Counter(words).items():
                cur.execute(
                    "INSERT INTO word_freq (word, count) VALUES (%s, %s) "
                    "ON CONFLICT (word) DO UPDATE SET count = word_freq.count + EXCLUDED.count",
                    (w, c),
                )

    tx(run)


def backfill():
    """同步：啟動時呼叫 Node 的 API，補齊既有留言。"""
    while True:
        try:
            with urllib.request.urlopen(NODE_API + "/api/node/notes?limit=1000", timeout=5) as r:
                for n in json.load(r):
                    process(n, "api")
            print("backfill done", flush=True)
            return
        except Exception as e:
            print("backfill retry:", e, flush=True)
            time.sleep(3)


def consume():
    """非同步：持續接收 RabbitMQ 的 note.created 事件。"""
    while True:
        try:
            conn = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
            ch = conn.channel()
            ch.queue_declare(queue=QUEUE, durable=True)
            ch.basic_qos(prefetch_count=1)

            def on_message(c, method, props, body):
                time.sleep(DELAY)
                process(json.loads(body), "event")
                c.basic_ack(method.delivery_tag)   # 處理成功才確認，失敗會重送

            ch.basic_consume(queue=QUEUE, on_message_callback=on_message)
            ch.start_consuming()
        except Exception as e:
            print("consumer retry:", e, flush=True)
            time.sleep(3)


@app.get("/api/python/health")
def health():
    try:
        tx(lambda cur: cur.execute("SELECT 1"))
        return jsonify(service="python", runtime=sys.version.split()[0], db="ok")
    except Exception as e:
        return jsonify(service="python", db="error", error=str(e)), 500


@app.get("/api/python/stats")
def stats():
    def run(cur):
        cur.execute(
            "SELECT count(*), coalesce(sum(word_count), 0), coalesce(avg(length), 0)::float, "
            "count(*) FILTER (WHERE source = 'api'), count(*) FILTER (WHERE source = 'event') "
            "FROM processed_notes"
        )
        n, words, avg, from_api, from_event = cur.fetchone()
        cur.execute("SELECT word, count FROM word_freq ORDER BY count DESC, word LIMIT 5")
        return dict(notes=n, words=int(words), avg_length=round(avg, 1),
                    from_api=from_api, from_events=from_event, top_words=cur.fetchall())

    return jsonify(tx(run))


if __name__ == "__main__":
    threading.Thread(target=backfill, daemon=True).start()
    threading.Thread(target=consume, daemon=True).start()
    app.run(host="0.0.0.0", port=5000)
