import os, re, sys
from collections import Counter
import psycopg2
from flask import Flask, jsonify

app = Flask(__name__)

def query(sql):
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()

@app.get("/api/python/health")
def health():
    try:
        query("SELECT 1")
        return jsonify(service="python", runtime=sys.version.split()[0], db="ok")
    except Exception as e:
        return jsonify(service="python", db="error", error=str(e)), 500

@app.get("/api/python/stats")
def stats():
    texts = [r[0] for r in query("SELECT text FROM notes")]
    words = [w for t in texts for w in re.findall(r"\w+", t.lower())]
    return jsonify(
        notes=len(texts),
        words=len(words),
        avg_length=round(sum(map(len, texts)) / len(texts), 1) if texts else 0,
        top_words=Counter(words).most_common(5),
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
