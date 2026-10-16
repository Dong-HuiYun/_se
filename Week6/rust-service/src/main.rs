use axum::{extract::Query, routing::get, Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::time::Instant;

#[derive(Deserialize)]
struct Params {
    n: Option<usize>,
}

async fn health() -> Json<Value> {
    Json(json!({ "service": "rust", "runtime": "rustc (compiled binary)" }))
}

// 埃拉托斯特尼篩法：計算 n 以內的質數數量（CPU 密集運算，適合用 Rust）
async fn primes(Query(p): Query<Params>) -> Json<Value> {
    let n = p.n.unwrap_or(1_000_000).min(100_000_000);
    let start = Instant::now();
    let mut sieve = vec![true; n + 1];
    sieve[0] = false;
    if n >= 1 {
        sieve[1] = false;
    }
    let mut i = 2;
    while i * i <= n {
        if sieve[i] {
            let mut j = i * i;
            while j <= n {
                sieve[j] = false;
                j += i;
            }
        }
        i += 1;
    }
    let count = sieve.iter().filter(|&&x| x).count();
    Json(json!({ "n": n, "primes": count, "ms": start.elapsed().as_secs_f64() * 1000.0 }))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/rust/health", get(health))
        .route("/api/rust/primes", get(primes));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("rust-service listening on :8080");
    axum::serve(listener, app).await.unwrap();
}
