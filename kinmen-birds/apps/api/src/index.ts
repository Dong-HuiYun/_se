import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./env";
import { birdsRoute } from "./routes/birds";
import { sightingsRoute } from "./routes/sightings";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) =>
      origin === c.env.ALLOWED_ORIGIN || origin?.startsWith("http://localhost:") ? origin : null,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/birds", birdsRoute);
app.route("/api/sightings", sightingsRoute);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;