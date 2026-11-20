export type Bindings = {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  // 第二階段：BUCKET: R2Bucket; AI: Ai; TURNSTILE_SECRET: string;
};

export type AppEnv = { Bindings: Bindings };