/**
 * Attack-path-first demo target.
 *
 * WARNING: This app contains deliberate security vulnerabilities for demo
 * purposes. NEVER deploy it to a production environment or expose it to the
 * internet.
 *
 * Intended behavior:
 * - No standalone endpoint should be critically exploitable on its own.
 * - Two equal-strength attack paths should reach the same secret material.
 * - A few low-signal distractors should exist without outranking the real paths.
 *
 * Path A:
 * 1. Public release board leaks buildId and support case reference.
 * 2. Case note IDOR leaks a release approval token.
 * 3. The approval token plus buildId unlock release secrets.
 *
 * Path B:
 * 1. Public diagnostics export leaks buildId, approver email, and nonce seed.
 * 2. Weak magic-link issuance accepts the predictable nonce and returns a manager session.
 * 3. The manager session plus buildId unlock release secrets.
 */

const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 8890);

const release = {
  buildId: "rc-2026-04",
  caseRef: "case-7312",
  workspace: "acme-retail",
  approvalToken: "approve_rc_2026_demo",
  approverEmail: "release-manager@acme-retail.demo",
  nonce: "ops-bot-4471",
  sessionToken: "mgr_session_rc_2026_demo"
};

const releaseSecrets = {
  signingKey: "prod-signing-key-demo-2026",
  artifactBucket: "s3://acme-retail-release-artifacts/prod",
  deployToken: "deploy-token-rc-2026"
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((_req, res, next) => {
  res.setHeader("X-Powered-By", "ReleaseHub/0.9.7-beta");
  res.setHeader("Server", "nginx/1.18.0");
  next();
});

app.get("/", (_req, res) => {
  res.send(`
    <html>
    <head><title>ReleaseHub Preview Console</title></head>
    <body>
      <h1>ReleaseHub Preview Console</h1>
      <p>Staging workspace for release coordination and preview approvals.</p>
      <ul>
        <li><a href="/release-board">Release board</a></li>
        <li><a href="/diagnostics/export">Diagnostics export</a></li>
        <li><a href="/search?q=release">Search</a></li>
        <li><a href="/health">Health</a></li>
      </ul>
    </body>
    </html>
  `);
});

app.get("/release-board", (_req, res) => {
  res.send(`
    <html>
    <head><title>Release Board</title></head>
    <body>
      <h1>Pending Release Candidates</h1>
      <table border="1">
        <tr><th>Build</th><th>Workspace</th><th>Support Case</th><th>Status</th></tr>
        <tr>
          <td>${release.buildId}</td>
          <td>${release.workspace}</td>
          <td>${release.caseRef}</td>
          <td>Awaiting final approval</td>
        </tr>
      </table>
      <p class="hint">Approval notes are tracked in support case records before release secrets are issued.</p>
    </body>
    </html>
  `);
});

app.get("/api/support/cases/:caseRef", (req, res) => {
  const { caseRef } = req.params;
  const workspace = String(req.query.workspace || "").trim();
  if (caseRef !== release.caseRef || workspace !== release.workspace) {
    res.status(404).json({
      error: "Case not found",
      hint: "Case detail records are keyed by the public workspace slug and case reference."
    });
    return;
  }

  res.json({
    caseRef,
    workspace,
    owner: "release-ops",
    severity: "medium",
    notes: [
      "Approver requested one-time release authorization for tonight's promotion cutover.",
      `Approval token for ${release.buildId}: ${release.approvalToken}`
    ]
  });
});

app.get("/diagnostics/export", (_req, res) => {
  res.type("text/plain").send([
    "# Release diagnostics export",
    `build=${release.buildId}`,
    `approver_email=${release.approverEmail}`,
    `nonce_seed=${release.nonce}`,
    "job=promotion-window-validation",
    "warning=remember to rotate diagnostic exports after the launch"
  ].join("\n"));
});

app.post("/api/auth/magic-link", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const nonce = String(req.body.nonce || "").trim();
  if (email !== release.approverEmail || nonce !== release.nonce) {
    res.status(401).json({
      success: false,
      error: "Unable to issue magic link",
      hint: "Release approver links require a current approver email and the pending job nonce."
    });
    return;
  }

  res.json({
    success: true,
    role: "release-manager",
    sessionToken: release.sessionToken,
    expiresAt: "2026-04-30T00:00:00.000Z"
  });
});

app.get("/api/release/secrets", (req, res) => {
  const buildId = String(req.query.build || "").trim();
  const approval = String(req.query.approval || "").trim();
  const session = String(req.query.session || "").trim();
  const buildMatches = buildId === release.buildId;
  const approved = approval === release.approvalToken;
  const sessionValid = session === release.sessionToken;

  if (!buildMatches || (!approved && !sessionValid)) {
    res.status(403).json({
      error: "Release secret access denied",
      hint: "Provide the current build id plus either a release approval token or a release-manager session."
    });
    return;
  }

  res.json({
    build: release.buildId,
    scope: "production-release",
    secrets: releaseSecrets
  });
});

app.get("/search", (req, res) => {
  const q = String(req.query.q || "");
  res.send(`
    <html>
    <body>
      <h1>Search</h1>
      <p>Showing preview results for: ${q}</p>
    </body>
    </html>
  `);
});

app.get("/health", (_req, res) => {
  res.json({
    status: "degraded",
    releaseWorker: "delayed",
    internalCluster: "release-cluster-2",
    lastPromote: "2026-04-25T23:14:00.000Z"
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
});

app.listen(PORT, () => {
  console.log(`[AttackPathTarget] Running on port ${PORT}`);
  console.log("[AttackPathTarget] WARNING: This app is intentionally insecure. Demo use only.");
});
