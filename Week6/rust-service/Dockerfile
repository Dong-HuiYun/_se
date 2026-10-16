# 多階段建置：編譯階段很大，最終映像只留下執行檔
FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/rust-service /usr/local/bin/rust-service
EXPOSE 8080
CMD ["rust-service"]
