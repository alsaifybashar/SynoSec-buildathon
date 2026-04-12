import "./core/env/load-env.js";
import { createApp } from "./app/create-app.js";
import { createApplicationsRepositoryFromEnvironment } from "./modules/applications/create-applications-repository.js";

const port = Number(process.env["BACKEND_PORT"] ?? "3001");
const app = createApp({
  applicationsRepository: createApplicationsRepositoryFromEnvironment()
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
