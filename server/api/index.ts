// Vercel serverless entry point. @vercel/node wraps the exported Express app
// into a single function; all routes (auth, streaming, Inngest) flow through
// it. See vercel.json for the rewrite that sends every path here.
import app from "../src/index.js";

export default app;
