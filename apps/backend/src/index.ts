import "./env.js";
import { createApp } from "./app.js";
import { createApplicationStoreFromEnvironment } from "./applications/store.js";

const port = Number(process.env["BACKEND_PORT"] ?? "3001");
const app = createApp({
  applicationStore: createApplicationStoreFromEnvironment()
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
