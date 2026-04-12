import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

const port = Number(process.env["BACKEND_PORT"] ?? "3001");
const app = createApp();

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
