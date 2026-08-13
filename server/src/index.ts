import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { auth } from "./lib/auth.js";
import { workspaceRouter } from "./routes/workspaceRoute.js";
import { sourceRouter } from "./routes/sourceRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const port = process.env.PORT ?? 8080;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

app.use("/api/workspaces", workspaceRouter);
app.use("/api/workspaces/:workspaceId/sources", sourceRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Hello" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on <http://localhost>:${port}`);
});
