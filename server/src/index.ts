import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { auth } from "./lib/auth.js";
import { workspaceRouter } from "./routes/workspaceRoute.js";
import { sourceRouter } from "./routes/sourceRoute.js";
import { memoryRouter } from "./routes/memoryRoute.js";
import { artifactRouter } from "./routes/artifactRoute.js";
import { conversationRouter } from "./routes/conversationRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { inngest } from "./inngest/client.js";
import { serve } from "inngest/express";
import { functions } from "./inngest/index.js";

const app = express();
const port = process.env.PORT ?? 8080;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
    // Let the browser client read the conversation id returned by the
    // streaming endpoint when a new conversation is created implicitly.
    exposedHeaders: ["X-Conversation-Id"],
  }),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/workspaces", workspaceRouter);
app.use("/api/workspaces/:workspaceId/sources", sourceRouter);
app.use("/api/workspaces/:workspaceId/artifacts", artifactRouter);
app.use("/api/workspaces/:workspaceId/conversations", conversationRouter);
app.use("/api/memories", memoryRouter);

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
