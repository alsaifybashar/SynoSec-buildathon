import { useEffect, useState } from "react";
import {
  apiRoutes,
  type BriefResponse,
  type DemoResponse,
  type HealthResponse
} from "@synosec/contracts";

type LoadableState<T> =
  | { state: "loading" }
  | { state: "loaded"; data: T }
  | { state: "error"; message: string };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export default function App() {
  const [health, setHealth] = useState<LoadableState<HealthResponse>>({ state: "loading" });
  const [demo, setDemo] = useState<LoadableState<DemoResponse>>({ state: "loading" });
  const [brief, setBrief] = useState<LoadableState<BriefResponse>>({ state: "loading" });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [healthData, demoData] = await Promise.all([
          fetchJson<HealthResponse>(apiRoutes.health),
          fetchJson<DemoResponse>(apiRoutes.demo)
        ]);

        if (!active) {
          return;
        }

        setHealth({ state: "loaded", data: healthData });
        setDemo({ state: "loaded", data: demoData });
        setBrief({ state: "loaded", data: await fetchJson<BriefResponse>(apiRoutes.brief) });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setHealth({ state: "error", message });
        setDemo({ state: "error", message });
        setBrief({ state: "error", message });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function fetchBrief() {
    setBrief({ state: "loading" });

    try {
      const briefData = await fetchJson<BriefResponse>(apiRoutes.brief);
      setBrief({ state: "loaded", data: briefData });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setBrief({ state: "error", message });
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">SynoSec Buildathon</p>
        <h1>Strictly typed security scanning control plane</h1>
        <p className="lede">
          React SPA and Express API share runtime-validated contracts so the first feature work can
          stay fast without letting the frontend and backend drift apart.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>API health</h2>
          {health.state === "loading" && <p>Loading health status...</p>}
          {health.state === "error" && <p>{health.message}</p>}
          {health.state === "loaded" && (
            <>
              <p>Status: {health.data.status}</p>
              <p>Service: {health.data.service}</p>
              <p>Updated: {new Date(health.data.timestamp).toLocaleString()}</p>
            </>
          )}
        </article>

        <article className="card">
          <h2>Depth-first demo findings</h2>
          {demo.state === "loading" && <p>Loading demo findings...</p>}
          {demo.state === "error" && <p>{demo.message}</p>}
          {demo.state === "loaded" && (
            <>
              <p>Targets queued: {demo.data.targetCount}</p>
              <ul className="findings">
                {demo.data.findings.map((finding) => (
                  <li key={finding.id}>
                    <strong>{finding.severity.toUpperCase()}</strong> {finding.target}
                    <span>{finding.summary}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className="card">
          <h2>Manual backend fetch</h2>
          <p>Click to request a fresh operator brief from the Express API.</p>
          <button className="actionButton" onClick={() => void fetchBrief()} type="button">
            Fetch backend brief
          </button>
          {brief.state === "loading" && <p>Fetching brief...</p>}
          {brief.state === "error" && <p>{brief.message}</p>}
          {brief.state === "loaded" && (
            <>
              <p>{brief.data.headline}</p>
              <p>Generated: {new Date(brief.data.generatedAt).toLocaleString()}</p>
              <ul className="findings">
                {brief.data.actions.map((action) => (
                  <li key={action}>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
